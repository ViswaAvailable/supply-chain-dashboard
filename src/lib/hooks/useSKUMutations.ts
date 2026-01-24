'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/components/SupabaseProvider';
import { useAuth } from '@/lib/supabase/useAuth';
import type { SKU, Category } from '@/lib/types';
import { skuUpdateSchema, bulkSKUUpdateSchema, categorySchema } from '@/lib/validation/schemas';

export function useUpdateSKU() {
  const supabase = useSupabase();
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SKU> }) => {
      if (!orgId) throw new Error('Organization ID not found');

      // Validate input data
      const validationResult = skuUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.error.format())}`);
      }

      const updateData: Record<string, unknown> = {};
      const validated = validationResult.data;

      if (validated.min_quantity !== undefined) updateData.min_quantity = validated.min_quantity;
      if (validated.category_id !== undefined) updateData.category_id = validated.category_id || null;
      if (validated.name !== undefined) updateData.name = validated.name;

      updateData.updated_at = new Date().toISOString();

      const { data: result, error } = await supabase
        .from('skus')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', orgId)
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
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ id: string; data: Partial<SKU> }>) => {
      if (!orgId) throw new Error('Organization ID not found');

      // Validate bulk update data
      const validationResult = bulkSKUUpdateSchema.safeParse(updates);
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.error.format())}`);
      }

      const results = await Promise.all(
        validationResult.data.map(async ({ id, data }) => {
          const updateData: Record<string, unknown> = {};

          if (data.min_quantity !== undefined) updateData.min_quantity = data.min_quantity;
          if (data.category_id !== undefined) updateData.category_id = data.category_id || null;

          updateData.updated_at = new Date().toISOString();

          const { data: result, error } = await supabase
            .from('skus')
            .update(updateData)
            .eq('id', id)
            .eq('organization_id', orgId)
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
      // Validate category name
      const validationResult = categorySchema.safeParse({ name });
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.error.format())}`);
      }

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
          name: validationResult.data.name,
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
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('Organization ID not found');

      // First, unassign all SKUs from this category within the organization
      await supabase
        .from('skus')
        .update({ category_id: null, updated_at: new Date().toISOString() })
        .eq('category_id', id)
        .eq('organization_id', orgId);

      // Then delete the category within the organization
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['skus'] });
    },
  });
}


