import { Response } from "express";
import { AuthenticatedAdminRequest } from "../../types";
import { CategoryService } from "./category.service";
import { handleError } from "../../utils/error-handler";
import { addSubCategoryToCategorySchema, createCategorySchema, listCategoriesQuerySchema, updateCategorySchema } from "./category.schema";


export class CategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    findAllCategories = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = listCategoriesQuerySchema.parse(req.query);
            const categories = await this.categoryService.getAllCategories(input);
            res.status(200).json(categories);
        } catch (error) {
            handleError(error, res, 'Error fetching categories:');
        }
    }

    findCategoryById = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const category = await this.categoryService.getCategoryById(Number(req.params.id));
            if (!category) {
                return res.status(404).json({ message: `Category with ID ${req.params.id} not found` });
            }
            res.status(200).json(category);
        } catch (error) {
            handleError(error, res, 'Error fetching category:');
        }

    }

    createCategory = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = createCategorySchema.parse(req.body);
            const category = await this.categoryService.createCategory(input);
            res.status(201).json(category);
        } catch (error) {
            handleError(error, res, 'Error creating category:');
        }
    }

    updateCategory = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = updateCategorySchema.parse(req.body);
            const category = await this.categoryService.updateCategory(Number(req.params.id), input);
            res.status(200).json(category);
        } catch (error) {
            handleError(error, res, 'Error updating category:');
        }

    }

    deleteCategory = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            await this.categoryService.deleteCategory(Number(req.params.id));
            res.status(200).json({ message: `Category with ID ${req.params.id} deleted successfully` });
        } catch (error) {
            handleError(error, res, 'Error deleting category:');
        }
    }

    addSubCategoryToCategory = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = addSubCategoryToCategorySchema.parse(req.body);
            const category = await this.categoryService.addSubCategoryToCategory(Number(req.params.id), input.subCategoryIds);
            res.status(200).json(category);
        } catch (error) {
            handleError(error, res, 'Error adding subcategory to category:');
        }
    }

    findProductsByCategoryId = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const products = await this.categoryService.getProductByCategoryId(Number(req.params.id));
            res.status(200).json(products);
        } catch (error) {
            handleError(error, res, 'Error fetching products for category:');
        }
    }

}