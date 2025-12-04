import express from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import adminAuthMiddleware from '../middlewares/auth.middleware';
import { AuthenticatedAdminRequest } from '../types';
import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { ensureUploadDir, generateUniqueFilename } from '../utils/file';

const router = express.Router();

router.post('/products', adminAuthMiddleware('admin'), async (req: AuthenticatedAdminRequest, res) => {
    try {
        const schema = z.object({
            sku: z.string().min(1, 'SKU is required'),
            name: z.string().min(1, 'Product name is required'),
            description: z.string().optional(),
            price: z.number().positive('Price must be positive'),
            originalPrice: z.number().positive('Original price must be positive'),
            costPrice: z.number().positive('Cost price must be positive'),
            features: z.record(z.any()).or(z.array(z.any())),
            specifications: z.record(z.any()).or(z.array(z.any())),
            categoryId: z.number().int('Category ID must be an integer'),
            stock: z.number().int().nonnegative('Stock must be non-negative'),
            isActive: z.boolean().optional().default(true),
            isNew: z.boolean().optional().default(true),
            isFeatured: z.boolean().optional().default(false),
            imageLinks: z.array(z.object({
                url: z.string().url('Invalid URL'),
                altText: z.string().optional(),
                isPrimary: z.boolean().optional().default(false)
            })).optional().default([])
        });

        const bodyData = {
            ...req.body,
            price: parseFloat(req.body.price),
            originalPrice: parseFloat(req.body.originalPrice),
            costPrice: parseFloat(req.body.costPrice),
            categoryId: parseInt(req.body.categoryId),
            stock: parseInt(req.body.stock),
            isActive: req.body.isActive === 'true' || req.body.isActive === true,
            isNew: req.body.isNew === 'true' || req.body.isNew === true,
            isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
            features: typeof req.body.features === 'string' ? JSON.parse(req.body.features) : req.body.features,
            specifications: typeof req.body.specifications === 'string' ? JSON.parse(req.body.specifications) : req.body.specifications,
            imageLinks: req.body.imageLinks ? (typeof req.body.imageLinks === 'string' ? JSON.parse(req.body.imageLinks) : req.body.imageLinks) : []
        };

        const validatedData = schema.parse(bodyData);

        const existingProduct = await prisma.product.findUnique({
            where: { sku: validatedData.sku }
        });

        if (existingProduct) {
            res.status(409).json({
                message: 'Product with this SKU already exists',
                data: null
            });
            return;
        }

        const category = await prisma.category.findUnique({
            where: { id: validatedData.categoryId }
        });

        if (!category) {
            res.status(404).json({
                message: 'Category not found',
                data: null
            });
            return;
        }

        if (!category.isActive) {
            res.status(400).json({
                message: 'Cannot add product to inactive category',
                data: null
            });
            return;
        }

        const uploadedImages: Array<{ url: string; altText?: string; isPrimary: boolean }> = [];
        
        if (req.files) {
            const uploadDir = ensureUploadDir();
            const files = req.files.images;
            const fileArray = Array.isArray(files) ? files : [files];

            const altTexts = req.body.altTexts ? (typeof req.body.altTexts === 'string' ? JSON.parse(req.body.altTexts) : req.body.altTexts) : [];
            const primaryFlags = req.body.primaryFlags ? (typeof req.body.primaryFlags === 'string' ? JSON.parse(req.body.primaryFlags) : req.body.primaryFlags) : [];

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            const maxSize = 5 * 1024 * 1024;

            for (let i = 0; i < fileArray.length; i++) {
                const file = fileArray[i];

                if (!allowedTypes.includes(file.mimetype)) {
                    res.status(400).json({
                        message: `Invalid file type: ${file.name}. Allowed types: jpeg, jpg, png, webp, gif`,
                        data: null
                    });
                    return;
                }

                if (file.size > maxSize) {
                    res.status(400).json({
                        message: `File too large: ${file.name}. Maximum size: 5MB`,
                        data: null
                    });
                    return;
                }

                const uniqueFilename = generateUniqueFilename(file.name);
                const filePath = path.join(uploadDir, uniqueFilename);

                await file.mv(filePath);
                
                uploadedImages.push({
                    url: `/uploads/products/${uniqueFilename}`,
                    altText: altTexts[i] || undefined,
                    isPrimary: primaryFlags[i] === true || primaryFlags[i] === 'true' || false
                });
            }
        }

        const allImages = [...uploadedImages, ...validatedData.imageLinks];

        if (allImages.length === 0) {
            res.status(400).json({
                message: 'At least one product image is required (upload or link)',
                data: null
            });
            return;
        }

        const hasPrimary = allImages.some(img => img.isPrimary);
        if (!hasPrimary && allImages.length > 0) {
            allImages[0].isPrimary = true;
        }

        const product = await prisma.product.create({
            data: {
                sku: validatedData.sku,
                name: validatedData.name,
                description: validatedData.description,
                price: validatedData.price,
                originalPrice: validatedData.originalPrice,
                costPrice: validatedData.costPrice,
                features: validatedData.features,
                specifications: validatedData.specifications,
                categoryId: validatedData.categoryId,
                stock: validatedData.stock,
                isActive: validatedData.isActive,
                isNew: validatedData.isNew,
                isFeatured: validatedData.isFeatured,
                images: {
                    create: allImages.map(img => ({
                        url: img.url,
                        altText: img.altText,
                        isPrimary: img.isPrimary
                    }))
                }
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                images: {
                    orderBy: {
                        isPrimary: 'desc'
                    }
                }
            }
        });

        res.status(201).json({
            message: 'Product created successfully',
            data: {
                product
            }
        });
        return;

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                message: 'Validation error',
                errors: error.errors
            });
            return;
        }

        console.error('Product creation error:', error);
        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }
});

export default router;