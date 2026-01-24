'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDashboardData } from '@/lib/hooks/useForecastData';
import { 
  formatINR, 
  formatDateShort, 
  getDayName, 
  getApplicableEvents,
  calculateFinalForecast,
  getConfidenceColor,
  getCategoryColor,
} from '@/lib/forecast-utils';
import { Download, Search, ArrowUpDown, ChevronUp, ChevronDown, RefreshCw, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DailyForecastRow } from '@/lib/types';

type SortField = 'date' | 'outlet' | 'sku' | 'category' | 'forecast' | 'revenue';
type SortDirection = 'asc' | 'desc';

export default function DailyForecastPage() {
  const [dateRange, setDateRange] = useState<number>(14);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [outletFilter, setOutletFilter] = useState<string>('all');
  const [skuFilter, setSkuFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { 
    outlets, 
    categories, 
    skus, 
    events, 
    forecasts, 
    isLoading, 
    error,
    refetch 
  } = useDashboardData(dateRange);

  // Transform forecasts into display rows
  const forecastRows = useMemo((): DailyForecastRow[] => {
    return forecasts.map(f => {
      const outlet = outlets.find(o => o.id === f.outlet_id);
      const sku = skus.find(s => s.id === f.sku_id);
      const category = sku?.category || null;
      
      // Get applicable events
      const applicableEvents = getApplicableEvents(
        events,
        f.forecast_date,
        f.outlet_id,
        sku?.category_id || null,
        f.sku_id
      );

      // Calculate final forecast with events and min quantity
      const { finalForecast, isOverridden, upliftApplied } = calculateFinalForecast(
        f.forecast_value,
        applicableEvents,
        sku?.min_quantity || 0
      );

      const pricePerUnit = sku?.price_per_unit || 0;

      return {
        id: f.id,
        outlet: outlet!,
        sku: sku!,
        category,
        date: f.forecast_date,
        day: getDayName(f.forecast_date),
        rawForecast: f.forecast_value,
        finalForecast,
        lowerBound: f.lower_bound || Math.round(f.forecast_value * 0.85),
        upperBound: f.upper_bound || Math.round(f.forecast_value * 1.15),
        confidenceRating: f.confidence_rating || 'medium',
        isOverridden,
        revenue: finalForecast * pricePerUnit,
        events: applicableEvents,
        eventUpliftApplied: upliftApplied,
      };
    }).filter(row => row.outlet && row.sku); // Filter out any with missing data
  }, [forecasts, outlets, skus, events]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return forecastRows.filter(row => {
      // Category filter
      if (categoryFilter !== 'all' && row.category?.id !== categoryFilter) return false;
      
      // Outlet filter
      if (outletFilter !== 'all' && row.outlet.id !== outletFilter) return false;
      
      // SKU filter
      if (skuFilter !== 'all' && row.sku.id !== skuFilter) return false;
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesOutlet = row.outlet.name.toLowerCase().includes(query);
        const matchesSku = row.sku.name.toLowerCase().includes(query);
        const matchesCategory = row.category?.name.toLowerCase().includes(query);
        const matchesCity = row.outlet.city.toLowerCase().includes(query);
        
        if (!matchesOutlet && !matchesSku && !matchesCategory && !matchesCity) return false;
      }
      
      return true;
    });
  }, [forecastRows, categoryFilter, outletFilter, skuFilter, searchQuery]);

  // Sort rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'outlet':
          comparison = a.outlet.name.localeCompare(b.outlet.name);
          break;
        case 'sku':
          comparison = a.sku.name.localeCompare(b.sku.name);
          break;
        case 'category':
          comparison = (a.category?.name || '').localeCompare(b.category?.name || '');
          break;
        case 'forecast':
          comparison = a.finalForecast - b.finalForecast;
          break;
        case 'revenue':
          comparison = a.revenue - b.revenue;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortField, sortDirection]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort header component
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  // Export to Excel
  const handleExport = () => {
    const exportData = sortedRows.map(row => ({
      'Date': row.date,
      'Day': row.day,
      'Outlet': row.outlet.name,
      'City': row.outlet.city,
      'Format': row.outlet.format,
      'SKU': row.sku.name,
      'Category': row.category?.name || '',
      'Raw Forecast': row.rawForecast,
      'Final Forecast': row.finalForecast,
      'Lower Bound': row.lowerBound,
      'Upper Bound': row.upperBound,
      'Confidence': row.confidenceRating,
      'Revenue (₹)': Math.round(row.revenue),
      'Min Qty Applied': row.isOverridden ? 'Yes' : 'No',
      'Event Uplift': row.eventUpliftApplied ? 'Yes' : 'No',
      'Events': row.events.map(e => e.name).join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Forecast');
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `daily-forecast-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalUnits = sortedRows.reduce((sum, row) => sum + row.finalForecast, 0);
    const totalRevenue = sortedRows.reduce((sum, row) => sum + row.revenue, 0);
    const avgConfidence = sortedRows.length > 0 
      ? sortedRows.filter(r => r.confidenceRating === 'high').length / sortedRows.length * 100
      : 0;
    
    return { totalUnits, totalRevenue, avgConfidence };
  }, [sortedRows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading forecast data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load forecast data</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Forecast Detail</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed breakdown by outlet, SKU, and date
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} size="sm" className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Units</p>
            <p className="text-2xl font-bold">{summaryStats.totalUnits.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatINR(summaryStats.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">High Confidence</p>
            <p className="text-2xl font-bold">{summaryStats.avgConfidence.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search outlets, SKUs, cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date Range */}
            <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="60">60 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Outlet */}
            <Select value={outletFilter} onValueChange={setOutletFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* SKU */}
            <Select value={skuFilter} onValueChange={setSkuFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All SKUs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SKUs</SelectItem>
                {skus.filter(s => !s.is_new_product).map((sku) => (
                  <SelectItem key={sku.id} value={sku.id}>
                    {sku.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active filters */}
          {(categoryFilter !== 'all' || outletFilter !== 'all' || skuFilter !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Active:</span>
              {searchQuery && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery('')}>
                  "{searchQuery}" ×
                </Badge>
              )}
              {categoryFilter !== 'all' && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setCategoryFilter('all')}>
                  {categories.find(c => c.id === categoryFilter)?.name} ×
                </Badge>
              )}
              {outletFilter !== 'all' && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setOutletFilter('all')}>
                  {outlets.find(o => o.id === outletFilter)?.name} ×
                </Badge>
              )}
              {skuFilter !== 'all' && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSkuFilter('all')}>
                  {skus.find(s => s.id === skuFilter)?.name} ×
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setOutletFilter('all');
                  setSkuFilter('all');
                }}
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortHeader field="date">Date</SortHeader>
                  <TableHead>Day</TableHead>
                  <SortHeader field="outlet">Outlet</SortHeader>
                  <SortHeader field="sku">SKU</SortHeader>
                  <SortHeader field="category">Category</SortHeader>
                  <SortHeader field="forecast">Forecast</SortHeader>
                  <TableHead>Range</TableHead>
                  <TableHead>Confidence</TableHead>
                  <SortHeader field="revenue">Revenue</SortHeader>
                  <TableHead>Events</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No forecast data matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRows.slice(0, 100).map((row) => {
                    const confidenceColor = getConfidenceColor(row.confidenceRating);
                    const categoryColor = row.category ? getCategoryColor(row.category.name) : null;
                    
                    return (
                      <TableRow key={row.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {formatDateShort(row.date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.day.substring(0, 3)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{row.outlet.name}</p>
                            <p className="text-xs text-muted-foreground">{row.outlet.city}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{row.sku.name}</span>
                            {row.isOverridden && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                Min
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {categoryColor && (
                            <Badge className={`${categoryColor.bg} ${categoryColor.text} border-0`}>
                              {row.category?.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {row.finalForecast.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.lowerBound.toLocaleString('en-IN')} - {row.upperBound.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${confidenceColor.bg} ${confidenceColor.text} border-0 capitalize`}>
                            {row.confidenceRating}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatINR(row.revenue)}
                        </TableCell>
                        <TableCell>
                          {row.events.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {row.events.map(event => (
                                <Badge 
                                  key={event.id} 
                                  variant="outline" 
                                  className="text-xs"
                                  title={`${event.name}${event.uplift_pct > 0 ? ` (+${event.uplift_pct}%)` : ''}`}
                                >
                                  {event.name.length > 10 ? event.name.substring(0, 10) + '...' : event.name}
                                  {event.uplift_pct > 0 && (
                                    <span className="text-green-600 ml-1">+{event.uplift_pct}%</span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination hint */}
          {sortedRows.length > 100 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Showing first 100 of {sortedRows.length.toLocaleString('en-IN')} rows. 
              Export to Excel to see all data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


