import express from 'express';
import adminAuthMiddleware from '../../middlewares/auth.middleware';
import { ProductController } from './product.controller';
import { ProductRepository } from './product.repository';
import { ProductService } from './product.service';
import { ProductUploadService } from './product-upload.service';

const router = express.Router();

const productController = new ProductController(
    new ProductService(
        new ProductRepository(),
        new ProductUploadService()
    )
);

router
    .route('/add-products')
    .post(adminAuthMiddleware('admin'), productController.create);

router
    .route('/edit-product/:productId')
    .patch(adminAuthMiddleware('admin'), productController.update);

router
    .route('/get-products')
    .get(adminAuthMiddleware('moderator'), productController.list);

router
    .route('/get-product/:productId')
    .get(adminAuthMiddleware('moderator'), productController.getById);

router
    .route('/get-stats')
    .get(adminAuthMiddleware('moderator'), productController.stats);

router
    .route('/bulk-upload')
    .post(adminAuthMiddleware('admin'), productController.bulkUpload);

export default router;