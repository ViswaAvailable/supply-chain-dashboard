'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/components/SupabaseProvider';
import { useAuth } from '@/lib/supabase/useAuth';
import type { SKU, Category } from '@/lib/types';

export function useUpdateSKU() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SKU> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.min_quantity !== undefined) updateData.min_quantity = data.min_quantity;
      if (data.category_id !== undefined) updateData.category_id = data.category_id || null;
      if (data.name !== undefined) updateData.name = data.name;
      
      updateData.updated_at = new Date().toISOString();

      const { data: result, error } = await supabase
        .from('skus')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as SKU;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
    },
  });
}

export function useBulkUpdateSKUs() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ id: string; data: Partial<SKU> }>) => {
      const results = await Promise.all(
        updates.map(async ({ id, data }) => {
          const updateData: Record<string, unknown> = {};
          
          if (data.min_quantity !== undefined) updateData.min_quantity = data.min_quantity;
          if (data.category_id !== undefined) updateData.category_id = data.category_id || null;
          
          updateData.updated_at = new Date().toISOString();

          const { data: result, error } = await supabase
            .from('skus')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return result;
        })
      );
      
      return results as SKU[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
    },
  });
}

export function useCreateCategory() {
  const supabase = useSupabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      // Get user's organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user?.id)
        .single();

      if (userError || !userData?.org_id) {
        throw new Error('Could not determine organization');
      }

      const { data: result, error } = await supabase
        .from('categories')
        .insert({
          organization_id: userData.org_id,
          name,
        })
        .select()
        .single();

      if (error) throw error;
      return result as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, unassign all SKUs from this category
      await supabase
        .from('skus')
        .update({ category_id: null, updated_at: new Date().toISOString() })
        .eq('category_id', id);

      // Then delete the category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['skus'] });
    },
  });
}

