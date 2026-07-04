import { z } from 'zod';

export const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
export const paymentStatuses = ['pending', 'unpaid', 'paid', 'failed', 'refunded'] as const;
export const paymentMethods = ['cash', 'card', 'bank_transfer', 'online'] as const;

const optionalQueryNumber = z.preprocess(
    value => value === undefined || value === '' ? undefined : value,
    z.coerce.number().optional()
);

const optionalQueryInt = z.preprocess(
    value => value === undefined || value === '' ? undefined : value,
    z.coerce.number().int().optional()
);

const sortBySchema = z.preprocess(
    value => ['createdAt', 'updatedAt', 'total', 'status'].includes(String(value)) ? value : 'createdAt',
    z.enum(['createdAt', 'updatedAt', 'total', 'status'])
);

const sortOrderSchema = z.preprocess(
    value => value === 'asc' ? 'asc' : 'desc',
    z.enum(['asc', 'desc'])
);

export const listOrdersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().default(''),
    userId: optionalQueryInt,
    status: z.enum(orderStatuses).optional(),
    paymentStatus: z.enum(paymentStatuses).optional(),
    sortBy: sortBySchema.default('createdAt'),
    sortOrder: sortOrderSchema.default('desc'),
    minTotal: optionalQueryNumber,
    maxTotal: optionalQueryNumber
});

const addressSchema = z.record(z.unknown()).refine(
    value => Object.keys(value).length > 0,
    'Address cannot be empty'
);

const orderItemSchema = z.object({
    productId: z.number().int('Product ID must be an integer').positive('Product ID must be positive'),
    quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1')
});

export const createOrderSchema = z.object({
    userId: z.number().int('User ID must be an integer').positive('User ID must be positive'),
    products: z.array(orderItemSchema).nonempty('Products array cannot be empty'),
    shippingFee: z.number().nonnegative('Shipping fee cannot be negative').default(0),
    taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100').default(0),
    discountRate: z.number().min(0, 'Discount rate cannot be negative').max(100, 'Discount rate cannot exceed 100').default(0),
    paymentMethod: z.enum(paymentMethods).default('cash'),
    paymentStatus: z.enum(paymentStatuses).default('pending'),
    status: z.enum(orderStatuses).default('pending'),
    shippingAddress: addressSchema,
    billingAddress: addressSchema.optional(),
    trackingNumber: z.string().trim().min(1).optional(),
    notes: z.string().trim().optional()
});

export const updateOrderSchema = z.object({
    shippingFee: z.number().nonnegative('Shipping fee cannot be negative').optional(),
    taxRate: z.number().min(0).max(100).optional(),
    discountRate: z.number().min(0).max(100).optional(),
    shippingAddress: addressSchema.optional(),
    billingAddress: addressSchema.optional().nullable(),
    trackingNumber: z.string().trim().min(1).optional().nullable(),
    notes: z.string().trim().optional().nullable()
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(orderStatuses)
});

export const updatePaymentStatusSchema = z.object({
    paymentStatus: z.enum(paymentStatuses)
});

export type OrderStatus = typeof orderStatuses[number];
export type PaymentStatus = typeof paymentStatuses[number];
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;
