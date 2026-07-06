import prisma from "../../../config/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { UserCreateInput } from "../../../generated/prisma/models";
import { ListUsersQueryInput } from "./customer.schema";

export const safeCustomerSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    address: true,
    phone: true,
    isActive: true,
    createdAt: true
} satisfies Prisma.UserSelect;

export type SafeCustomer = Prisma.UserGetPayload<{ select: typeof safeCustomerSelect }>;

export class CustomerRepository {

    findById = (id: number) => {
        return prisma.user.findUnique({ where: { id } });
    }

    findByEmail = (email: string) => {
        return prisma.user.findUnique({ where: { email } });
    }

    findByPhone = (phone: string) => {
        return prisma.user.findFirst({ where: { phone } });
    }

    create = (data: UserCreateInput) => {
        return prisma.user.create({ data });
    }

    update = (data: UserCreateInput, id: number) => {
        return prisma.user.update({ where: { id }, data });
    }

    findSafeById = (id: number) => {
        return prisma.user.findUnique({
            where: { id },
            select: safeCustomerSelect
        });
    }

    listAll = (query: ListUsersQueryInput) => {
        const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;
        const isInternal = query.isInternal === 'true' ? true : query.isInternal === 'false' ? false : undefined;

        return prisma.user.findMany({
            where: {
                isActive,
                isInternal
            },
            orderBy: {
                [query.sortBy]: query.sortOrder,
            },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            select: safeCustomerSelect
        });
    }

    count = (query: Prisma.UserCountArgs) => {
        return prisma.user.count(query);
    }

}