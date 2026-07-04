import express from 'express';
import adminAuthMiddleware from '../../middlewares/auth.middleware';
import { CategoryController } from './category.controller';
import { CategoryRepository } from './category.repository';
import { CategoryService } from './category.service';

const router = express.Router();

const categoryController = new CategoryController(
    new CategoryService(
        new CategoryRepository()
    )
)

router.route('/')
    .post(adminAuthMiddleware("admin"), categoryController.createCategory)
    .get(adminAuthMiddleware("admin"), categoryController.findAllCategories);

router.route('/:id')
    .get(adminAuthMiddleware("admin"), categoryController.findCategoryById)
    .patch(adminAuthMiddleware("admin"), categoryController.updateCategory)
    .delete(adminAuthMiddleware("admin"), categoryController.deleteCategory);

router.route('/:id/subcategories')
    .post(adminAuthMiddleware("admin"), categoryController.addSubCategoryToCategory);

router.route('/:id/products')
    .get(adminAuthMiddleware("admin"), categoryController.findProductsByCategoryId);

export default router;