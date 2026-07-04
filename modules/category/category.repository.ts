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

    findByName = (name: string) => {
        return prisma.category.findUnique({ where: { name } });
    }

    delete = (id: number) => {
        return prisma.category.delete({ where: { id } });
    }

    findProductsByCategoryId = (categoryId: number) => {
        return prisma.product.findMany({ where: { categoryId } });
    }

    addSubCategories = (categoryId: number, subCategoryIds: number[]) => {
        return prisma.category.update({
            where: { id: categoryId },
            data: {
                categorySubCategories: {
                    connect: subCategoryIds.map(subCategoryId => ({ id: subCategoryId }))
                }
            }
        });
    }

}