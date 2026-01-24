'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/components/SupabaseProvider';
import { useAuth } from '@/lib/supabase/useAuth';
import type { 
  Outlet, 
  Category, 
  SKU, 
  Event, 
  Forecast, 
  HistoricalSale 
} from '@/lib/types';

// ===========================================
// OUTLETS
// ===========================================
export function useOutlets() {
  const supabase = useSupabase();
  const { user, orgId } = useAuth();

  return useQuery({
    queryKey: ['outlets', user?.id, orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID not found');

      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .eq('organization_id', orgId)
        .order('city', { ascending: true });

      if (error) throw error;
      return data as Outlet[];
    },
    enabled: !!user && !!orgId,
  });
}

// ===========================================
// CATEGORIES
// ===========================================
export function useCategories() {
  const supabase = useSupabase();
  const { user, orgId } = useAuth();

  return useQuery({
    queryKey: ['categories', user?.id, orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID not found');

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user && !!orgId,
  });
}

// ===========================================
// SKUS
// ===========================================
export function useSKUs() {
  const supabase = useSupabase();
  const { user, orgId } = useAuth();

  return useQuery({
    queryKey: ['skus', user?.id, orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID not found');

      const { data, error } = await supabase
        .from('skus')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as (SKU & { category: Category | null })[];
    },
    enabled: !!user && !!orgId,
  });
}

// ===========================================
// EVENTS
// ===========================================
export function useEvents() {
  const supabase = useSupabase();
  const { user, orgId } = useAuth();

  return useQuery({
    queryKey: ['events', user?.id, orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID not found');

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          scope_outlet:outlets(*),
          scope_category:categories(*),
          scope_sku:skus(*)
        `)
        .eq('organization_id', orgId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user && !!orgId,
  });
}

// ===========================================
// FORECASTS
// ===========================================
export function useForecasts(days: number = 30) {
  const supabase = useSupabase();
  const { user, orgId } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  const endDateStr = endDate.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['forecasts', user?.id, orgId, days],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID not found');

      const { data, error } = await supabase
        .from('forecasts')
        .select(`
          *,
          outlet:outlets(*),
          sku:skus(*, category:categories(*))
        `)
        .eq('organization_id', orgId)
        .gte('forecast_date', today)
        .lte('forecast_date', endDateStr)
        .order('forecast_date', { ascending: true });

      if (error) throw error;
      return data as (Forecast & { outlet: Outlet; sku: SKU & { category: Category | null } })[];
    },
    enabled: !!user && !!orgId,
  });
}

// ===========================================
// HISTORICAL SALES
// ===========================================
export function useHistoricalSales(days: number = 30) {
  const supabase = useSupabase();
  const { user, orgId } = useAuth();

  // Get dates for last year and 2 years ago
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  // Last year
  const lyStart = new Date(today);
  lyStart.setFullYear(lyStart.getFullYear() - 1);
  const lyEnd = new Date(endDate);
  lyEnd.setFullYear(lyEnd.getFullYear() - 1);

  // 2 years ago
  const ly2Start = new Date(today);
  ly2Start.setFullYear(ly2Start.getFullYear() - 2);
  const ly2End = new Date(endDate);
  ly2End.setFullYear(ly2End.getFullYear() - 2);

  return useQuery({
    queryKey: ['historical_sales', user?.id, orgId, days],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID not found');

      // Fetch last year data
      const { data: lyData, error: lyError } = await supabase
        .from('historical_sales')
        .select(`
          *,
          outlet:outlets(*),
          sku:skus(*)
        `)
        .eq('organization_id', orgId)
        .gte('sale_date', lyStart.toISOString().split('T')[0])
        .lte('sale_date', lyEnd.toISOString().split('T')[0])
        .order('sale_date', { ascending: true });

      if (lyError) throw lyError;

      // Fetch 2 years ago data
      const { data: ly2Data, error: ly2Error } = await supabase
        .from('historical_sales')
        .select(`
          *,
          outlet:outlets(*),
          sku:skus(*)
        `)
        .eq('organization_id', orgId)
        .gte('sale_date', ly2Start.toISOString().split('T')[0])
        .lte('sale_date', ly2End.toISOString().split('T')[0])
        .order('sale_date', { ascending: true });

      if (ly2Error) throw ly2Error;

      return {
        lastYear: lyData as HistoricalSale[],
        twoYearsAgo: ly2Data as HistoricalSale[],
      };
    },
    enabled: !!user && !!orgId,
  });
}

// ===========================================
// COMBINED DASHBOARD DATA
// ===========================================
export function useDashboardData(days: number = 30) {
  const outlets = useOutlets();
  const categories = useCategories();
  const skus = useSKUs();
  const events = useEvents();
  const forecasts = useForecasts(days);
  const historical = useHistoricalSales(days);

  const isLoading = 
    outlets.isLoading || 
    categories.isLoading || 
    skus.isLoading || 
    events.isLoading || 
    forecasts.isLoading || 
    historical.isLoading;

  const error = 
    outlets.error || 
    categories.error || 
    skus.error || 
    events.error || 
    forecasts.error || 
    historical.error;

  return {
    outlets: outlets.data || [],
    categories: categories.data || [],
    skus: skus.data || [],
    events: events.data || [],
    forecasts: forecasts.data || [],
    historicalLY: historical.data?.lastYear || [],
    historicalLY2: historical.data?.twoYearsAgo || [],
    isLoading,
    error,
    refetch: () => {
      outlets.refetch();
      categories.refetch();
      skus.refetch();
      events.refetch();
      forecasts.refetch();
      historical.refetch();
    },
  };
}


