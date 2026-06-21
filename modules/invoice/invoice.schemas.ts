import { z } from 'zod';

export const documentTypes = ['quotation', 'invoice'] as const;
export const documentStatuses = ['draft', 'issued', 'paid', 'overdue'] as const;

export const invoiceItemSchema = z.object({
    id: z.number().int().positive('Product ID must be a positive integer'),
    name: z.string().trim().min(1, 'Item name is required'),
    basePrice: z.number().nonnegative().optional(),
    price: z.number().nonnegative('Item price cannot be negative'),
    quantity: z.number().int().positive('Item quantity must be at least 1'),
    subtotal: z.number().nonnegative().optional()
});

const documentFieldsSchema = z.object({
    customerId: z.number().int().positive().optional(),
    customerName: z.string().trim().min(1, 'Customer name is required'),
    customerEmail: z.string().trim().email('Invalid customer email'),
    customerPhone: z.string().trim().min(7, 'Customer phone is too short').optional(),
    customerAddress: z.string().trim().min(1).optional(),
    issueDate: z.coerce.date(),
    expiryDate: z.coerce.date(),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
    taxRate: z.number().min(0).max(100).default(0),
    shippingFee: z.number().nonnegative().default(0),
    discountRate: z.number().min(0).max(100).default(0),
    notes: z.string().trim().optional()
});

export const createInvoiceSchema = documentFieldsSchema.extend({
    type: z.enum(documentTypes),
    status: z.enum(documentStatuses).default('draft')
}).superRefine((data, context) => {
    if (data.expiryDate < data.issueDate) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['expiryDate'],
            message: 'Expiry date cannot be before issue date'
        });
    }

    if (data.type === 'quotation' && data.status === 'paid') {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['status'],
            message: 'A quotation cannot be marked as paid'
        });
    }
});

export const updateInvoiceSchema = documentFieldsSchema.partial().extend({
    status: z.enum(documentStatuses).optional()
});

export const updateInvoiceStatusSchema = z.object({
    status: z.enum(documentStatuses)
});

export const listInvoicesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().default(''),
    type: z.enum(documentTypes).optional(),
    status: z.enum(documentStatuses).optional(),
    sortBy: z.enum(['createdAt', 'issueDate', 'expiryDate', 'total']).default('issueDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type DocumentType = typeof documentTypes[number];
export type DocumentStatus = typeof documentStatuses[number];
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type ListInvoicesQueryInput = z.infer<typeof listInvoicesQuerySchema>;
