// ===========================================
// LEMONDOTS AI - TYPE DEFINITIONS
// ===========================================

// Database table types
export interface Organization {
  id: string;
  name: string;
}

export interface Outlet {
  id: string;
  organization_id: string;
  name: string;
  city: string;
  format: 'Airport' | 'Kiosk' | 'Cafe' | 'Cloud Kitchen';
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface SKU {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  min_quantity: number;
  avg_forecast: number;
  price_per_unit: number;
  is_new_product: boolean;
  reference_sku_id: string | null;
  similarity_factor: number;
  active_period_start: string | null;
  active_period_end: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  category?: Category;
}

export interface CannibalizationImpact {
  id: string;
  source_sku_id: string;
  affected_sku_id: string;
  percentage: number;
  created_at?: string;
  // Joined data
  affected_sku?: SKU;
}

export type EventType = 'holiday' | 'promo' | 'custom';
export type EventMode = 'flag' | 'uplift';
export type ComparisonMethod = 'calendar' | 'same_event';

export interface Event {
  id: string;
  organization_id: string;
  name: string;
  type: EventType;
  start_date: string;
  end_date: string;
  scope_outlet_id: string | null;
  scope_category_id: string | null;
  scope_sku_id: string | null;
  mode: EventMode;
  uplift_pct: number;
  enabled: boolean;
  // Comparison method for Event Analysis
  comparison_method: ComparisonMethod;
  historical_ly_start_date: string | null;
  historical_ly_end_date: string | null;
  historical_ly2_start_date: string | null;
  historical_ly2_end_date: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  scope_outlet?: Outlet;
  scope_category?: Category;
  scope_sku?: SKU;
}

export type ConfidenceRating = 'high' | 'medium' | 'low';

export interface Forecast {
  id: string;
  organization_id: string;
  outlet_id: string;
  sku_id: string;
  forecast_date: string;
  forecast_value: number;
  lower_bound: number | null;
  upper_bound: number | null;
  confidence_rating: ConfidenceRating | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  outlet?: Outlet;
  sku?: SKU;
}

export interface HistoricalSale {
  id: string;
  organization_id: string;
  outlet_id: string;
  sku_id: string;
  sale_date: string;
  actual_sales: number;
  revenue: number | null;
  created_at?: string;
  // Joined data
  outlet?: Outlet;
  sku?: SKU;
}

// ===========================================
// COMPUTED / DISPLAY TYPES
// ===========================================

// Daily forecast row with all computed values
export interface DailyForecastRow {
  id: string;
  outlet: Outlet;
  sku: SKU;
  category: Category | null;
  date: string;
  day: string; // e.g., "Monday"
  rawForecast: number;
  finalForecast: number;
  lowerBound: number;
  upperBound: number;
  confidenceRating: ConfidenceRating;
  isOverridden: boolean; // true if min quantity was applied
  revenue: number;
  events: Event[];
  eventUpliftApplied: boolean;
}

// Chart data point for demand forecast
export interface ChartDataPoint {
  date: string;
  label: string; // formatted date for display
  forecast: number;
  lowerBound: number;
  upperBound: number;
  actualLY: number; // last year
  actualLY2: number; // 2 years ago
}

// KPI values
export interface DashboardKPIs {
  forecastAccuracy: number;
  forecastedRevenue: number;
  revenueVsLY: number; // percentage change
  revenueVsLY2: number; // percentage change
  minQtyOverrides: number;
}

// Event analysis row
export interface EventAnalysisRow {
  groupKey: string;
  groupValue: string;
  level: number;
  forecastedRevenue: number;
  revenueLY: number;
  revenueLY2: number;
  trendVsLY: number;
  trendVsLY2: number;
  children?: EventAnalysisRow[];
  isExpanded?: boolean;
}

// Filter options
export interface FilterOptions {
  categories: Category[];
  skus: SKU[];
  outlets: Outlet[];
}

// Filter state
export interface ForecastFilters {
  categoryId: string | 'all';
  skuId: string | 'all';
  outletId: string | 'all';
  dateRange: 7 | 14 | 30 | 60 | 90;
}

// ===========================================
// FORM TYPES
// ===========================================

export interface EventFormData {
  name: string;
  type: EventType;
  start_date: string;
  end_date: string;
  scope_outlet_id: string | 'all';
  scope_category_id: string | 'all';
  scope_sku_id: string | 'all';
  mode: EventMode;
  uplift_pct: number;
  // Comparison method for Event Analysis
  comparison_method: ComparisonMethod;
  historical_ly_start_date: string;
  historical_ly_end_date: string;
  historical_ly2_start_date: string;
  historical_ly2_end_date: string;
}

export interface SKUSettingsFormData {
  min_quantity: number;
  category_id: string;
}

export interface NewProductFormData {
  sku_id: string;
  min_quantity: number;
  reference_sku_id: string;
  similarity_factor: number;
  active_period_start: string;
  active_period_end: string;
  cannibalization: Array<{
    affected_sku_id: string;
    percentage: number;
  }>;
}

