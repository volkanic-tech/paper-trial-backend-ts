import { z } from 'zod';

const imageLinkSchema = z.object({
    url: z.string().url('Invalid URL'),
    altText: z.string().optional(),
    isPrimary: z.boolean().optional().default(false)
});

const optionalQueryNumber = z.preprocess(
    value => value === undefined || value === '' ? undefined : value,
    z.coerce.number().optional()
);

const optionalQueryInt = z.preprocess(
    value => value === undefined || value === '' ? undefined : value,
    z.coerce.number().int().optional()
);

const sortBySchema = z.preprocess(
    value => ['createdAt', 'price', 'name', 'stock'].includes(String(value)) ? value : 'createdAt',
    z.enum(['createdAt', 'price', 'name', 'stock'])
);

const sortOrderSchema = z.preprocess(
    value => value === 'asc' ? 'asc' : 'desc',
    z.enum(['asc', 'desc'])
);

export const createProductSchema = z.object({
    sku: z.string().min(1, 'SKU is required'),
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    price: z.number().positive('Price must be positive'),
    originalPrice: z.number().positive('Original price must be positive'),
    costPrice: z.number().positive('Cost price must be positive'),
    features: z.string().optional(),
    specifications: z.string().optional(),
    categoryId: z.number().int('Category ID must be an integer'),
    stock: z.number().int().nonnegative('Stock must be non-negative'),
    isActive: z.boolean().optional().default(true),
    isNew: z.boolean().optional().default(true),
    isFeatured: z.boolean().optional().default(false),
    imageLinks: z.array(imageLinkSchema).optional().default([])
});

export const updateProductSchema = createProductSchema.partial().extend({
    deleteImageIds: z.array(z.number().int()).optional()
});

export const listProductsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().default(''),
    categoryId: optionalQueryInt,
    isActive: z.enum(['true', 'false']).optional(),
    isNew: z.enum(['true', 'false']).optional(),
    isFeatured: z.enum(['true', 'false']).optional(),
    sortBy: sortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema.default('desc'),
    minPrice: optionalQueryNumber,
    maxPrice: optionalQueryNumber
});

export type ProductImageInput = z.infer<typeof imageLinkSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQueryInput = z.infer<typeof listProductsQuerySchema>;
