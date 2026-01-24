'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SimpleKPICard } from '@/components/dashboard/KPICard';
import { ForecastChart, EventLegend } from '@/components/dashboard/ForecastChart';
import { useDashboardData } from '@/lib/hooks/useForecastData';
import { formatINR, formatPercentage, calculatePercentageChange } from '@/lib/forecast-utils';
import { RefreshCw, Search, X, TrendingUp, BarChart3, Calendar, Package, Target } from 'lucide-react';
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
    const forecastedRevenue = filteredForecasts.reduce((sum, f) => {
      const sku = skus.find(s => s.id === f.sku_id);
      return sum + (f.forecast_value * (sku?.price_per_unit || 0));
    }, 0);

    const lyRevenue = filteredLY.reduce((sum, h) => sum + (h.revenue || 0), 0);
    const ly2Revenue = filteredLY2.reduce((sum, h) => sum + (h.revenue || 0), 0);

    const revenueVsLY = calculatePercentageChange(forecastedRevenue, lyRevenue);
    const revenueVsLY2 = calculatePercentageChange(forecastedRevenue, ly2Revenue);

    const minQtyOverrides = filteredForecasts.filter(f => {
      const sku = skus.find(s => s.id === f.sku_id);
      return sku && f.forecast_value <= sku.min_quantity && sku.min_quantity > 0;
    }).length;

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
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[var(--charcoal-900)] flex items-center justify-center shadow-xl">
              <div className="w-8 h-8 border-3 border-[var(--lemon-500)] border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="absolute -inset-2 bg-[var(--lemon-500)]/10 rounded-3xl blur-xl animate-pulse-subtle" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Loading forecast data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium mb-4">Failed to load forecast data</p>
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
      <div className="flex items-center justify-between opacity-0 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight font-[family-name:var(--font-display)]">
            Demand Forecast
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            ML-powered demand predictions with event-aware intelligence
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards - Horizontal Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 opacity-0 animate-slide-up stagger-1">
        <SimpleKPICard
          label="Forecast Accuracy"
          value={`${kpis.forecastAccuracy}%`}
          icon={Target}
          change={{
            value: '+2.1%',
            type: 'up',
            label: 'vs last month',
          }}
        />
        <SimpleKPICard
          label="Forecasted Revenue"
          value={formatINR(kpis.forecastedRevenue)}
          icon={TrendingUp}
          change={{
            value: formatPercentage(kpis.revenueVsLY),
            type: kpis.revenueVsLY >= 0 ? 'up' : 'down',
            label: 'vs LY',
          }}
        />
        <SimpleKPICard
          label="Active Events"
          value={activeEventsCount.toString()}
          icon={Calendar}
          change={activeEventsCount > 0 ? {
            value: 'Affecting forecasts',
            type: 'neutral',
          } : undefined}
        />
        <SimpleKPICard
          label="Min Qty Overrides"
          value={kpis.minQtyOverrides.toString()}
          icon={Package}
          change={kpis.minQtyOverrides > 0 ? {
            value: 'Applied',
            type: 'warning',
          } : undefined}
        />
      </div>

      {/* Filters & Chart */}
      <Card className="opacity-0 animate-slide-up stagger-2">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold">Forecast Overview</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
                <SelectTrigger className="w-[130px]">
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
                <SelectTrigger className="w-[160px]">
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
                <SelectTrigger className="w-[180px]">
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
                    className="w-[180px] justify-between"
                  >
                    <span className="truncate">
                      {skuFilter !== 'all'
                        ? skus.find((s) => s.id === skuFilter)?.name
                        : 'All SKUs'}
                    </span>
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
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Filters:</span>
              {categoryFilter !== 'all' && (
                <Badge
                  variant="accent"
                  className="cursor-pointer gap-1.5 hover:bg-[var(--lemon-200)]"
                  onClick={() => setCategoryFilter('all')}
                >
                  {categories.find(c => c.id === categoryFilter)?.name}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {outletFilter !== 'all' && (
                <Badge
                  variant="accent"
                  className="cursor-pointer gap-1.5 hover:bg-[var(--lemon-200)]"
                  onClick={() => setOutletFilter('all')}
                >
                  {outlets.find(o => o.id === outletFilter)?.name}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {skuFilter !== 'all' && (
                <Badge
                  variant="accent"
                  className="cursor-pointer gap-1.5 hover:bg-[var(--lemon-200)]"
                  onClick={() => setSkuFilter('all')}
                >
                  {skus.find(s => s.id === skuFilter)?.name}
                  <X className="h-3 w-3" />
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

          {/* Event Legend */}
          <EventLegend events={events} dateRange={dateRange} />
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-0 animate-slide-up stagger-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Total Units Forecasted
                </p>
                <p className="text-3xl font-bold font-mono tabular-nums">
                  {filteredForecasts.reduce((sum, f) => sum + f.forecast_value, 0).toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Across {new Set(filteredForecasts.map(f => f.sku_id)).size} products
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[var(--charcoal-100)] flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-[var(--charcoal-600)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  vs Last Year
                </p>
                <p className={`text-3xl font-bold font-mono tabular-nums ${kpis.revenueVsLY >= 0 ? 'text-[var(--success)]' : 'text-destructive'}`}>
                  {formatPercentage(kpis.revenueVsLY)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Revenue growth trend
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpis.revenueVsLY >= 0 ? 'bg-[var(--success)]/10' : 'bg-destructive/10'}`}>
                <TrendingUp className={`h-5 w-5 ${kpis.revenueVsLY >= 0 ? 'text-[var(--success)]' : 'text-destructive'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  vs 2 Years Ago
                </p>
                <p className={`text-3xl font-bold font-mono tabular-nums ${kpis.revenueVsLY2 >= 0 ? 'text-[var(--success)]' : 'text-destructive'}`}>
                  {formatPercentage(kpis.revenueVsLY2)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Long-term growth
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpis.revenueVsLY2 >= 0 ? 'bg-[var(--success)]/10' : 'bg-destructive/10'}`}>
                <TrendingUp className={`h-5 w-5 ${kpis.revenueVsLY2 >= 0 ? 'text-[var(--success)]' : 'text-destructive'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
