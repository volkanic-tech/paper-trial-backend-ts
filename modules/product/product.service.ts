import { FileArray, UploadedFile } from 'express-fileupload';
import { Prisma } from '../../generated/prisma/client';
import {
    CreateProductInput,
    ListProductsQueryInput,
    ProductImageInput,
    UpdateProductInput
} from './product.schemas';
import { BadRequestError, ConflictError, NotFoundError } from '../common/error';
import { ProductRepository } from './product.repository';
import { ProductUploadService } from './product-upload.service';

type BulkUploadResult = {
    successful: Array<{
        row: number;
        sku: string;
        name: string;
        productId: number;
        imagesCount: number;
    }>;
    failed: Array<{
        row: number;
        sku?: string;
        error: string;
    }>;
};

export class ProductService {
    constructor(
        private readonly products: ProductRepository,
        private readonly uploads: ProductUploadService
    ) { }

    async createProduct(input: CreateProductInput, uploadedImages: ProductImageInput[]) {
        const existingProduct = await this.products.findBySku(input.sku);

        if (existingProduct) {
            throw new ConflictError('Product with this SKU already exists');
        }

        await this.assertActiveCategory(input.categoryId, 'Cannot add product to inactive category');

        const allImages = this.ensurePrimaryImage([...uploadedImages, ...input.imageLinks]);

        if (allImages.length === 0) {
            throw new BadRequestError('At least one product image is required (upload or link)');
        }

        return this.products.create(input, allImages);
    }

    async updateProduct(productId: number, input: UpdateProductInput, uploadedImages: ProductImageInput[]) {
        this.validateProductId(productId);

        const existingProduct = await this.products.findById(productId);

        if (!existingProduct) {
            throw new NotFoundError('Product not found');
        }

        if (input.sku && input.sku !== existingProduct.sku) {
            const skuExists = await this.products.findBySku(input.sku);

            if (skuExists) {
                throw new ConflictError('SKU is already taken by another product');
            }
        }

        if (input.categoryId) {
            await this.assertActiveCategory(input.categoryId, 'Cannot assign product to inactive category');
        }

        if (input.deleteImageIds && input.deleteImageIds.length > 0) {
            await this.deleteProductImages(productId, input.deleteImageIds);
        }

        const updateData = this.buildUpdateData(input, uploadedImages);
        const product = await this.products.update(productId, updateData);

        if (product.images.length > 0 && !product.images.some(img => img.isPrimary)) {
            await this.products.markImageAsPrimary(product.images[0].id);
        }

        return product;
    }

    async listProducts(input: ListProductsQueryInput) {
        const skip = (input.page - 1) * input.limit;
        const where = this.buildProductWhere(input);
        const orderBy = { [input.sortBy]: input.sortOrder } as Prisma.ProductOrderByWithRelationInput;

        const totalCount = await this.products.count(where);
        const products = await this.products.findMany(where, skip, input.limit, orderBy);
        const totalPages = Math.ceil(totalCount / input.limit);

        return {
            products,
            pagination: {
                currentPage: input.page,
                totalPages,
                totalCount,
                limit: input.limit,
                hasNextPage: input.page < totalPages,
                hasPreviousPage: input.page > 1
            }
        };
    }

    async getProduct(productId: number) {
        this.validateProductId(productId);

        const product = await this.products.findDetailById(productId);

        if (!product) {
            throw new NotFoundError('Product not found');
        }

        return product;
    }

    async getStats() {
        const totalProducts = await this.products.count();
        const lowStockProducts = await this.products.count({ stock: { lte: 5 } });
        const outOfStockProducts = await this.products.count({ stock: 0 });
        const totalCategories = await this.products.countCategories();

        return {
            totalProducts,
            lowStockProducts,
            outOfStockProducts,
            totalCategories
        };
    }

    async bulkUpload(file: UploadedFile) {
        if (file.mimetype !== 'text/csv' && !file.name.endsWith('.csv')) {
            throw new BadRequestError('Invalid file type. Only CSV files are allowed');
        }

        const csvContent = file.data.toString('utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            throw new BadRequestError('CSV file is empty or contains only headers');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const requiredHeaders = ['sku', 'name', 'price', 'originalPrice', 'costPrice', 'categoryId', 'stock'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
            throw new BadRequestError(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
        }

        const results: BulkUploadResult = {
            successful: [],
            failed: []
        };

        for (let i = 1; i < lines.length; i++) {
            await this.importCsvLine(lines[i], headers, i + 1, results);
        }

        return {
            summary: {
                total: lines.length - 1,
                successful: results.successful.length,
                failed: results.failed.length
            },
            results
        };
    }

    async saveProductImages(files: FileArray | null | undefined, body: Record<string, unknown>) {
        return this.uploads.saveProductImages(files, body);
    }

    private async assertActiveCategory(categoryId: number, inactiveMessage: string) {
        const category = await this.products.findCategoryById(categoryId);

        if (!category) {
            throw new NotFoundError('Category not found');
        }

        if (!category.isActive) {
            throw new BadRequestError(inactiveMessage);
        }
    }

    private async deleteProductImages(productId: number, imageIds: number[]) {
        const imagesToDelete = await this.products.findImagesByIds(productId, imageIds);

        for (const image of imagesToDelete) {
            this.uploads.deleteUploadedImage(image.url);
        }

        await this.products.deleteImagesByIds(productId, imageIds);
    }

    private buildUpdateData(input: UpdateProductInput, uploadedImages: ProductImageInput[]) {
        const updateData: Prisma.ProductUpdateInput = {};

        if (input.sku !== undefined) updateData.sku = input.sku;
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.price !== undefined) updateData.price = input.price;
        if (input.originalPrice !== undefined) updateData.originalPrice = input.originalPrice;
        if (input.costPrice !== undefined) updateData.costPrice = input.costPrice;
        if (input.features !== undefined) updateData.features = input.features;
        if (input.specifications !== undefined) updateData.specifications = input.specifications;
        if (input.categoryId !== undefined) updateData.category = { connect: { id: input.categoryId } };
        if (input.stock !== undefined) updateData.stock = input.stock;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.isNew !== undefined) updateData.isNew = input.isNew;
        if (input.isFeatured !== undefined) updateData.isFeatured = input.isFeatured;

        const newImages = [...uploadedImages, ...(input.imageLinks || [])];

        if (newImages.length > 0) {
            updateData.images = {
                create: newImages.map(img => ({
                    url: img.url,
                    altText: img.altText,
                    isPrimary: img.isPrimary
                }))
            };
        }

        return updateData;
    }

    private buildProductWhere(input: ListProductsQueryInput) {
        const where: Prisma.ProductWhereInput = {};

        if (input.search) {
            where.OR = [
                { name: { contains: input.search } },
                { description: { contains: input.search } },
                { sku: { contains: input.search } }
            ];
        }

        if (input.categoryId !== undefined) where.categoryId = input.categoryId;
        if (input.isActive !== undefined) where.isActive = input.isActive === 'true';
        if (input.isNew !== undefined) where.isNew = input.isNew === 'true';
        if (input.isFeatured !== undefined) where.isFeatured = input.isFeatured === 'true';

        if (input.minPrice !== undefined || input.maxPrice !== undefined) {
            where.price = {};
            if (input.minPrice !== undefined) where.price.gte = input.minPrice;
            if (input.maxPrice !== undefined) where.price.lte = input.maxPrice;
        }

        return where;
    }

    private async importCsvLine(
        line: string,
        headers: string[],
        row: number,
        results: BulkUploadResult
    ) {
        try {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const rowData: Record<string, string | undefined> = {};

            headers.forEach((header, index) => {
                rowData[header] = values[index];
            });

            const productData = {
                sku: rowData.sku || '',
                name: rowData.name || '',
                description: rowData.description || undefined,
                price: Number.parseFloat(rowData.price || ''),
                originalPrice: Number.parseFloat(rowData.originalPrice || ''),
                costPrice: Number.parseFloat(rowData.costPrice || ''),
                features: rowData.features || '',
                specifications: rowData.specifications || '',
                categoryId: Number.parseInt(rowData.categoryId || '', 10),
                stock: Number.parseInt(rowData.stock || '', 10),
                isActive: rowData.isActive === undefined || rowData.isActive === 'true' || rowData.isActive === '1',
                isNew: rowData.isNew === undefined || rowData.isNew === 'true' || rowData.isNew === '1',
                isFeatured: rowData.isFeatured === 'true' || rowData.isFeatured === '1',
                imageLinks: [],
                imageUrls: rowData.imageUrls || ''
            };

            if (!productData.sku || !productData.name) {
                results.failed.push({ row, sku: rowData.sku, error: 'Missing required fields: sku or name' });
                return;
            }

            if (Number.isNaN(productData.price) || Number.isNaN(productData.originalPrice) || Number.isNaN(productData.costPrice)) {
                results.failed.push({ row, sku: rowData.sku, error: 'Invalid price values' });
                return;
            }

            const existingProduct = await this.products.findBySku(productData.sku);

            if (existingProduct) {
                results.failed.push({ row, sku: productData.sku, error: 'Product with this SKU already exists' });
                return;
            }

            const category = await this.products.findCategoryById(productData.categoryId);

            if (!category) {
                results.failed.push({ row, sku: productData.sku, error: 'Category not found' });
                return;
            }

            if (!category.isActive) {
                results.failed.push({ row, sku: productData.sku, error: 'Category is not active' });
                return;
            }

            const imageUrls = this.parseImageUrls(productData.imageUrls, productData.name);
            const product = await this.products.create(productData, imageUrls);

            results.successful.push({
                row,
                sku: productData.sku,
                name: productData.name,
                productId: product.id,
                imagesCount: imageUrls.length
            });
        } catch (error) {
            results.failed.push({
                row,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private parseImageUrls(imageUrls: string, productName: string) {
        const images: ProductImageInput[] = [];

        if (!imageUrls.trim()) {
            return images;
        }

        const urlList = imageUrls.split(/[|;]/).map(url => url.trim()).filter(Boolean);

        urlList.forEach((url, index) => {
            try {
                new URL(url);
                images.push({
                    url,
                    altText: productName,
                    isPrimary: index === 0
                });
            } catch (error) {
                console.warn(`Invalid URL in CSV import: ${url}`);
            }
        });

        return images;
    }

    private ensurePrimaryImage(images: ProductImageInput[]) {
        if (images.length > 0 && !images.some(img => img.isPrimary)) {
            images[0].isPrimary = true;
        }

        return images;
    }

    private validateProductId(productId: number) {
        if (!productId || Number.isNaN(productId)) {
            throw new BadRequestError('Product ID is required and must be a number');
        }
    }
}
