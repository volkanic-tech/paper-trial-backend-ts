import { Response } from 'express';
import { z } from 'zod';
import { AppError } from '../modules/common/error';

export const handleError = (error: unknown, res: Response, logMessage: string) => {
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