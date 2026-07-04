import { ConflictError, NotFoundError } from "../common/error";
import { CategoryRepository } from "./category.repository";
import { AddSubCategoryToCategoryInput, CreateCategoryInput, UpdateCategoryInput } from "./category.schema";

export class CategoryService {

    constructor(private readonly categoryRepository: CategoryRepository) { }

    getCategoryById = (id: number) => {
        return this.categoryRepository.findById(id);
    }

    getAllCategories = () => {
        return this.categoryRepository.findAll();
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

    addSubCategoryToCategory = async (subCategories: AddSubCategoryToCategoryInput) => {
        const category = await this.categoryRepository.findById(subCategories.categoryId);
        if (!category) {
            throw new NotFoundError(`Category with ID ${subCategories.categoryId} not found`);
        }

        for (const subCategoryId of subCategories.subCategoryIds) {
            const subCategory = await this.categoryRepository.findById(subCategoryId);
            if (!subCategory) {
                throw new NotFoundError(`Sub-category with ID ${subCategoryId} not found`);
            }
        }

        return this.categoryRepository.addSubCategories(subCategories.categoryId, subCategories.subCategoryIds);
    }

    deleteCategory = async (id: number) => {
        const existingCategory = await this.categoryRepository.findById(id);
        if (!existingCategory) {
            throw new NotFoundError(`Category with ID ${id} not found`);
        }
        return this.categoryRepository.delete(id);
    }
}