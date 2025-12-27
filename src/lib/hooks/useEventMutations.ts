'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/components/SupabaseProvider';
import { useAuth } from '@/lib/supabase/useAuth';
import type { Event, EventFormData } from '@/lib/types';

export function useCreateEvent() {
  const supabase = useSupabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EventFormData) => {
      // Get user's organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user?.id)
        .single();

      if (userError || !userData?.org_id) {
        throw new Error('Could not determine organization');
      }

      const eventData = {
        organization_id: userData.org_id,
        name: data.name,
        type: data.type,
        start_date: data.start_date,
        end_date: data.end_date,
        scope_outlet_id: data.scope_outlet_id === 'all' ? null : data.scope_outlet_id,
        scope_category_id: data.scope_category_id === 'all' ? null : data.scope_category_id,
        scope_sku_id: data.scope_sku_id === 'all' ? null : data.scope_sku_id,
        mode: data.mode,
        uplift_pct: data.mode === 'uplift' ? data.uplift_pct : 0,
        enabled: true,
      };

      const { data: result, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;
      return result as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
    },
  });
}

export function useUpdateEvent() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventFormData> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.start_date !== undefined) updateData.start_date = data.start_date;
      if (data.end_date !== undefined) updateData.end_date = data.end_date;
      if (data.scope_outlet_id !== undefined) {
        updateData.scope_outlet_id = data.scope_outlet_id === 'all' ? null : data.scope_outlet_id;
      }
      if (data.scope_category_id !== undefined) {
        updateData.scope_category_id = data.scope_category_id === 'all' ? null : data.scope_category_id;
      }
      if (data.scope_sku_id !== undefined) {
        updateData.scope_sku_id = data.scope_sku_id === 'all' ? null : data.scope_sku_id;
      }
      if (data.mode !== undefined) {
        updateData.mode = data.mode;
        updateData.uplift_pct = data.mode === 'uplift' ? data.uplift_pct : 0;
      }
      if (data.uplift_pct !== undefined && data.mode === 'uplift') {
        updateData.uplift_pct = data.uplift_pct;
      }

      updateData.updated_at = new Date().toISOString();

      const { data: result, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
    },
  });
}

export function useDeleteEvent() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
    },
  });
}

export function useToggleEventEnabled() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data: result, error } = await supabase
        .from('events')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
    },
  });
}

