import z from "zod";

export const invoiceItemSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    basePrice: z.number(),
    price: z.number(),
    quantity: z.number().int(),
    subtotal: z.number(),
});

export const createInvoiceSchema = z.object({
    quotationId: z.number().int().optional(),
    customerName: z.string().min(1, 'Customer name is required'),
    customerEmail: z.string().email('Invalid email address').optional(),
    customerPhone: z.string().optional(),
    customerAddress: z.string().optional(),
    issueDate: z.coerce.date(),
    expiryDate: z.coerce.date(),
    items: z.array(invoiceItemSchema),
});