import prisma from '../../config/prisma';
import { Prisma } from '../../generated/prisma/browser';

export class CategoryRepository {

    create = (data: Prisma.CategoryCreateInput) => {
        return prisma.category.create({ data });
    }

    update = (data: Prisma.CategoryUpdateInput, id: number) => {
        return prisma.category.update({ where: { id }, data });
    }

    findAll = () => {
        return prisma.category.findMany({
            where: { isActive: true, isSubCategory: false },
            include: {
                categorySubCategories: true
            }
        });
    }

    findById = (id: number) => {
        return prisma.category.findUnique({ where: { id } });
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
                where: { categoryId: id }
            });

            return tx.category.delete({ where: { id } });
        });
    }

    findProductsByCategoryId = (categoryId: number) => {
        return prisma.product.findMany({ where: { categoryId } });
    }

    addSubCategories = async (categoryId: number, subCategoryNames: string[]) => {
        await prisma.$transaction(
            subCategoryNames.map(subCategoryName =>
                prisma.categorySubCategory.upsert({
                    where: { name: subCategoryName },
                    update: { categoryId },
                    create: {
                        name: subCategoryName,
                        categoryId
                    }
                })
            )
        );

        return prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                categorySubCategories: true
            }
        });
    }

}