import { Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import { z } from 'zod';
import { AuthenticatedAdminRequest } from '../../types';
import { AppError, BadRequestError } from './product.errors';
import {
    createProductSchema,
    listProductsQuerySchema,
    updateProductSchema
} from './product.schemas';
import { ProductService } from './product.service';
import {
    parseCreateProductBody,
    parseUpdateProductBody
} from './product.request-parser';

export class ProductController {
    constructor(private readonly productService: ProductService) { }

    create = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = createProductSchema.parse(parseCreateProductBody(req.body));
            const uploadedImages = await this.productService.saveProductImages(req.files, req.body);
            const product = await this.productService.createProduct(input, uploadedImages);

            res.status(201).json({
                message: 'Product created successfully',
                data: { product }
            });
        } catch (error) {
            this.handleError(error, res, 'Product creation error:');
        }
    };

    update = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = updateProductSchema.parse(parseUpdateProductBody(req.body));
            const uploadedImages = await this.productService.saveProductImages(req.files, req.body);
            const product = await this.productService.updateProduct(
                Number(req.params.productId),
                input,
                uploadedImages
            );

            res.json({
                message: 'Product updated successfully',
                data: { product }
            });
        } catch (error) {
            this.handleError(error, res, 'Product update error:');
        }
    };

    list = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = listProductsQuerySchema.parse(req.query);
            const data = await this.productService.listProducts(input);

            res.json({
                message: 'Products retrieved successfully',
                data
            });
        } catch (error) {
            this.handleError(error, res, 'Get products error:');
        }
    };

    getById = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const product = await this.productService.getProduct(Number(req.params.productId));

            res.json({
                message: 'Product retrieved successfully',
                data: product
            });
        } catch (error) {
            this.handleError(error, res, 'Get product error:');
        }
    };

    stats = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const data = await this.productService.getStats();

            res.json({
                message: 'Product statistics retrieved successfully',
                data
            });
        } catch (error) {
            this.handleError(error, res, 'Get product statistics error:');
        }
    };

    bulkUpload = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            if (!req.files || !req.files.csvFile) {
                throw new BadRequestError('CSV file is required');
            }

            const data = await this.productService.bulkUpload(req.files.csvFile as UploadedFile);

            res.status(201).json({
                message: 'Bulk upload completed',
                data
            });
        } catch (error) {
            this.handleError(error, res, 'Bulk upload error:');
        }
    };

    private handleError(error: unknown, res: Response, logMessage: string) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                message: 'Validation error',
                errors: error.errors
            });
            return;
        }

        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                message: error.message,
                data: error.data
            });
            return;
        }

        console.error(logMessage, error);
        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
    }
}