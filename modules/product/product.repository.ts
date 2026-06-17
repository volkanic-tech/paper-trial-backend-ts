import { Prisma } from '../../generated/prisma/client';
import prisma from '../../config/prisma';
import { CreateProductInput, ProductImageInput } from './product.schemas';

const productInclude = {
    category: {
        select: {
            id: true,
            name: true,
            isActive: true
        }
    },
    images: {
        orderBy: {
            isPrimary: 'desc' as const
        }
    }
} satisfies Prisma.ProductInclude;

const productCreateInclude = {
    category: {
        select: {
            id: true,
            name: true
        }
    },
    images: {
        orderBy: {
            isPrimary: 'desc' as const
        }
    }
} satisfies Prisma.ProductInclude;

export class ProductRepository {
    findById(id: number) {
        return prisma.product.findUnique({
            where: { id },
            include: { images: true }
        });
    }

    findDetailById(id: number) {
        return prisma.product.findUnique({
            where: { id },
            include: productInclude
        });
    }

    findBySku(sku: string) {
        return prisma.product.findUnique({ where: { sku } });
    }

    findCategoryById(id: number) {
        return prisma.category.findUnique({ where: { id } });
    }

    create(input: CreateProductInput, images: ProductImageInput[]) {
        return prisma.product.create({
            data: {
                sku: input.sku,
                name: input.name,
                description: input.description,
                price: input.price,
                originalPrice: input.originalPrice,
                costPrice: input.costPrice,
                features: input.features || '',
                specifications: input.specifications || '',
                categoryId: input.categoryId,
                stock: input.stock,
                isActive: input.isActive,
                isNew: input.isNew,
                isFeatured: input.isFeatured,
                images: {
                    create: images.map(img => ({
                        url: img.url,
                        altText: img.altText,
                        isPrimary: img.isPrimary
                    }))
                }
            },
            include: productCreateInclude
        });
    }

    update(id: number, data: Prisma.ProductUpdateInput) {
        return prisma.product.update({
            where: { id },
            data,
            include: productCreateInclude
        });
    }

    findImagesByIds(productId: number, imageIds: number[]) {
        return prisma.productImage.findMany({
            where: {
                id: { in: imageIds },
                productId
            }
        });
    }

    deleteImagesByIds(productId: number, imageIds: number[]) {
        return prisma.productImage.deleteMany({
            where: {
                id: { in: imageIds },
                productId
            }
        });
    }

    markImageAsPrimary(id: number) {
        return prisma.productImage.update({
            where: { id },
            data: { isPrimary: true }
        });
    }

    count(where?: Prisma.ProductWhereInput) {
        return prisma.product.count({ where });
    }

    countCategories() {
        return prisma.category.count();
    }

    findMany(
        where: Prisma.ProductWhereInput,
        skip: number,
        take: number,
        orderBy: Prisma.ProductOrderByWithRelationInput
    ) {
        return prisma.product.findMany({
            where,
            skip,
            take,
            orderBy,
            include: productInclude
        });
    }
}
