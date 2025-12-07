import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../../config/prisma';
import { AuthenticatedAdminRequest } from '../../../types';
import adminAuthMiddleware from '../../../middlewares/auth.middleware';

const router = express.Router();


router.post('/login', async (req, res) => {
    try {
        
        const schema = z.object({
            email: z.string().email('Invalid email format'),
            password: z.string().min(6, 'Password must be at least 6 characters')
        });
        
        
        const validatedData = schema.parse(req.body);
        const { email, password } = validatedData;

        const admin = await prisma.admin.findUnique({ where: { email } });

        if (!admin) {
            res.status(401).json({
                message: 'Invalid credentials',
                data: null
            });
            return
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        
        if (!isPasswordValid) {
            res.status(401).json({
                message: 'Invalid credentials',
                data: null
            });
            return
        }

        if (admin.isActive === false) {
            res.status(403).json({
                message: 'Account is inactive. Please contact support.',
                data: null
            });
            return
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email , base_role: 'admin' , role: admin.role },
            process.env.JWT_SECRET || '',
            { expiresIn: '24h' }
        );

        admin.lastLogin = new Date();
        await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLogin: admin.lastLogin }
        });

        admin.password = ''

        res.json({
            message: 'Login successful',
            data: {
                token,
                user: admin 
            }
        });
        return

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                message: 'Validation error',
                errors: error.errors
            });
            return 
        }

        res.status(500).json({
            message: 'Internal server error',
            data: null
        });

        return
    }
});


router.post('/register' , adminAuthMiddleware('admin') , async (req:AuthenticatedAdminRequest, res) => {
    try {

        const schema = z.object({
            email: z.string().email('Invalid email format'),
            password: z.string().min(6, 'Password must be at least 6 characters'),
            name: z.string().min(1, 'Name is required'),
            address: z.string().min(1, 'Address is required'),
            phone: z.string().min(10, 'Phone number must be at least 10 characters'),
            role: z.enum(['admin' , 'moderator']).default('admin')
        });

        const validatedData = schema.parse(req.body);
        const { email, password, name, address, phone, role } = validatedData;

        const existingAdmin = await prisma.admin.findUnique({ where: { email } });

        if (existingAdmin) {
            res.status(409).json({
                message: 'Admin with this email already exists',
                data: null
            });
            return;
        }

        const phoneExists = await prisma.admin.findFirst({ where: { phone } });

        if (phoneExists) {
            res.status(409).json({
                message: 'Admin with this phone number already exists',
                data: null
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await prisma.admin.create({
            data: {
                email,
                password: hashedPassword,
                name,
                address,
                phone,
                role: role,
                lastLogin: null
            }
        });

        admin.password = ''

        res.status(201).json({
            message: 'Admin registered successfully',
            data: {
                user: admin
            }
        });
        return;

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                message: 'Validation error',
                errors: error.errors
            });
            return;
        }

        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }
});


router.get('/toggle-active-status/:adminId', adminAuthMiddleware('admin'), async (req: AuthenticatedAdminRequest, res) => {
    try {
        const { adminId } = req.params;
        const adminIdNum = Number(adminId);

        if (!adminId || Number.isNaN(adminIdNum)) {
            res.status(400).json({
                message: 'Admin ID is required and must be a number',
                data: null
            });
            return;
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminIdNum }
        });

        if (!admin) {
            res.status(404).json({
                message: 'Admin not found',
                data: null
            });
            return;
        }

        if (req.user && req.user.id === adminIdNum) {
            res.status(403).json({
                message: 'You cannot change your own active status',
                data: null
            });
            return;
        }

        const updatedAdmin = await prisma.admin.update({
            where: { id: adminIdNum },
            data: { isActive: !admin.isActive }
        });

        updatedAdmin.password = '';

        res.json({
            message: `Admin account ${updatedAdmin.isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                user: updatedAdmin
            }
        });
        return;

    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }
});


router.get('/me', adminAuthMiddleware(), async (req: AuthenticatedAdminRequest, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                message: 'Unauthorized',
                data: null
            });
            return;
        }

        const admin = await prisma.admin.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                address: true,
                phone: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
            }
        });

        if (!admin) {
            res.status(404).json({
                message: 'Admin not found',
                data: null
            });
            return;
        }

        res.json({
            message: 'Current user retrieved successfully',
            data: {
                user: admin
            }
        });
        return;

    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }
});


router.put('/edit/:adminId', adminAuthMiddleware('admin'), async (req: AuthenticatedAdminRequest, res) => {
    try {
        const { adminId } = req.params;
        const adminIdNum = Number(adminId);

        if (!adminId || Number.isNaN(adminIdNum)) {
            res.status(400).json({
                message: 'Admin ID is required and must be a number',
                data: null
            });
            return;
        }

        const schema = z.object({
            email: z.string().email('Invalid email format').optional(),
            name: z.string().min(1, 'Name cannot be empty').optional(),
            address: z.string().min(1, 'Address cannot be empty').optional(),
            phone: z.string().min(10, 'Phone number must be at least 10 characters').optional(),
            role: z.enum(['admin', 'moderator']).optional(),
            password: z.string().min(6, 'Password must be at least 6 characters').optional()
        });

        const validatedData = schema.parse(req.body);

        const admin = await prisma.admin.findUnique({
            where: { id: adminIdNum }
        });

        if (!admin) {
            res.status(404).json({
                message: 'Admin not found',
                data: null
            });
            return;
        }

        if (validatedData.email && validatedData.email !== admin.email) {
            const emailExists = await prisma.admin.findUnique({
                where: { email: validatedData.email }
            });

            if (emailExists) {
                res.status(409).json({
                    message: 'Email is already taken',
                    data: null
                });
                return;
            }
        }

        if (validatedData.phone && validatedData.phone !== admin.phone) {
            const phoneExists = await prisma.admin.findFirst({
                where: { 
                    phone: validatedData.phone,
                    id: { not: adminIdNum }
                }
            });

            if (phoneExists) {
                res.status(409).json({
                    message: 'Phone number is already taken',
                    data: null
                });
                return;
            }
        }

        const updateData: any = {
            email: validatedData.email,
            name: validatedData.name,
            address: validatedData.address,
            phone: validatedData.phone,
            role: validatedData.role
        };

        if (validatedData.password) {
            updateData.password = await bcrypt.hash(validatedData.password, 10);
        }

        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        // Update admin
        const updatedAdmin = await prisma.admin.update({
            where: { id: adminIdNum },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                address: true,
                phone: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true
            }
        });

        res.json({
            message: 'Admin updated successfully',
            data: {
                user: updatedAdmin
            }
        });
        return;

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                message: 'Validation error',
                errors: error.errors
            });
            return;
        }

        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }
});


router.get('/all', adminAuthMiddleware('moderator'), async (req: AuthenticatedAdminRequest, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string || '';
        const role = req.query.role as string;
        const isActive = req.query.isActive as string;


        if (page < 1 || limit < 1 || limit > 100) {
            res.status(400).json({
                message: 'Invalid pagination parameters. Page must be >= 1 and limit between 1-100',
                data: null
            });
            return;
        }

        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } }
            ];
        }

        if (role && (role === 'admin' || role === 'moderator')) {
            where.role = role;
        }

        if (isActive !== undefined && (isActive === 'true' || isActive === 'false')) {
            where.isActive = isActive === 'true';
        }

        const totalCount = await prisma.admin.count({ where });

        const admins = await prisma.admin.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                name: true,
                address: true,
                phone: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true
            }
        });

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            message: 'Admins retrieved successfully',
            data: {
                admins,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });
        return;

    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            data: null
        });
        return;
    }
});


export default router;


