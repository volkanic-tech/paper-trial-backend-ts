import { randomUUID } from "node:crypto";
import prisma from "../../config/prisma";
import { Prisma } from "../../generated/prisma/client";
import { CreateOrderInput } from "./order.schemas";

type CreateOrderTotals = {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
};

type CreateOrderItem = {
    productId: number;
    quantity: number;
    price: number;
};

export class OrderRepository {
    findById(id: number) {
        return prisma.order.findUnique({
            where: { id },
            include: orderInclude
        });
    }

    findByUUID(uuid: string) {
        return prisma.order.findUnique({
            where: { uuid },
            include: orderInclude
        });
    }

    findByUserId(userId: number) {
        return prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: orderInclude
        });
    }

    findUserById(userId: number) {
        return prisma.user.findUnique({
            where: { id: userId }
        });
    }

    findProductsByIds(productIds: number[]) {
        return prisma.product.findMany({
            where: { id: { in: productIds } }
        });
    }

    count(where?: Prisma.OrderWhereInput) {
        return prisma.order.count({ where });
    }

    findMany(
        where: Prisma.OrderWhereInput,
        skip: number,
        take: number,
        orderBy: Prisma.OrderOrderByWithRelationInput,
    ) {
        return prisma.order.findMany({
            where,
            skip,
            take,
            orderBy,
            include: orderInclude
        });
    }

    create(input: CreateOrderInput, items: CreateOrderItem[], totals: CreateOrderTotals) {
        return prisma.$transaction(async transaction => {
            for (const item of items) {
                const updateResult = await transaction.product.updateMany({
                    where: {
                        id: item.productId,
                        stock: { gte: item.quantity }
                    },
                    data: {
                        stock: { decrement: item.quantity }
                    }
                });

                if (updateResult.count !== 1) {
                    throw new Error(`Insufficient stock for product ${item.productId}`);
                }
            }

            return transaction.order.create({
                data: {
                    uuid: randomUUID(),
                    userId: input.userId,
                    subtotal: totals.subtotal,
                    shippingFee: input.shippingFee,
                    tax: totals.tax,
                    discount: totals.discount,
                    total: totals.total,
                    status: input.status,
                    paymentStatus: input.paymentStatus,
                    paymentMethod: input.paymentMethod,
                    shippingAddress: input.shippingAddress as Prisma.InputJsonValue,
                    billingAddress: input.billingAddress as Prisma.InputJsonValue | undefined,
                    trackingNumber: input.trackingNumber,
                    notes: input.notes,
                    orderItems: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                },
                include: orderInclude
            });
        });
    }

    update(id: number, data: Prisma.OrderUpdateInput) {
        return prisma.order.update({
            where: { id },
            data,
            include: orderInclude
        });
    }

    updateWithStockRestore(
        id: number,
        data: Prisma.OrderUpdateInput,
        items: Array<{ productId: number; quantity: number }>
    ) {
        return prisma.$transaction(async transaction => {
            for (const item of items) {
                await transaction.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { increment: item.quantity }
                    }
                });
            }

            return transaction.order.update({
                where: { id },
                data,
                include: orderInclude
            });
        });
    }

    async getStats() {
        const [totalOrders, pendingOrders, processingOrders, shippedOrders, deliveredOrders, cancelledOrders, paidOrders, revenue] = await prisma.$transaction([
            prisma.order.count(),
            prisma.order.count({ where: { status: 'pending' } }),
            prisma.order.count({ where: { status: 'processing' } }),
            prisma.order.count({ where: { status: 'shipped' } }),
            prisma.order.count({ where: { status: 'delivered' } }),
            prisma.order.count({ where: { status: 'cancelled' } }),
            prisma.order.count({ where: { paymentStatus: 'paid' } }),
            prisma.order.aggregate({
                where: { paymentStatus: 'paid', status: { not: 'cancelled' } },
                _sum: { total: true }
            })
        ]);

        return {
            totalOrders,
            pendingOrders,
            processingOrders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            paidOrders,
            totalRevenue: revenue._sum.total || 0
        };
    }
}


const orderInclude = {
    user: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            address: true,
            isActive: true
        }
    },
    orderItems: {
        include: {
            product: {
                select: {
                    id: true,
                    sku: true,
                    name: true,
                    price: true,
                    images: {
                        where: { isPrimary: true },
                        take: 1
                    }
                }
            }
        }
    },
} satisfies Prisma.OrderInclude;
