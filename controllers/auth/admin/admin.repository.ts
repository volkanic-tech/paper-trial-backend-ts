import { Prisma } from '../../../generated/prisma/client';
import prisma from '../../../config/prisma';
import { RegisterAdminInput } from './auth.schemas';

export const safeAdminSelect = {
    id: true,
    email: true,
    name: true,
    address: true,
    phone: true,
    role: true,
    isActive: true,
    lastLogin: true,
    createdAt: true
} satisfies Prisma.AdminSelect;

export type SafeAdmin = Prisma.AdminGetPayload<{ select: typeof safeAdminSelect }>;

export class AdminRepository {
    findById(id: number) {
        return prisma.admin.findUnique({ where: { id } });
    }

    findSafeById(id: number) {
        return prisma.admin.findUnique({
            where: { id },
            select: safeAdminSelect
        });
    }

    findByEmail(email: string) {
        return prisma.admin.findUnique({ where: { email } });
    }

    findByPhone(phone: string) {
        return prisma.admin.findFirst({ where: { phone } });
    }

    findPhoneOwner(phone: string, excludedAdminId: number) {
        return prisma.admin.findFirst({
            where: {
                phone,
                id: { not: excludedAdminId }
            }
        });
    }

    create(data: RegisterAdminInput & { password: string }) {
        return prisma.admin.create({
            data: {
                email: data.email,
                password: data.password,
                name: data.name,
                address: data.address,
                phone: data.phone,
                role: data.role,
                lastLogin: null
            },
            select: safeAdminSelect
        });
    }

    updateLastLogin(id: number) {
        return prisma.admin.update({
            where: { id },
            data: { lastLogin: new Date() }
        });
    }

    updateActiveStatus(id: number, isActive: boolean) {
        return prisma.admin.update({
            where: { id },
            data: { isActive },
            select: safeAdminSelect
        });
    }

    update(id: number, data: Prisma.AdminUpdateInput) {
        return prisma.admin.update({
            where: { id },
            data,
            select: safeAdminSelect
        });
    }

    count(where: Prisma.AdminWhereInput) {
        return prisma.admin.count({ where });
    }

    findMany(where: Prisma.AdminWhereInput, skip: number, take: number) {
        return prisma.admin.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            select: safeAdminSelect
        });
    }
}
