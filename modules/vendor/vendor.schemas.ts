import { z } from "zod";
import { listQuerySchema } from "../common/commonSchema";

export const createVendorSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    phone: z.string().min(1, { message: "Phone is required" }),
    address: z.string().min(1, { message: "Address is required" }),
    email: z.string().email({ message: "Invalid email address" }).min(1, { message: "Email is required" })
});

export const updateVendorSchema = createVendorSchema.partial();

export const listVendorsQuerySchema = listQuerySchema.extend({
    sortBy: z.enum(['name', 'email']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const vendorIdParamSchema = z.object({
    id: z.coerce.number().int().positive({ message: "Vendor ID must be a positive integer" })
});

export const vendorEmailParamSchema = z.object({
    email: z.string().email({ message: "Invalid email address" })
});

export const vendorPhoneParamSchema = z.object({
    phone: z.string().min(1, { message: "Phone is required" })
});


export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type ListVendorsQueryInput = z.infer<typeof listVendorsQuerySchema>;
export type VendorIdParamInput = z.infer<typeof vendorIdParamSchema>;
export type VendorEmailParamInput = z.infer<typeof vendorEmailParamSchema>;
export type VendorPhoneParamInput = z.infer<typeof vendorPhoneParamSchema>;