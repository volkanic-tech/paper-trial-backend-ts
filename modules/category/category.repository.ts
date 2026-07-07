import prisma from '../../config/prisma';
import { Prisma } from '../../generated/prisma/browser';
import { ListCategoriesQueryInput } from './category.schema';

const categoryInclude = {
    categorySubCategories: {
        include: {
            subCategory: true
        }
    },
    subCategoryCategories: {
        include: {
            category: true
        }
    }
} as const;

export class CategoryRepository {

    create = (data: Prisma.CategoryCreateInput) => {
        return prisma.category.create({ data });
    }

    update = (data: Prisma.CategoryUpdateInput, id: number) => {
        return prisma.category.update({ where: { id }, data });
    }

    findAll = (input: ListCategoriesQueryInput) => {
        const where: Prisma.CategoryWhereInput = {};

        where.isActive = input.isActive ? input.isActive === 'true' : true;
        where.isSubCategory = input.isSubCategory ? input.isSubCategory === 'true' : false;

        if (input.search) {
            where.name = {
                contains: input.search,
                mode: 'insensitive'
            };
        }

        return prisma.category.findMany({
            where,
            orderBy: {
                [input.sortBy]: input.sortOrder
            },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            include: categoryInclude
        });
    }

    findById = (id: number) => {
        return prisma.category.findUnique({
            where: { id },
            include: categoryInclude
        });
    }

    findByIds = (ids: number[]) => {
        return prisma.category.findMany({
            where: {
                id: {
                    in: ids
                }
            }
        });
    }

    findByName = (name: string) => {
        return prisma.category.findUnique({ where: { name } });
    }

    delete = async (id: number) => {
        return prisma.$transaction(async (tx) => {
            await tx.categorySubCategory.deleteMany({
                where: {
                    OR: [
                        { categoryId: id },
                        { subCategoryId: id }
                    ]
                }
            });

            return tx.category.delete({ where: { id } });
        });
    }

    findProductsByCategoryId = (categoryId: number) => {
        return prisma.product.findMany({ where: { categoryId } });
    }

    addSubCategories = async (categoryId: number, subCategoryIds: number[]) => {
        await prisma.$transaction(
            subCategoryIds.map(subCategoryId =>
                prisma.categorySubCategory.upsert({
                    where: {
                        categoryId_subCategoryId: {
                            categoryId,
                            subCategoryId
                        }
                    },
                    update: {},
                    create: {
                        categoryId,
                        subCategoryId
                    }
                })
            )
        );

        return prisma.category.findUnique({
            where: { id: categoryId },
            include: categoryInclude
        });
    }

}