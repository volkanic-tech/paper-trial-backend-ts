import { BadRequestError, ConflictError, NotFoundError } from "../common/error";
import { CategoryRepository } from "./category.repository";
import { CreateCategoryInput, ListCategoriesQueryInput, UpdateCategoryInput } from "./category.schema";

export class CategoryService {

    constructor(private readonly categoryRepository: CategoryRepository) { }

    getCategoryById = (id: number) => {
        return this.categoryRepository.findById(id);
    }

    getAllCategories = (input: ListCategoriesQueryInput) => {
        return this.categoryRepository.findAll(input);
    }

    getProductByCategoryId = (categoryId: number) => {
        return this.categoryRepository.findProductsByCategoryId(categoryId);
    }

    createCategory = async (data: CreateCategoryInput) => {
        const existingCategory = await this.categoryRepository.findByName(data.name);
        if (existingCategory) {
            throw new ConflictError(`Category with name ${data.name} already exists`);
        }
        return this.categoryRepository.create(data);
    }

    updateCategory = async (id: number, data: UpdateCategoryInput) => {
        const existingCategory = await this.categoryRepository.findById(id);
        if (!existingCategory) {
            throw new NotFoundError(`Category with ID ${id} not found`);
        }

        if (data.name) {
            const existingCategoryWithName = await this.categoryRepository.findByName(data.name);
            if (existingCategoryWithName && existingCategoryWithName.id !== id) {
                throw new ConflictError(`Category with name ${data.name} already exists`);
            }
        }

        return this.categoryRepository.update(data, id);
    }

    addSubCategoryToCategory = async (categoryId: number, subCategoryIds: number[]) => {
        const category = await this.categoryRepository.findById(categoryId);
        if (!category) {
            throw new NotFoundError(`Category with ID ${categoryId} not found`);
        }

        if (category.isSubCategory) {
            throw new BadRequestError(`Category with ID ${categoryId} cannot be used as a parent category`);
        }

        const uniqueSubCategoryIds = [...new Set(subCategoryIds)];

        const subCategoriesToAttach = await this.categoryRepository.findByIds(uniqueSubCategoryIds);

        for (const subCategoryId of uniqueSubCategoryIds) {
            const subCategory = subCategoriesToAttach.find(item => item.id === subCategoryId);
            if (!subCategory) {
                throw new NotFoundError(`Sub-category with ID ${subCategoryId} not found`);
            }

            if (!subCategory.isSubCategory) {
                throw new BadRequestError(`Category with ID ${subCategoryId} is not marked as a sub-category`);
            }

            if (subCategoryId === categoryId) {
                throw new BadRequestError(`Category with ID ${categoryId} cannot be added as its own sub-category`);
            }
        }

        return this.categoryRepository.addSubCategories(categoryId, uniqueSubCategoryIds);
    }

    deleteCategory = async (id: number) => {
        const existingCategory = await this.categoryRepository.findById(id);
        if (!existingCategory) {
            throw new NotFoundError(`Category with ID ${id} not found`);
        }
        return this.categoryRepository.delete(id);
    }
}