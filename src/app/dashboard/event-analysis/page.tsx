'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDashboardData } from '@/lib/hooks/useForecastData';
import { formatINR, formatPercentage, calculatePercentageChange, getEventTypeColor, formatDateShort } from '@/lib/forecast-utils';
import { RefreshCw, TrendingUp, TrendingDown, BarChart3, AlertCircle } from 'lucide-react';
import type { Event } from '@/lib/types';

type GroupDimension = 'city' | 'category' | 'format' | 'date';

interface AnalysisRow {
  key: string;
  label: string;
  forecastRevenue: number;
  forecastUnits: number;
  lyRevenue: number;
  lyUnits: number;
  ly2Revenue: number;
  ly2Units: number;
  trendVsLY: number;
  trendVsLY2: number;
}

export default function EventAnalysisPage() {
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupDimension>('city');

  const { 
    outlets, 
    categories, 
    skus, 
    events, 
    forecasts, 
    historicalLY, 
    historicalLY2,
    isLoading, 
    refetch 
  } = useDashboardData(90); // Get 90 days of data for analysis

  // Get enabled events with dates in the forecast range
  const relevantEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    return events.filter(e => 
      e.enabled && 
      e.start_date <= futureDateStr && 
      e.end_date >= today
    );
  }, [events]);

  // Filter forecasts by selected event
  const filteredForecasts = useMemo(() => {
    if (selectedEvent === 'all') return forecasts;
    
    const event = events.find(e => e.id === selectedEvent);
    if (!event) return forecasts;

    return forecasts.filter(f => {
      // Check if forecast date falls within event dates
      if (f.forecast_date < event.start_date || f.forecast_date > event.end_date) return false;
      
      // Check scope
      if (event.scope_outlet_id && f.outlet_id !== event.scope_outlet_id) return false;
      if (event.scope_category_id) {
        const sku = skus.find(s => s.id === f.sku_id);
        if (sku?.category_id !== event.scope_category_id) return false;
      }
      if (event.scope_sku_id && f.sku_id !== event.scope_sku_id) return false;
      
      return true;
    });
  }, [forecasts, events, selectedEvent, skus]);

  // Get the selected event for comparison method
  const selectedEventData = useMemo(() => {
    if (selectedEvent === 'all') return null;
    return events.find(e => e.id === selectedEvent) || null;
  }, [events, selectedEvent]);

  // Filter historical data based on event comparison method
  const filteredHistoricalLY = useMemo(() => {
    // If using 'same_event' comparison and we have historical dates, filter by those dates
    if (selectedEventData?.comparison_method === 'same_event' && 
        selectedEventData.historical_ly_start_date && 
        selectedEventData.historical_ly_end_date) {
      return historicalLY.filter(h => {
        // Check if sale date falls within the historical event dates
        if (h.sale_date < selectedEventData.historical_ly_start_date! || 
            h.sale_date > selectedEventData.historical_ly_end_date!) return false;
        
        // Check scope if applicable
        if (selectedEventData.scope_outlet_id && h.outlet_id !== selectedEventData.scope_outlet_id) return false;
        if (selectedEventData.scope_category_id) {
          const sku = skus.find(s => s.id === h.sku_id);
          if (sku?.category_id !== selectedEventData.scope_category_id) return false;
        }
        if (selectedEventData.scope_sku_id && h.sku_id !== selectedEventData.scope_sku_id) return false;
        
        return true;
      });
    }
    
    // Default: use calendar date comparison (existing logic)
    return historicalLY;
  }, [historicalLY, selectedEventData, skus]);

  const filteredHistoricalLY2 = useMemo(() => {
    // If using 'same_event' comparison and we have historical dates, filter by those dates
    if (selectedEventData?.comparison_method === 'same_event' && 
        selectedEventData.historical_ly2_start_date && 
        selectedEventData.historical_ly2_end_date) {
      return historicalLY2.filter(h => {
        // Check if sale date falls within the historical event dates
        if (h.sale_date < selectedEventData.historical_ly2_start_date! || 
            h.sale_date > selectedEventData.historical_ly2_end_date!) return false;
        
        // Check scope if applicable
        if (selectedEventData.scope_outlet_id && h.outlet_id !== selectedEventData.scope_outlet_id) return false;
        if (selectedEventData.scope_category_id) {
          const sku = skus.find(s => s.id === h.sku_id);
          if (sku?.category_id !== selectedEventData.scope_category_id) return false;
        }
        if (selectedEventData.scope_sku_id && h.sku_id !== selectedEventData.scope_sku_id) return false;
        
        return true;
      });
    }
    
    // Default: use calendar date comparison (existing logic)
    return historicalLY2;
  }, [historicalLY2, selectedEventData, skus]);

  // Build analysis rows based on grouping
  const analysisRows = useMemo((): AnalysisRow[] => {
    const groups = new Map<string, { 
      forecastRevenue: number; 
      forecastUnits: number;
      lyRevenue: number; 
      lyUnits: number;
      ly2Revenue: number;
      ly2Units: number;
    }>();

    // Helper to get group key
    const getGroupKey = (outletId: string | null, categoryId: string | null, date: string): string => {
      const outlet = outletId ? outlets.find(o => o.id === outletId) : null;
      const category = categoryId ? categories.find(c => c.id === categoryId) : null;
      
      switch (groupBy) {
        case 'city':
          return outlet?.city || 'Unknown';
        case 'category':
          return category?.name || 'Uncategorized';
        case 'format':
          return outlet?.format || 'Unknown';
        case 'date':
          return date;
        default:
          return 'All';
      }
    };

    // Initialize all possible groups first (for city, category, format)
    if (groupBy === 'city') {
      const cities = new Set(outlets.map(o => o.city));
      cities.forEach(city => {
        groups.set(city, { forecastRevenue: 0, forecastUnits: 0, lyRevenue: 0, lyUnits: 0, ly2Revenue: 0, ly2Units: 0 });
      });
    } else if (groupBy === 'category') {
      categories.forEach(cat => {
        groups.set(cat.name, { forecastRevenue: 0, forecastUnits: 0, lyRevenue: 0, lyUnits: 0, ly2Revenue: 0, ly2Units: 0 });
      });
      groups.set('Uncategorized', { forecastRevenue: 0, forecastUnits: 0, lyRevenue: 0, lyUnits: 0, ly2Revenue: 0, ly2Units: 0 });
    } else if (groupBy === 'format') {
      const formats = new Set(outlets.map(o => o.format));
      formats.forEach(format => {
        groups.set(format, { forecastRevenue: 0, forecastUnits: 0, lyRevenue: 0, lyUnits: 0, ly2Revenue: 0, ly2Units: 0 });
      });
    }

    // Aggregate forecasts
    filteredForecasts.forEach(f => {
      const sku = skus.find(s => s.id === f.sku_id);
      const price = sku?.price_per_unit || 0;
      const groupKey = getGroupKey(f.outlet_id, sku?.category_id || null, f.forecast_date);

      const existing = groups.get(groupKey) || { forecastRevenue: 0, forecastUnits: 0, lyRevenue: 0, lyUnits: 0, ly2Revenue: 0, ly2Units: 0 };
      groups.set(groupKey, {
        ...existing,
        forecastRevenue: existing.forecastRevenue + (f.forecast_value * price),
        forecastUnits: existing.forecastUnits + f.forecast_value,
      });
    });

    // Aggregate historical LY - use filtered data based on comparison method
    filteredHistoricalLY.forEach(h => {
      const sku = skus.find(s => s.id === h.sku_id);
      
      // For 'same_event' comparison, we don't map dates - we just aggregate all historical data
      // For calendar comparison, map historical date to current year for date grouping
      let mappedDate = h.sale_date;
      if (groupBy === 'date' && selectedEventData?.comparison_method !== 'same_event') {
        const date = new Date(h.sale_date);
        date.setFullYear(date.getFullYear() + 1);
        mappedDate = date.toISOString().split('T')[0];
      } else if (groupBy === 'date' && selectedEventData?.comparison_method === 'same_event') {
        // For same_event comparison with date grouping, use a generic "LY" label
        mappedDate = 'LY';
      }
      
      const groupKey = groupBy === 'date' && selectedEventData?.comparison_method === 'same_event' 
        ? getGroupKey(h.outlet_id, sku?.category_id || null, 'all')
        : getGroupKey(h.outlet_id, sku?.category_id || null, mappedDate);

      const existing = groups.get(groupKey);
      if (existing) {
        groups.set(groupKey, {
          ...existing,
          lyRevenue: existing.lyRevenue + (h.revenue || 0),
          lyUnits: existing.lyUnits + h.actual_sales,
        });
      } else if (groupBy === 'date' && selectedEventData?.comparison_method !== 'same_event') {
        // For date grouping with calendar comparison, create entry if it doesn't exist
        groups.set(groupKey, {
          forecastRevenue: 0,
          forecastUnits: 0,
          lyRevenue: h.revenue || 0,
          lyUnits: h.actual_sales,
          ly2Revenue: 0,
          ly2Units: 0,
        });
      }
    });

    // Aggregate historical LY-1 - use filtered data based on comparison method
    filteredHistoricalLY2.forEach(h => {
      const sku = skus.find(s => s.id === h.sku_id);
      
      let mappedDate = h.sale_date;
      if (groupBy === 'date' && selectedEventData?.comparison_method !== 'same_event') {
        const date = new Date(h.sale_date);
        date.setFullYear(date.getFullYear() + 2);
        mappedDate = date.toISOString().split('T')[0];
      } else if (groupBy === 'date' && selectedEventData?.comparison_method === 'same_event') {
        mappedDate = 'LY-1';
      }
      
      const groupKey = groupBy === 'date' && selectedEventData?.comparison_method === 'same_event'
        ? getGroupKey(h.outlet_id, sku?.category_id || null, 'all')
        : getGroupKey(h.outlet_id, sku?.category_id || null, mappedDate);

      const existing = groups.get(groupKey);
      if (existing) {
        groups.set(groupKey, {
          ...existing,
          ly2Revenue: existing.ly2Revenue + (h.revenue || 0),
          ly2Units: existing.ly2Units + h.actual_sales,
        });
      }
    });

    // Convert to rows and filter out empty rows
    return Array.from(groups.entries())
      .filter(([_, data]) => data.forecastRevenue > 0 || data.lyRevenue > 0 || data.ly2Revenue > 0)
      .map(([key, data]) => ({
        key,
        label: groupBy === 'date' ? formatDateShort(key) : key,
        forecastRevenue: data.forecastRevenue,
        forecastUnits: data.forecastUnits,
        lyRevenue: data.lyRevenue,
        lyUnits: data.lyUnits,
        ly2Revenue: data.ly2Revenue,
        ly2Units: data.ly2Units,
        trendVsLY: calculatePercentageChange(data.forecastRevenue, data.lyRevenue),
        trendVsLY2: calculatePercentageChange(data.forecastRevenue, data.ly2Revenue),
      }))
      .sort((a, b) => {
        if (groupBy === 'date') return a.key.localeCompare(b.key);
        return b.forecastRevenue - a.forecastRevenue;
      });
  }, [filteredForecasts, filteredHistoricalLY, filteredHistoricalLY2, groupBy, outlets, categories, skus, selectedEventData]);

  // Summary totals
  const totals = useMemo(() => {
    const forecast = analysisRows.reduce((sum, r) => sum + r.forecastRevenue, 0);
    const forecastUnits = analysisRows.reduce((sum, r) => sum + r.forecastUnits, 0);
    const ly = analysisRows.reduce((sum, r) => sum + r.lyRevenue, 0);
    const lyUnits = analysisRows.reduce((sum, r) => sum + r.lyUnits, 0);
    const ly2 = analysisRows.reduce((sum, r) => sum + r.ly2Revenue, 0);
    const ly2Units = analysisRows.reduce((sum, r) => sum + r.ly2Units, 0);
    
    return {
      forecast,
      forecastUnits,
      ly,
      lyUnits,
      ly2,
      ly2Units,
      trendVsLY: calculatePercentageChange(forecast, ly),
      trendVsLY2: calculatePercentageChange(forecast, ly2),
    };
  }, [analysisRows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading analysis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare forecasted revenue against historical actuals
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Note about event date comparison */}
      {selectedEvent !== 'all' && (() => {
        const event = events.find(e => e.id === selectedEvent);
        if (!event) return null;
        
        if (event.comparison_method === 'same_event') {
          return (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Using Event-to-Event Comparison</p>
                  <p className="mt-1">
                    Comparing <strong>{event.name}</strong> ({event.start_date} → {event.end_date}) against:
                  </p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    {event.historical_ly_start_date && event.historical_ly_end_date && (
                      <li>LY: {event.historical_ly_start_date} → {event.historical_ly_end_date}</li>
                    )}
                    {event.historical_ly2_start_date && event.historical_ly2_end_date && (
                      <li>LY-1: {event.historical_ly2_start_date} → {event.historical_ly2_end_date}</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Using Calendar Date Comparison</p>
                <p className="mt-1">
                  Comparing against the same calendar dates from last year. For events like Diwali where dates shift, 
                  you can edit the event in Event Manager and set "Comparison Method" to "Same Event Last Year" with specific historical dates.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Current Forecast</p>
            <p className="text-2xl font-bold">{formatINR(totals.forecast)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {totals.forecastUnits.toLocaleString('en-IN')} units
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">vs Actuals LY</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${totals.trendVsLY >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(totals.trendVsLY)}
              </p>
              {totals.trendVsLY >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              LY: {formatINR(totals.ly)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">vs Actuals LY-1</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${totals.trendVsLY2 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(totals.trendVsLY2)}
              </p>
              {totals.trendVsLY2 >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              LY-1: {formatINR(totals.ly2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analysis Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {/* Event Filter */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Event</label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forecasts</SelectItem>
                  {relevantEvents.map((event) => {
                    const typeColor = getEventTypeColor(event.type);
                    return (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${typeColor.dot}`} />
                          {event.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Group By */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Group By</label>
              <Select value={groupBy} onValueChange={(v: GroupDimension) => setGroupBy(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="city">City</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="format">Outlet Format</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected event info */}
          {selectedEvent !== 'all' && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              {(() => {
                const event = events.find(e => e.id === selectedEvent);
                if (!event) return null;
                const typeColor = getEventTypeColor(event.type);
                
                return (
                  <div className="flex items-center gap-4">
                    <Badge className={`${typeColor.bg} ${typeColor.text} border-0`}>
                      {event.type}
                    </Badge>
                    <span className="font-medium">{event.name}</span>
                    <span className="text-muted-foreground">
                      {event.start_date} → {event.end_date}
                    </span>
                    {event.uplift_pct > 0 && (
                      <span className="text-green-600">+{event.uplift_pct}% uplift</span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold capitalize">
            Revenue by {groupBy}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="capitalize">{groupBy}</TableHead>
                <TableHead className="text-right">Current Forecast</TableHead>
                <TableHead className="text-right">Actuals LY</TableHead>
                <TableHead className="text-right">vs LY</TableHead>
                <TableHead className="text-right">Actuals LY-1</TableHead>
                <TableHead className="text-right">vs LY-1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysisRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No data available for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {analysisRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right">
                        <div>
                          <span className="font-semibold">{formatINR(row.forecastRevenue)}</span>
                          <p className="text-xs text-muted-foreground">{row.forecastUnits.toLocaleString('en-IN')} units</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <span className="text-muted-foreground">{formatINR(row.lyRevenue)}</span>
                          <p className="text-xs text-muted-foreground">{row.lyUnits.toLocaleString('en-IN')} units</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={row.trendVsLY >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatPercentage(row.trendVsLY)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <span className="text-muted-foreground">{formatINR(row.ly2Revenue)}</span>
                          <p className="text-xs text-muted-foreground">{row.ly2Units.toLocaleString('en-IN')} units</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={row.trendVsLY2 >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatPercentage(row.trendVsLY2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="bg-muted/30 font-bold border-t-2">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span>{formatINR(totals.forecast)}</span>
                        <p className="text-xs font-normal text-muted-foreground">{totals.forecastUnits.toLocaleString('en-IN')} units</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span>{formatINR(totals.ly)}</span>
                        <p className="text-xs font-normal text-muted-foreground">{totals.lyUnits.toLocaleString('en-IN')} units</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={totals.trendVsLY >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercentage(totals.trendVsLY)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span>{formatINR(totals.ly2)}</span>
                        <p className="text-xs font-normal text-muted-foreground">{totals.ly2Units.toLocaleString('en-IN')} units</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={totals.trendVsLY2 >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercentage(totals.trendVsLY2)}
                      </span>
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
