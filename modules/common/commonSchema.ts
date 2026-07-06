import { z } from "zod";

export const listQuerySchema = z.object({
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    sortBy: z.string().default('createdAt'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().default(''),
});