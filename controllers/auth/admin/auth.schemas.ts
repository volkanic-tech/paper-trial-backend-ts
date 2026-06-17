import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

export const registerAdminSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required'),
    address: z.string().min(1, 'Address is required'),
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    role: z.enum(['admin', 'moderator']).default('admin')
});

export const editAdminSchema = z.object({
    email: z.string().email('Invalid email format').optional(),
    name: z.string().min(1, 'Name cannot be empty').optional(),
    address: z.string().min(1, 'Address cannot be empty').optional(),
    phone: z.string().min(10, 'Phone number must be at least 10 characters').optional(),
    role: z.enum(['admin', 'moderator']).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional()
});

export const listAdminsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().default(''),
    role: z.enum(['admin', 'moderator']).optional(),
    isActive: z.enum(['true', 'false']).optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterAdminInput = z.infer<typeof registerAdminSchema>;
export type EditAdminInput = z.infer<typeof editAdminSchema>;
export type ListAdminsQueryInput = z.infer<typeof listAdminsQuerySchema>;
