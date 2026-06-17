import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedAdminRequest } from '../../../types';
import { AppError } from './auth.errors';
import {
    editAdminSchema,
    listAdminsQuerySchema,
    loginSchema,
    registerAdminSchema
} from './auth.schemas';
import { AuthService } from './auth.service';

export class AdminAuthController {
    constructor(private readonly authService: AuthService) { }

    login = async (req: Request, res: Response) => {
        try {
            const input = loginSchema.parse(req.body);
            const data = await this.authService.login(input);

            res.json({
                message: 'Login successful',
                data
            });
        } catch (error) {
            this.handleError(error, res);
        }
    };

    register = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = registerAdminSchema.parse(req.body);
            const user = await this.authService.register(input);

            res.status(201).json({
                message: 'Admin registered successfully',
                data: { user }
            });
        } catch (error) {
            this.handleError(error, res);
        }
    };

    toggleActiveStatus = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const user = await this.authService.toggleActiveStatus(
                Number(req.params.adminId),
                req.user?.id
            );

            res.json({
                message: `Admin account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
                data: { user }
            });
        } catch (error) {
            this.handleError(error, res);
        }
    };

    me = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const user = await this.authService.getCurrentAdmin(req.user?.id);

            res.json({
                message: 'Current user retrieved successfully',
                data: { user }
            });
        } catch (error) {
            this.handleError(error, res);
        }
    };

    edit = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = editAdminSchema.parse(req.body);
            const user = await this.authService.updateAdmin(Number(req.params.adminId), input);

            res.json({
                message: 'Admin updated successfully',
                data: { user }
            });
        } catch (error) {
            this.handleError(error, res);
        }
    };

    all = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = listAdminsQuerySchema.parse(req.query);
            const data = await this.authService.listAdmins(input);

            res.json({
                message: 'Admins retrieved successfully',
                data
            });
        } catch (error) {
            this.handleError(error, res);
        }
    };

    private handleError(error: unknown, res: Response) {
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

        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
    }
}