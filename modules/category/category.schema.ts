import { z } from 'zod'
import { listQuerySchema } from '../common/commonSchema';

export const createCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required'),
    isActive: z.boolean().optional(),
    isSubCategory: z.boolean().optional()
});

export const updateCategorySchema = createCategorySchema.partial();

export const addSubCategoryToCategorySchema = z.object({
    categoryId: z.number().int().positive('Category ID must be a positive integer'),
    subCategoryIds: z.array(z.number().int().positive('Subcategory ID must be a positive integer')).nonempty('At least one subcategory ID is required')
});

export const listCategoriesQuerySchema = listQuerySchema.extend({
    isActive: z.enum(['true', 'false']).optional(),
    isSubCategory: z.enum(['true', 'false']).optional()
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type AddSubCategoryToCategoryInput = z.infer<typeof addSubCategoryToCategorySchema>;
export type ListCategoriesQueryInput = z.infer<typeof listCategoriesQuerySchema>;