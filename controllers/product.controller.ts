import express from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import adminAuthMiddleware from '../middlewares/auth.middleware';
import { AuthenticatedAdminRequest } from '../types';
import path from 'path';
import { ensureUploadDir, generateUniqueFilename } from '../utils/file';
import { UploadedFile } from 'express-fileupload';
import fs from 'fs';

const router = express.Router();

router.post('/add-products', adminAuthMiddleware('admin'), async (req: AuthenticatedAdminRequest, res) => {
    try {
        const schema = z.object({
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
            features: req.body.features,
            specifications: req.body.specifications,
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

        // Handle file uploads using express-fileupload
        const uploadedImages: Array<{ url: string; altText?: string; isPrimary: boolean }> = [];

        if (req.files && req.files.images) {
            const uploadDir = ensureUploadDir();

            // express-fileupload provides files in req.files
            const images = req.files.images;
            const fileArray: UploadedFile[] = Array.isArray(images) ? images : [images];

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

                // Use express-fileupload's mv() method to move the uploaded file
                await file.mv(filePath);

                uploadedImages.push({
                    url: `/uploads/products/${uniqueFilename}`,
                    altText: altTexts[i] || undefined,
                    isPrimary: primaryFlags[i] === true || primaryFlags[i] === 'true' || false
                });
            }
        }

        // Combine uploaded images and image links
        const allImages = [...uploadedImages, ...validatedData.imageLinks];

        if (allImages.length === 0) {
            res.status(400).json({
                message: 'At least one product image is required (upload or link)',
                data: null
            });
            return;
        }

        // Ensure at least one image is marked as primary
        const hasPrimary = allImages.some(img => img.isPrimary);
        if (!hasPrimary && allImages.length > 0) {
            allImages[0].isPrimary = true;
        }

        // Create product with images
        const product = await prisma.product.create({
            data: {
                sku: validatedData.sku,
                name: validatedData.name,
                description: validatedData.description,
                price: validatedData.price,
                originalPrice: validatedData.originalPrice,
                costPrice: validatedData.costPrice,
                features: validatedData.features || '',
                specifications: validatedData.specifications || '',
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


router.patch('/edit-product/:productId', adminAuthMiddleware('admin'), async (req: AuthenticatedAdminRequest, res) => {
    try {
        const { productId } = req.params;
        const productIdNum = parseInt(productId);

        if (!productId || isNaN(productIdNum)) {
            res.status(400).json({
                message: 'Product ID is required and must be a number',
                data: null
            });
            return;
        }

        const schema = z.object({
            sku: z.string().min(1, 'SKU is required').optional(),
            name: z.string().min(1, 'Product name is required').optional(),
            description: z.string().optional(),
            price: z.number().positive('Price must be positive').optional(),
            originalPrice: z.number().positive('Original price must be positive').optional(),
            costPrice: z.number().positive('Cost price must be positive').optional(),
            features: z.string().optional(),
            specifications: z.string().optional(),
            categoryId: z.number().int('Category ID must be an integer').optional(),
            stock: z.number().int().nonnegative('Stock must be non-negative').optional(),
            isActive: z.boolean().optional(),
            isNew: z.boolean().optional(),
            isFeatured: z.boolean().optional(),
            imageLinks: z.array(z.object({
                url: z.string().url('Invalid URL'),
                altText: z.string().optional(),
                isPrimary: z.boolean().optional().default(false)
            })).optional(),
            deleteImageIds: z.array(z.number().int()).optional()
        });

        const bodyData: any = { ...req.body };

        if (bodyData.price) bodyData.price = parseFloat(bodyData.price);
        if (bodyData.originalPrice) bodyData.originalPrice = parseFloat(bodyData.originalPrice);
        if (bodyData.costPrice) bodyData.costPrice = parseFloat(bodyData.costPrice);
        if (bodyData.categoryId) bodyData.categoryId = parseInt(bodyData.categoryId);
        if (bodyData.stock) bodyData.stock = parseInt(bodyData.stock);
        if (bodyData.isActive !== undefined) bodyData.isActive = bodyData.isActive === 'true' || bodyData.isActive === true;
        if (bodyData.isNew !== undefined) bodyData.isNew = bodyData.isNew === 'true' || bodyData.isNew === true;
        if (bodyData.isFeatured !== undefined) bodyData.isFeatured = bodyData.isFeatured === 'true' || bodyData.isFeatured === true;

        if (bodyData.imageLinks) {
            bodyData.imageLinks = typeof bodyData.imageLinks === 'string' ? JSON.parse(bodyData.imageLinks) : bodyData.imageLinks;
        }
        if (bodyData.deleteImageIds) {
            bodyData.deleteImageIds = typeof bodyData.deleteImageIds === 'string' ? JSON.parse(bodyData.deleteImageIds) : bodyData.deleteImageIds;
        }

        const validatedData = schema.parse(bodyData);

        const existingProduct = await prisma.product.findUnique({
            where: { id: productIdNum },
            include: { images: true }
        });

        if (!existingProduct) {
            res.status(404).json({
                message: 'Product not found',
                data: null
            });
            return;
        }

        if (validatedData.sku && validatedData.sku !== existingProduct.sku) {
            const skuExists = await prisma.product.findUnique({
                where: { sku: validatedData.sku }
            });

            if (skuExists) {
                res.status(409).json({
                    message: 'SKU is already taken by another product',
                    data: null
                });
                return;
            }
        }

        if (validatedData.categoryId) {
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
                    message: 'Cannot assign product to inactive category',
                    data: null
                });
                return;
            }
        }

        if (validatedData.deleteImageIds && validatedData.deleteImageIds.length > 0) {

            const imagesToDelete = await prisma.productImage.findMany({
                where: {
                    id: { in: validatedData.deleteImageIds },
                    productId: productIdNum
                }
            });

            for (const image of imagesToDelete) {
                if (image.url.startsWith('/uploads/')) {
                    const filePath = path.join(__dirname, '..', image.url);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            }

            await prisma.productImage.deleteMany({
                where: {
                    id: { in: validatedData.deleteImageIds },
                    productId: productIdNum
                }
            });

        }

        const uploadedImages: Array<{ url: string; altText?: string; isPrimary: boolean }> = [];

        if (req.files && req.files.images) {
            const uploadDir = ensureUploadDir();
            const images = req.files.images;
            const fileArray: UploadedFile[] = Array.isArray(images) ? images : [images];

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

        const updateData: any = {};
        if (validatedData.sku !== undefined) updateData.sku = validatedData.sku;
        if (validatedData.name !== undefined) updateData.name = validatedData.name;
        if (validatedData.description !== undefined) updateData.description = validatedData.description;
        if (validatedData.price !== undefined) updateData.price = validatedData.price;
        if (validatedData.originalPrice !== undefined) updateData.originalPrice = validatedData.originalPrice;
        if (validatedData.costPrice !== undefined) updateData.costPrice = validatedData.costPrice;
        if (validatedData.features !== undefined) updateData.features = validatedData.features;
        if (validatedData.specifications !== undefined) updateData.specifications = validatedData.specifications;
        if (validatedData.categoryId !== undefined) updateData.categoryId = validatedData.categoryId;
        if (validatedData.stock !== undefined) updateData.stock = validatedData.stock;
        if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
        if (validatedData.isNew !== undefined) updateData.isNew = validatedData.isNew;
        if (validatedData.isFeatured !== undefined) updateData.isFeatured = validatedData.isFeatured;

        const newImages = [...uploadedImages];
        if (validatedData.imageLinks) {
            newImages.push(...validatedData.imageLinks);
        }

        if (newImages.length > 0) {
            updateData.images = {
                create: newImages.map(img => ({
                    url: img.url,
                    altText: img.altText,
                    isPrimary: img.isPrimary
                }))
            };
        }

        const product = await prisma.product.update({
            where: { id: productIdNum },
            data: updateData,
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

        if (product.images.length > 0) {
            const hasPrimary = product.images.some(img => img.isPrimary);
            if (!hasPrimary) {
                await prisma.productImage.update({
                    where: { id: product.images[0].id },
                    data: { isPrimary: true }
                });
            }
        }

        res.json({
            message: 'Product updated successfully',
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

        console.error('Product update error:', error);
        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }
});


router.get('/get-products', adminAuthMiddleware('moderator'), async (req: AuthenticatedAdminRequest, res) => {
    try {

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string || '';
        const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
        const isActive = req.query.isActive as string;
        const isNew = req.query.isNew as string;
        const isFeatured = req.query.isFeatured as string;
        const sortBy = req.query.sortBy as string || 'createdAt';
        const sortOrder = req.query.sortOrder as string || 'desc';
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;

        if (page < 1 || limit < 1 || limit > 100) {
            res.status(400).json({
                message: 'Invalid pagination parameters. Page must be >= 1 and limit between 1-100',
                data: null
            });
            return;
        }

        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, lte: 'insensitive' } },
                { description: { contains: search, lte: 'insensitive' } },
                { sku: { contains: search, lte: 'insensitive' } }
            ];
        }

        if (categoryId !== undefined) {
            where.categoryId = categoryId;
        }

        if (isActive !== undefined && (isActive === 'true' || isActive === 'false')) {
            where.isActive = isActive === 'true';
        }

        if (isNew !== undefined && (isNew === 'true' || isNew === 'false')) {
            where.isNew = isNew === 'true';
        }

        if (isFeatured !== undefined && (isFeatured === 'true' || isFeatured === 'false')) {
            where.isFeatured = isFeatured === 'true';
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {};
            if (minPrice !== undefined) where.price.gte = minPrice;
            if (maxPrice !== undefined) where.price.lte = maxPrice;
        }

        const validSortFields = ['createdAt', 'price', 'name', 'stock'];
        const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const orderByDirection = sortOrder === 'asc' ? 'asc' : 'desc';

        const totalCount = await prisma.product.count({ where });

        const products = await prisma.product.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                [orderByField]: orderByDirection
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true
                    }
                },
                images: {
                    orderBy: {
                        isPrimary: 'desc'
                    }
                }
            }
        });

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            message: 'Products retrieved successfully',
            data: {
                products,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });
        return;

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }
});


router.get('/get-product/:productId', adminAuthMiddleware('moderator'), async (req: AuthenticatedAdminRequest, res) => {
    try {
        const { productId } = req.params;
        const productIdNum = parseInt(productId);

        if (!productId || isNaN(productIdNum)) {
            res.status(400).json({
                message: 'Product ID is required and must be a number',
                data: null
            });
            return;
        }

        const product = await prisma.product.findUnique({
            where: { id: productIdNum },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true
                    }
                },
                images: {
                    orderBy: {
                        isPrimary: 'desc'
                    }
                }
            }
        });

        if (!product) {
            res.status(404).json({
                message: 'Product not found',
                data: null
            });
            return;
        }

        res.json({
            message: 'Product retrieved successfully',
            data: product
        });
        return;

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }

});


router.get('/get-stats', adminAuthMiddleware('moderator'), async (req: AuthenticatedAdminRequest, res) => {
    try {
        const totalProducts = await prisma.product.count();
        const lowStockProducts = await prisma.product.count({ where: { stock: { lte: 5 } } });
        const outOfStockProducts = await prisma.product.count({ where: { stock: 0 } });
        const totalCategories = await prisma.category.count();

        res.json({
            message: 'Product statistics retrieved successfully',
            data: {
                totalProducts,
                lowStockProducts,
                outOfStockProducts,
                totalCategories
            }
        });

        return;

    } catch (error) {
        console.error('Get product statistics error:', error);
        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }
});


router.post('/bulk-upload', adminAuthMiddleware('admin'), async (req: AuthenticatedAdminRequest, res) => {
    try {

        if (!req.files || !req.files.csvFile) {
            res.status(400).json({
                message: 'CSV file is required',
                data: null
            });
            return;
        }

        const csvFile = req.files.csvFile as UploadedFile;

        if (csvFile.mimetype !== 'text/csv' && !csvFile.name.endsWith('.csv')) {
            res.status(400).json({
                message: 'Invalid file type. Only CSV files are allowed',
                data: null
            });
            return;
        }

        const csvContent = csvFile.data.toString('utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            res.status(400).json({
                message: 'CSV file is empty or contains only headers',
                data: null
            });
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        const requiredHeaders = ['sku', 'name', 'price', 'originalPrice', 'costPrice', 'categoryId', 'stock'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
            res.status(400).json({
                message: `Missing required CSV headers: ${missingHeaders.join(', ')}`,
                data: null
            });
            return;
        }

        const results = {
            successful: [] as any[],
            failed: [] as any[]
        };

        for (let i = 1; i < lines.length; i++) {
            try {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const rowData: any = {};

                headers.forEach((header, index) => {
                    rowData[header] = values[index];
                });

                const productData = {
                    sku: rowData.sku,
                    name: rowData.name,
                    description: rowData.description || undefined,
                    price: parseFloat(rowData.price),
                    originalPrice: parseFloat(rowData.originalPrice),
                    costPrice: parseFloat(rowData.costPrice),
                    features: rowData.features || '',
                    specifications: rowData.specifications || '',
                    categoryId: parseInt(rowData.categoryId),
                    stock: parseInt(rowData.stock),
                    isActive: rowData.isActive === 'true' || rowData.isActive === '1' || true,
                    isNew: rowData.isNew === 'true' || rowData.isNew === '1' || true,
                    isFeatured: rowData.isFeatured === 'true' || rowData.isFeatured === '1' || false,
                    imageUrls: rowData.imageUrls || ''
                };

                if (!productData.sku || !productData.name) {
                    results.failed.push({
                        row: i + 1,
                        sku: rowData.sku,
                        error: 'Missing required fields: sku or name'
                    });
                    continue;
                }

                if (isNaN(productData.price) || isNaN(productData.originalPrice) || isNaN(productData.costPrice)) {
                    results.failed.push({
                        row: i + 1,
                        sku: rowData.sku,
                        error: 'Invalid price values'
                    });
                    continue;
                }

                const existingProduct = await prisma.product.findUnique({
                    where: { sku: productData.sku }
                });

                if (existingProduct) {
                    results.failed.push({
                        row: i + 1,
                        sku: productData.sku,
                        error: 'Product with this SKU already exists'
                    });
                    continue;
                }

                const category = await prisma.category.findUnique({
                    where: { id: productData.categoryId }
                });

                if (!category) {
                    results.failed.push({
                        row: i + 1,
                        sku: productData.sku,
                        error: 'Category not found'
                    });
                    continue;
                }

                if (!category.isActive) {
                    results.failed.push({
                        row: i + 1,
                        sku: productData.sku,
                        error: 'Category is not active'
                    });
                    continue;
                }

                const imageUrls: Array<{ url: string; altText?: string; isPrimary: boolean }> = [];

                if (productData.imageUrls && productData.imageUrls.trim()) {

                    const urlList = productData.imageUrls.split(/[|;]/).map((url: string) => url.trim()).filter((url: string) => url);

                    urlList.forEach((url: string, index: number) => {
                        try {
                            new URL(url);
                            imageUrls.push({
                                url: url,
                                altText: productData.name,
                                isPrimary: index === 0
                            });
                        } catch (error) {
                            console.warn(`Invalid URL in row ${i + 1}: ${url}`);
                        }
                    });
                }

                // Create product with image links
                const product = await prisma.product.create({
                    data: {
                        sku: productData.sku,
                        name: productData.name,
                        description: productData.description,
                        price: productData.price,
                        originalPrice: productData.originalPrice,
                        costPrice: productData.costPrice,
                        features: productData.features,
                        specifications: productData.specifications,
                        categoryId: productData.categoryId,
                        stock: productData.stock,
                        isActive: productData.isActive,
                        isNew: productData.isNew,
                        isFeatured: productData.isFeatured,
                        images: imageUrls.length > 0 ? {
                            create: imageUrls.map(img => ({
                                url: img.url,
                                altText: img.altText,
                                isPrimary: img.isPrimary
                            }))
                        } : undefined
                    },
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        images: true
                    }
                });

                results.successful.push({
                    row: i + 1,
                    sku: productData.sku,
                    name: productData.name,
                    productId: product.id,
                    imagesCount: imageUrls.length
                });

            } catch (error) {
                results.failed.push({
                    row: i + 1,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        res.status(201).json({
            message: 'Bulk upload completed',
            data: {
                summary: {
                    total: lines.length - 1,
                    successful: results.successful.length,
                    failed: results.failed.length
                },
                results
            }
        });
        return;

    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }
});


export default router;