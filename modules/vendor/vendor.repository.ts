import { Prisma } from "../../generated/prisma/client";
import prisma from "../../config/prisma";
import type { ListVendorsQueryInput } from "./vendor.schemas";

export class VendorRepository {

    findById = async (id: number) => {
        return await prisma.vendor.findUnique({
            where: { id }
        });
    }

    findByEmail = async (email: string) => {
        return await prisma.vendor.findUnique({
            where: { email }
        });
    }

    findByPhone = async (phone: string) => {
        return await prisma.vendor.findUnique({
            where: { phone }
        });
    }

    create = async (data: Prisma.VendorCreateInput) => {
        return await prisma.vendor.create({
            data
        });
    }

    update = async (id: number, data: Prisma.VendorUpdateInput) => {
        return await prisma.vendor.update({
            where: { id },
            data
        });
    }

    delete = async (id: number) => {
        return await prisma.vendor.delete({
            where: { id }
        });
    }

    list = async (input: ListVendorsQueryInput) => {
        const where: Prisma.VendorWhereInput = {};

        if (input.search) {
            where.OR = [
                { name: { contains: input.search, mode: 'insensitive' } },
                { email: { contains: input.search, mode: 'insensitive' } },
                { phone: { contains: input.search, mode: 'insensitive' } },
                { address: { contains: input.search, mode: 'insensitive' } }
            ];
        }

        const vendors = await prisma.vendor.findMany({
            where,
            orderBy: {
                [input.sortBy]: input.sortOrder
            },
            skip: (input.page - 1) * input.limit,
            take: input.limit
        });

        return vendors;

    }


}