import { z } from 'zod';

/**
 * Event validation schema
 * Validates all event creation and update operations
 */
export const eventSchema = z.object({
  name: z.string()
    .min(1, 'Event name is required')
    .max(100, 'Event name must be 100 characters or less')
    .trim(),
  type: z.enum(['holiday', 'promo', 'custom'], {
    message: 'Event type must be holiday, promo, or custom',
  }),
  start_date: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, 'Start date must be a valid date'),
  end_date: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, 'End date must be a valid date'),
  mode: z.enum(['flag', 'uplift'], {
    message: 'Mode must be flag or uplift',
  }),
  uplift_pct: z.number()
    .int('Uplift percentage must be an integer')
    .min(-100, 'Uplift percentage cannot be less than -100%')
    .max(500, 'Uplift percentage cannot exceed 500%'),
  scope_outlet_id: z.string().uuid('Invalid outlet ID').nullable().optional(),
  scope_category_id: z.string().uuid('Invalid category ID').nullable().optional(),
  scope_sku_id: z.string().uuid('Invalid SKU ID').nullable().optional(),
  enabled: z.boolean().optional(),
  comparison_method: z.enum(['calendar', 'same_event']).optional(),
  historical_ly_start_date: z.string().optional().nullable(),
  historical_ly_end_date: z.string().optional().nullable(),
  historical_ly2_start_date: z.string().optional().nullable(),
  historical_ly2_end_date: z.string().optional().nullable(),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return startDate <= endDate;
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

/**
 * SKU update validation schema
 * Validates SKU property updates
 */
export const skuUpdateSchema = z.object({
  min_quantity: z.number()
    .int('Minimum quantity must be an integer')
    .min(0, 'Minimum quantity cannot be negative')
    .max(1000000, 'Minimum quantity cannot exceed 1,000,000')
    .optional(),
  category_id: z.string().uuid('Invalid category ID').nullable().optional(),
  name: z.string()
    .min(1, 'SKU name is required')
    .max(200, 'SKU name must be 200 characters or less')
    .trim()
    .optional(),
});

/**
 * Category validation schema
 * Validates category creation and updates
 */
export const categorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be 50 characters or less')
    .trim(),
});

/**
 * Bulk SKU update validation
 * Validates bulk update operations
 */
export const bulkSKUUpdateSchema = z.array(
  z.object({
    id: z.string().uuid('Invalid SKU ID'),
    data: skuUpdateSchema,
  })
).min(1, 'At least one SKU must be updated');

/**
 * Helper function to validate and parse data
 * Returns parsed data if valid, throws error with details if invalid
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.format();
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
  }

  return result.data;
}

/**
 * Helper function for client-side validation
 * Returns validation errors in a friendly format
 */
export function validateSchemaClient<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const errors: Record<string, string[]> = {};

    Object.entries(fieldErrors).forEach(([key, value]) => {
      if (value && Array.isArray(value)) {
        errors[key] = value as string[];
      }
    });

    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
