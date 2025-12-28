'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { KPICard } from '@/components/dashboard/KPICard';
import { ForecastChart, EventLegend } from '@/components/dashboard/ForecastChart';
import { useDashboardData } from '@/lib/hooks/useForecastData';
import { formatINR, formatPercentage, calculatePercentageChange } from '@/lib/forecast-utils';
import { RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function DemandForecastPage() {
  const [dateRange, setDateRange] = useState<number>(30);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [outletFilter, setOutletFilter] = useState<string>('all');
  const [skuFilter, setSkuFilter] = useState<string>('all');
  const [skuSearchOpen, setSkuSearchOpen] = useState(false);

  const { 
    outlets, 
    categories, 
    skus, 
    events, 
    forecasts, 
    historicalLY, 
    historicalLY2,
    isLoading, 
    error,
    refetch 
  } = useDashboardData(dateRange);

  // Filter forecasts based on selections
  const filteredForecasts = useMemo(() => {
    return forecasts.filter(f => {
      if (categoryFilter !== 'all') {
        const sku = skus.find(s => s.id === f.sku_id);
        if (sku?.category_id !== categoryFilter) return false;
      }
      if (outletFilter !== 'all' && f.outlet_id !== outletFilter) return false;
      if (skuFilter !== 'all' && f.sku_id !== skuFilter) return false;
      return true;
    });
  }, [forecasts, categoryFilter, outletFilter, skuFilter, skus]);

  // Filter historical data similarly
  const filteredLY = useMemo(() => {
    return historicalLY.filter(h => {
      if (categoryFilter !== 'all') {
        const sku = skus.find(s => s.id === h.sku_id);
        if (sku?.category_id !== categoryFilter) return false;
      }
      if (outletFilter !== 'all' && h.outlet_id !== outletFilter) return false;
      if (skuFilter !== 'all' && h.sku_id !== skuFilter) return false;
      return true;
    });
  }, [historicalLY, categoryFilter, outletFilter, skuFilter, skus]);

  const filteredLY2 = useMemo(() => {
    return historicalLY2.filter(h => {
      if (categoryFilter !== 'all') {
        const sku = skus.find(s => s.id === h.sku_id);
        if (sku?.category_id !== categoryFilter) return false;
      }
      if (outletFilter !== 'all' && h.outlet_id !== outletFilter) return false;
      if (skuFilter !== 'all' && h.sku_id !== skuFilter) return false;
      return true;
    });
  }, [historicalLY2, categoryFilter, outletFilter, skuFilter, skus]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    // Total forecasted revenue
    const forecastedRevenue = filteredForecasts.reduce((sum, f) => {
      const sku = skus.find(s => s.id === f.sku_id);
      return sum + (f.forecast_value * (sku?.price_per_unit || 0));
    }, 0);

    // Last year revenue
    const lyRevenue = filteredLY.reduce((sum, h) => sum + (h.revenue || 0), 0);
    
    // 2 years ago revenue
    const ly2Revenue = filteredLY2.reduce((sum, h) => sum + (h.revenue || 0), 0);

    // Revenue changes
    const revenueVsLY = calculatePercentageChange(forecastedRevenue, lyRevenue);
    const revenueVsLY2 = calculatePercentageChange(forecastedRevenue, ly2Revenue);

    // Count min quantity overrides
    const minQtyOverrides = filteredForecasts.filter(f => {
      const sku = skus.find(s => s.id === f.sku_id);
      return sku && f.forecast_value <= sku.min_quantity && sku.min_quantity > 0;
    }).length;

    // Forecast accuracy (simulated - in production this would compare to actuals)
    const forecastAccuracy = 92.4;

    return {
      forecastAccuracy,
      forecastedRevenue,
      revenueVsLY,
      revenueVsLY2,
      minQtyOverrides,
    };
  }, [filteredForecasts, filteredLY, filteredLY2, skus]);

  // Active events count
  const activeEventsCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + dateRange);
    const endDateStr = endDate.toISOString().split('T')[0];

    return events.filter(e => 
      e.enabled && 
      e.start_date <= endDateStr && 
      e.end_date >= today
    ).length;
  }, [events, dateRange]);

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
          <h1 className="text-2xl font-bold text-foreground">Demand Forecast</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ML-powered demand predictions with event-aware intelligence
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Forecast Accuracy"
          value={`${kpis.forecastAccuracy}%`}
          change={{
            value: '+2.1%',
            type: 'up',
            label: 'vs last month',
          }}
        />
        <KPICard
          label="Forecasted Revenue"
          value={formatINR(kpis.forecastedRevenue)}
          change={{
            value: formatPercentage(kpis.revenueVsLY),
            type: kpis.revenueVsLY >= 0 ? 'up' : 'down',
            label: 'vs LY',
          }}
        />
        <KPICard
          label="Active Events"
          value={activeEventsCount.toString()}
          change={activeEventsCount > 0 ? {
            value: 'Affecting forecasts',
            type: 'neutral',
          } : undefined}
        />
        <KPICard
          label="Min Qty Overrides"
          value={kpis.minQtyOverrides.toString()}
          change={kpis.minQtyOverrides > 0 ? {
            value: 'Applied',
            type: 'warning',
          } : undefined}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Forecast Overview</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                </SelectContent>
              </Select>

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

              {/* SKU Typeahead Filter */}
              <Popover open={skuSearchOpen} onOpenChange={setSkuSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={skuSearchOpen}
                    className="w-[200px] justify-between"
                  >
                    {skuFilter !== 'all'
                      ? skus.find((s) => s.id === skuFilter)?.name
                      : 'All SKUs'}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                  <Command>
                    <CommandInput placeholder="Search SKUs..." />
                    <CommandList>
                      <CommandEmpty>No SKU found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSkuFilter('all');
                            setSkuSearchOpen(false);
                          }}
                        >
                          All SKUs
                        </CommandItem>
                        {skus.filter(s => !s.is_new_product).map((sku) => (
                          <CommandItem
                            key={sku.id}
                            value={sku.name}
                            onSelect={() => {
                              setSkuFilter(sku.id);
                              setSkuSearchOpen(false);
                            }}
                          >
                            {sku.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Active filter badges */}
          {(categoryFilter !== 'all' || outletFilter !== 'all' || skuFilter !== 'all') && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-muted-foreground">Filters:</span>
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
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Chart */}
          <ForecastChart
            forecasts={filteredForecasts}
            historicalLY={filteredLY}
            historicalLY2={filteredLY2}
            events={events}
            skus={skus}
            dateRange={dateRange}
          />
          
          {/* Event Legend - only shows events active in the date range */}
          <EventLegend events={events} dateRange={dateRange} />
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Units Forecasted</h3>
            <p className="text-2xl font-bold">
              {filteredForecasts.reduce((sum, f) => sum + f.forecast_value, 0).toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Across {new Set(filteredForecasts.map(f => f.sku_id)).size} products
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">vs Last Year</h3>
            <p className={`text-2xl font-bold ${kpis.revenueVsLY >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(kpis.revenueVsLY)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Revenue growth trend
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">vs 2 Years Ago</h3>
            <p className={`text-2xl font-bold ${kpis.revenueVsLY2 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(kpis.revenueVsLY2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Long-term growth
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
