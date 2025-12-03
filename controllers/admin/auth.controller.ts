import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { AuthenticatedAdminRequest } from '../../types';

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
            { id: admin.id, email: admin.email },
            process.env.JWT_SECRET || 'your-secret-key',
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



router.post('/register', async (req:AuthenticatedAdminRequest, res) => {
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

export default router;


