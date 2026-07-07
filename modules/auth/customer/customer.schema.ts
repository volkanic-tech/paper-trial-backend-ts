import { z } from 'zod';
import { listQuerySchema } from '../../common/commonSchema';

export const createUserSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    address: z.string().min(1, 'Address is required'),
    phone: z.string().min(1, 'Phone is required'),
    isActive: z.boolean(),
    isInternal: z.boolean()
});

export const loginUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long')
});

export const updateUserSchema = z.object({
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
    address: z.string().min(1, 'Address is required').optional(),
});

export const listUsersQuerySchema = listQuerySchema.extend({
    isActive: z.enum(['true', 'false']).optional(),
    isInternal: z.enum(['true', 'false']).optional()
});

export const changeUserActiveStatusSchema = z.object({
    email: z.string().email('Invalid email address'),
    isActive: z.boolean()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;
export type LoginUserSchemaInput = z.infer<typeof loginUserSchema>;
export type ChangeUserActiveStatusInput = z.infer<typeof changeUserActiveStatusSchema>;