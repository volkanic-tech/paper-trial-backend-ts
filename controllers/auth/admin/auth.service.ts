import bcrypt from 'bcryptjs';
import { Prisma } from '../../../generated/prisma/client';
import { JwtService } from '../../../services/jwt.service';
import { AdminRepository } from './admin.repository';
import {
    EditAdminInput,
    ListAdminsQueryInput,
    LoginInput,
    RegisterAdminInput
} from './auth.schemas';
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError
} from './auth.errors';

export class AuthService {
    constructor(
        private readonly admins: AdminRepository,
        private readonly jwtService: JwtService
    ) {}

    async login(input: LoginInput) {
        const admin = await this.admins.findByEmail(input.email);

        if (!admin) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(input.password, admin.password);

        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid credentials');
        }

        if (admin.isActive === false) {
            throw new ForbiddenError('Account is inactive. Please contact support.');
        }

        const token = this.jwtService.signAdminToken(admin);
        await this.admins.updateLastLogin(admin.id);

        return {
            token,
            user: await this.admins.findSafeById(admin.id)
        };
    }

    async register(input: RegisterAdminInput) {
        const existingAdmin = await this.admins.findByEmail(input.email);

        if (existingAdmin) {
            throw new ConflictError('Admin with this email already exists');
        }

        const phoneExists = await this.admins.findByPhone(input.phone);

        if (phoneExists) {
            throw new ConflictError('Admin with this phone number already exists');
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);

        return this.admins.create({
            ...input,
            password: hashedPassword
        });
    }

    async toggleActiveStatus(adminId: number, currentAdminId?: number) {
        this.validateAdminId(adminId);

        const admin = await this.admins.findById(adminId);

        if (!admin) {
            throw new NotFoundError('Admin not found');
        }

        if (currentAdminId === adminId) {
            throw new ForbiddenError('You cannot change your own active status');
        }

        return this.admins.updateActiveStatus(adminId, !admin.isActive);
    }

    async getCurrentAdmin(adminId?: number) {
        if (!adminId) {
            throw new UnauthorizedError('Unauthorized');
        }

        const admin = await this.admins.findSafeById(adminId);

        if (!admin) {
            throw new NotFoundError('Admin not found');
        }

        return admin;
    }

    async updateAdmin(adminId: number, input: EditAdminInput) {
        this.validateAdminId(adminId);

        const admin = await this.admins.findById(adminId);

        if (!admin) {
            throw new NotFoundError('Admin not found');
        }

        if (input.email && input.email !== admin.email) {
            const emailExists = await this.admins.findByEmail(input.email);

            if (emailExists) {
                throw new ConflictError('Email is already taken');
            }
        }

        if (input.phone && input.phone !== admin.phone) {
            const phoneExists = await this.admins.findPhoneOwner(input.phone, adminId);

            if (phoneExists) {
                throw new ConflictError('Phone number is already taken');
            }
        }

        const updateData: Prisma.AdminUpdateInput = {};

        if (input.email !== undefined) updateData.email = input.email;
        if (input.name !== undefined) updateData.name = input.name;
        if (input.address !== undefined) updateData.address = input.address;
        if (input.phone !== undefined) updateData.phone = input.phone;
        if (input.role !== undefined) updateData.role = input.role;

        if (input.password) {
            updateData.password = await bcrypt.hash(input.password, 10);
        }

        return this.admins.update(adminId, updateData);
    }

    async listAdmins(input: ListAdminsQueryInput) {
        const skip = (input.page - 1) * input.limit;
        const where: Prisma.AdminWhereInput = {};

        if (input.search) {
            where.OR = [
                { name: { contains: input.search } },
                { email: { contains: input.search } },
                { phone: { contains: input.search } }
            ];
        }

        if (input.role) {
            where.role = input.role;
        }

        if (input.isActive !== undefined) {
            where.isActive = input.isActive === 'true';
        }

        const totalCount = await this.admins.count(where);
        const admins = await this.admins.findMany(where, skip, input.limit);
        const totalPages = Math.ceil(totalCount / input.limit);

        return {
            admins,
            pagination: {
                currentPage: input.page,
                totalPages,
                totalCount,
                limit: input.limit,
                hasNextPage: input.page < totalPages,
                hasPreviousPage: input.page > 1
            }
        };
    }

    private validateAdminId(adminId: number) {
        if (!adminId || Number.isNaN(adminId)) {
            throw new BadRequestError('Admin ID is required and must be a number');
        }
    }
}
