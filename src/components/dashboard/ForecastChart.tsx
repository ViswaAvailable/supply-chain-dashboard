'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Forecast, HistoricalSale, Event, SKU } from '@/lib/types';
import { formatDateShort, getHistoricalDate, formatINR, getApplicableEvents, calculateEventUpliftMultiplier } from '@/lib/forecast-utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ForecastChartProps {
  forecasts: Forecast[];
  historicalLY: HistoricalSale[];
  historicalLY2: HistoricalSale[];
  events: Event[];
  skus: SKU[];
  showConfidenceBands?: boolean;
  showHistorical?: boolean;
  dateRange?: number;
}

export function ForecastChart({
  forecasts,
  historicalLY,
  historicalLY2,
  events,
  skus,
  showConfidenceBands = true,
  showHistorical = true,
  dateRange = 30,
}: ForecastChartProps) {
  const chartData = useMemo(() => {
    // Group forecasts by date - both raw and with uplift applied
    const forecastByDate = new Map<string, { 
      value: number; 
      valueWithUplift: number;
      lower: number; 
      upper: number; 
      revenue: number;
      revenueWithUplift: number;
    }>();
    
    forecasts.forEach(f => {
      const sku = skus.find(s => s.id === f.sku_id);
      const price = sku?.price_per_unit || 0;
      
      // Get applicable events for this forecast
      const applicableEvents = getApplicableEvents(
        events,
        f.forecast_date,
        f.outlet_id,
        sku?.category_id || null,
        f.sku_id
      );
      
      // Calculate uplift multiplier
      const upliftMultiplier = calculateEventUpliftMultiplier(applicableEvents);
      const valueWithUplift = Math.round(f.forecast_value * upliftMultiplier);
      
      const existing = forecastByDate.get(f.forecast_date) || { 
        value: 0, 
        valueWithUplift: 0,
        lower: 0, 
        upper: 0, 
        revenue: 0,
        revenueWithUplift: 0,
      };
      
      forecastByDate.set(f.forecast_date, {
        value: existing.value + f.forecast_value,
        valueWithUplift: existing.valueWithUplift + valueWithUplift,
        lower: existing.lower + (f.lower_bound || f.forecast_value * 0.85),
        upper: existing.upper + (f.upper_bound || f.forecast_value * 1.15),
        revenue: existing.revenue + (f.forecast_value * price),
        revenueWithUplift: existing.revenueWithUplift + (valueWithUplift * price),
      });
    });

    // Group historical by date (mapped to corresponding forecast date)
    const lyByDate = new Map<string, number>();
    historicalLY.forEach(h => {
      const forecastDate = getHistoricalDate(h.sale_date, -1); // Map back to current year
      const existing = lyByDate.get(forecastDate) || 0;
      lyByDate.set(forecastDate, existing + h.actual_sales);
    });

    const ly2ByDate = new Map<string, number>();
    historicalLY2.forEach(h => {
      const forecastDate = getHistoricalDate(h.sale_date, -2); // Map back to current year
      const existing = ly2ByDate.get(forecastDate) || 0;
      ly2ByDate.set(forecastDate, existing + h.actual_sales);
    });

    // Sort dates
    const dates = Array.from(forecastByDate.keys()).sort();
    
    // Get enabled events that fall within the date range
    const enabledEvents = events.filter(e => e.enabled);
    
    // Create event bands data (for visual indication) - only for events in range
    const eventBands: { start: number; end: number; event: Event }[] = [];
    const eventsInRange: Event[] = [];
    
    enabledEvents.forEach(event => {
      const startIdx = dates.findIndex(d => d >= event.start_date);
      const endIdx = dates.findIndex(d => d > event.end_date);
      
      // Check if event overlaps with our date range
      const eventOverlapsRange = startIdx !== -1 || (dates.length > 0 && event.start_date <= dates[dates.length - 1] && event.end_date >= dates[0]);
      
      if (startIdx !== -1 && startIdx < dates.length) {
        eventBands.push({
          start: startIdx,
          end: endIdx === -1 ? dates.length - 1 : Math.min(endIdx - 1, dates.length - 1),
          event,
        });
        eventsInRange.push(event);
      } else if (eventOverlapsRange && startIdx === -1 && dates.length > 0 && event.start_date <= dates[0]) {
        // Event started before our range but continues into it
        const actualEndIdx = dates.findIndex(d => d > event.end_date);
        eventBands.push({
          start: 0,
          end: actualEndIdx === -1 ? dates.length - 1 : actualEndIdx - 1,
          event,
        });
        eventsInRange.push(event);
      }
    });

    // Check if any uplift is applied (to decide whether to show the uplift line)
    const hasUplift = Array.from(forecastByDate.values()).some(d => d.valueWithUplift !== d.value);

    return {
      labels: dates.map(d => formatDateShort(d)),
      datasets: [
        // Confidence band (upper)
        ...(showConfidenceBands ? [{
          label: 'Upper Bound',
          data: dates.map(d => forecastByDate.get(d)?.upper || 0),
          borderColor: 'transparent',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: '+1',
          pointRadius: 0,
          tension: 0.4,
        }] : []),
        // Base Forecast line (ML output)
        {
          label: 'ML Forecast',
          data: dates.map(d => forecastByDate.get(d)?.value || 0),
          borderColor: '#94a3b8',
          backgroundColor: '#94a3b8',
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.4,
          fill: false,
        },
        // Forecast with Uplift line (only if there's uplift)
        ...(hasUplift ? [{
          label: 'Forecast + Uplift',
          data: dates.map(d => forecastByDate.get(d)?.valueWithUplift || 0),
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: false,
        }] : [{
          label: 'Forecast',
          data: dates.map(d => forecastByDate.get(d)?.value || 0),
          borderColor: '#1f2937',
          backgroundColor: '#1f2937',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: false,
        }]),
        // Confidence band (lower)
        ...(showConfidenceBands ? [{
          label: 'Lower Bound',
          data: dates.map(d => forecastByDate.get(d)?.lower || 0),
          borderColor: 'transparent',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: false,
          pointRadius: 0,
          tension: 0.4,
        }] : []),
        // Last Year
        ...(showHistorical ? [{
          label: 'Last Year',
          data: dates.map(d => lyByDate.get(d) || 0),
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.4,
          fill: false,
        }] : []),
        // 2 Years Ago
        ...(showHistorical ? [{
          label: '2 Years Ago',
          data: dates.map(d => ly2ByDate.get(d) || 0),
          borderColor: '#6b7280',
          backgroundColor: '#6b7280',
          borderWidth: 1.5,
          borderDash: [2, 2],
          pointRadius: 1,
          pointHoverRadius: 4,
          tension: 0.4,
          fill: false,
        }] : []),
      ],
      eventBands,
      eventsInRange,
      dates,
      forecastByDate,
      hasUplift,
    };
  }, [forecasts, historicalLY, historicalLY2, events, skus, showConfidenceBands, showHistorical]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
          filter: (item) => {
            // Hide confidence band labels
            return item.text !== 'Upper Bound' && item.text !== 'Lower Bound';
          },
        },
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        padding: 12,
        displayColors: true,
        callbacks: {
          title: (items) => {
            if (items.length === 0) return '';
            const date = chartData.dates[items[0].dataIndex];
            return formatDateShort(date);
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label === 'Upper Bound' || label === 'Lower Bound') {
              return '';
            }
            
            return `${label}: ${value.toLocaleString('en-IN')} units`;
          },
          afterBody: (items) => {
            if (items.length === 0) return [];
            const date = chartData.dates[items[0].dataIndex];
            const data = chartData.forecastByDate.get(date);
            
            if (data) {
              const lines = [];
              if (chartData.hasUplift) {
                lines.push(`Revenue (with uplift): ${formatINR(data.revenueWithUplift)}`);
                lines.push(`Revenue (base): ${formatINR(data.revenue)}`);
              } else {
                lines.push(`Revenue: ${formatINR(data.revenue)}`);
              }
              return lines;
            }
            return [];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#e2e8f0',
        },
        ticks: {
          callback: (value) => value.toLocaleString('en-IN'),
          font: {
            size: 11,
          },
        },
      },
    },
  };

  // Custom plugin for event bands
  const eventBandsPlugin = {
    id: 'eventBands',
    beforeDraw: (chart: ChartJS) => {
      const { ctx, chartArea, scales } = chart;
      
      if (!chartArea) return;
      
      chartData.eventBands.forEach(({ start, end, event }) => {
        const xStart = scales.x.getPixelForValue(start);
        const xEnd = scales.x.getPixelForValue(end);
        
        // Band color based on event type
        let color = 'rgba(251, 191, 36, 0.15)'; // Default yellow
        if (event.type === 'promo') color = 'rgba(59, 130, 246, 0.15)';
        if (event.type === 'custom') color = 'rgba(168, 85, 247, 0.15)';
        
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(
          xStart,
          chartArea.top,
          xEnd - xStart,
          chartArea.bottom - chartArea.top
        );
        ctx.restore();
      });
    },
  };

  return (
    <div className="h-[400px] w-full">
      <Line 
        data={chartData as unknown as ChartData<'line'>} 
        options={options} 
        plugins={[eventBandsPlugin]}
      />
    </div>
  );
}

// Legend component for events - only shows events active in the current date range
export function EventLegend({ events, dateRange = 30 }: { events: Event[]; dateRange?: number }) {
  // Calculate the date range
  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + dateRange);
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // Filter to only enabled events that overlap with the current date range
  const activeEventsInRange = events.filter(e => {
    if (!e.enabled) return false;
    // Event overlaps with range if: event.start <= range.end AND event.end >= range.start
    return e.start_date <= endDateStr && e.end_date >= today;
  });
  
  if (activeEventsInRange.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
      <span className="text-sm font-medium text-muted-foreground">Active Events:</span>
      {activeEventsInRange.map(event => {
        let bgColor = 'bg-amber-200';
        if (event.type === 'promo') bgColor = 'bg-blue-200';
        if (event.type === 'custom') bgColor = 'bg-purple-200';
        
        return (
          <div key={event.id} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${bgColor}`} />
            <span className="text-sm text-muted-foreground">
              {event.name}
              {event.uplift_pct > 0 && (
                <span className="text-green-600 ml-1">(+{event.uplift_pct}%)</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

