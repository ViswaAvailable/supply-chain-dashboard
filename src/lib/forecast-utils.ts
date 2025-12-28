// ===========================================
// LEMONDOTS AI - FORECAST UTILITY FUNCTIONS
// ===========================================

import { Event, Forecast, SKU, HistoricalSale } from './types';

/**
 * Format currency in Indian Rupees with proper number formatting
 * Example: 1803506 -> "₹18,03,506"
 */
export function formatINR(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

/**
 * Format a number with Indian locale
 */
export function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('en-IN');
}

/**
 * Format percentage with sign
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Get day name from date string
 */
export function getDayName(dateString: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date(dateString);
  return days[date.getDay()];
}

/**
 * Format date for display (e.g., "Dec 27")
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date range (e.g., "Dec 27 → Jan 3")
 */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDateShort(startDate)} → ${formatDateShort(endDate)}`;
}

/**
 * Check if a date falls within a range
 */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Get events that apply to a specific forecast row
 */
export function getApplicableEvents(
  events: Event[],
  date: string,
  outletId: string,
  categoryId: string | null,
  skuId: string
): Event[] {
  return events.filter(event => {
    if (!event.enabled) return false;
    if (!isDateInRange(date, event.start_date, event.end_date)) return false;
    
    // Check scope
    const outletMatch = !event.scope_outlet_id || event.scope_outlet_id === outletId;
    const categoryMatch = !event.scope_category_id || event.scope_category_id === categoryId;
    const skuMatch = !event.scope_sku_id || event.scope_sku_id === skuId;
    
    return outletMatch && categoryMatch && skuMatch;
  });
}

/**
 * Calculate the uplift multiplier from applicable events
 * Takes the maximum uplift when multiple events overlap (doesn't compound)
 */
export function calculateEventUpliftMultiplier(events: Event[]): number {
  const upliftEvents = events.filter(e => e.mode === 'uplift' && e.uplift_pct > 0);
  if (upliftEvents.length === 0) return 1;
  
  const maxUplift = Math.max(...upliftEvents.map(e => e.uplift_pct));
  return 1 + (maxUplift / 100);
}

/**
 * Calculate final forecast value applying:
 * 1. Event uplift
 * 2. Minimum quantity floor
 */
export function calculateFinalForecast(
  rawForecast: number,
  events: Event[],
  minQuantity: number
): { finalForecast: number; isOverridden: boolean; upliftApplied: boolean } {
  // Apply event uplift
  const upliftMultiplier = calculateEventUpliftMultiplier(events);
  let adjustedForecast = Math.round(rawForecast * upliftMultiplier);
  
  const upliftApplied = upliftMultiplier > 1;
  
  // Apply minimum quantity floor
  const isOverridden = adjustedForecast < minQuantity;
  const finalForecast = Math.max(adjustedForecast, minQuantity);
  
  return { finalForecast, isOverridden, upliftApplied };
}

/**
 * Calculate confidence rating based on the confidence range
 */
export function calculateConfidenceRating(
  forecast: number,
  lowerBound: number,
  upperBound: number
): 'high' | 'medium' | 'low' {
  if (forecast === 0) return 'low';
  
  const range = upperBound - lowerBound;
  const rangePercent = range / forecast;
  
  if (rangePercent < 0.24) return 'high';
  if (rangePercent < 0.36) return 'medium';
  return 'low';
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Generate an array of dates for a given range
 */
export function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

/**
 * Get the corresponding historical date (same date, different year)
 */
export function getHistoricalDate(currentDate: string, yearsAgo: number): string {
  const date = new Date(currentDate);
  date.setFullYear(date.getFullYear() - yearsAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Aggregate forecast data by date
 */
export function aggregateForecastsByDate(
  forecasts: Forecast[],
  skus: SKU[]
): Map<string, { forecast: number; revenue: number; lowerBound: number; upperBound: number }> {
  const aggregated = new Map<string, { forecast: number; revenue: number; lowerBound: number; upperBound: number }>();
  
  forecasts.forEach(f => {
    const sku = skus.find(s => s.id === f.sku_id);
    const pricePerUnit = sku?.price_per_unit || 0;
    
    const existing = aggregated.get(f.forecast_date) || { forecast: 0, revenue: 0, lowerBound: 0, upperBound: 0 };
    
    aggregated.set(f.forecast_date, {
      forecast: existing.forecast + f.forecast_value,
      revenue: existing.revenue + (f.forecast_value * pricePerUnit),
      lowerBound: existing.lowerBound + (f.lower_bound || 0),
      upperBound: existing.upperBound + (f.upper_bound || 0),
    });
  });
  
  return aggregated;
}

/**
 * Aggregate historical sales by date
 */
export function aggregateHistoricalByDate(
  sales: HistoricalSale[]
): Map<string, { sales: number; revenue: number }> {
  const aggregated = new Map<string, { sales: number; revenue: number }>();
  
  sales.forEach(s => {
    const existing = aggregated.get(s.sale_date) || { sales: 0, revenue: 0 };
    
    aggregated.set(s.sale_date, {
      sales: existing.sales + s.actual_sales,
      revenue: existing.revenue + (s.revenue || 0),
    });
  });
  
  return aggregated;
}

/**
 * Get event type badge color classes
 */
export function getEventTypeColor(type: string): { bg: string; text: string; dot: string } {
  switch (type) {
    case 'holiday':
      return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' };
    case 'promo':
      return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' };
    case 'custom':
    default:
      return { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' };
  }
}

/**
 * Get confidence rating badge color classes
 */
export function getConfidenceColor(rating: string): { bg: string; text: string } {
  switch (rating) {
    case 'high':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'medium':
      return { bg: 'bg-amber-100', text: 'text-amber-800' };
    case 'low':
    default:
      return { bg: 'bg-red-100', text: 'text-red-800' };
  }
}

/**
 * Get category badge color classes
 */
export function getCategoryColor(categoryName: string): { bg: string; text: string } {
  const colors: Record<string, { bg: string; text: string }> = {
    'Milk Chocolate': { bg: 'bg-amber-100', text: 'text-amber-800' },
    'Dark Chocolate': { bg: 'bg-slate-100', text: 'text-slate-800' },
    'Gift Boxes': { bg: 'bg-green-100', text: 'text-green-800' },
    'Premium Collection': { bg: 'bg-purple-100', text: 'text-purple-800' },
    'Seasonal Specials': { bg: 'bg-rose-100', text: 'text-rose-800' },
  };
  
  return colors[categoryName] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

