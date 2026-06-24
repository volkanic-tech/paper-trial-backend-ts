import { Prisma } from '../../generated/prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '../common/error';
import { PaginationOptions } from '../common/pagination';
import { OrderRepository } from './order.repository';
import {
    CreateOrderInput,
    ListOrdersQueryInput,
    OrderStatus,
    PaymentStatus,
    UpdateOrderInput
} from './order.schemas';

type PreparedOrderItem = {
    productId: number;
    quantity: number;
    price: number;
};

export class OrderService {
    constructor(private readonly orders: OrderRepository) {}

    async createOrder(input: CreateOrderInput) {
        const user = await this.orders.findUserById(input.userId);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        if (!user.isActive) {
            throw new ConflictError('Cannot create an order for an inactive user');
        }

        const items = await this.prepareOrderItems(input);
        const totals = this.calculateTotals(
            items,
            input.shippingFee,
            input.taxRate,
            input.discountRate
        );

        try {
            return await this.orders.create(input, items, totals);
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('Insufficient stock')) {
                throw new ConflictError(error.message);
            }

            throw error;
        }
    }

    async listOrders(input: ListOrdersQueryInput) {
        const skip = (input.page - 1) * input.limit;
        const where = this.buildOrderWhere(input);
        const orderBy = { [input.sortBy]: input.sortOrder } as Prisma.OrderOrderByWithRelationInput;

        const totalCount = await this.orders.count(where);
        const orders = await this.orders.findMany(where, skip, input.limit, orderBy);
        const totalPages = Math.ceil(totalCount / input.limit);

        return {
            orders,
            pagination: {
                currentPage: input.page,
                totalPages,
                totalCount,
                limit: input.limit,
                hasNextPage: input.page < totalPages,
                hasPreviousPage: input.page > 1
            } as PaginationOptions
        };
    }

    async getOrderById(id: number) {
        this.validateOrderId(id);

        const order = await this.orders.findById(id);

        if (!order) {
            throw new NotFoundError('Order not found');
        }

        return order;
    }

    async getOrderByUUID(uuid: string) {
        if (!uuid) {
            throw new BadRequestError('Order UUID is required');
        }

        const order = await this.orders.findByUUID(uuid);

        if (!order) {
            throw new NotFoundError('Order not found');
        }

        return order;
    }

    async getOrdersByUserId(userId: number) {
        if (!userId || Number.isNaN(userId)) {
            throw new BadRequestError('User ID is required and must be a number');
        }

        const user = await this.orders.findUserById(userId);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        return this.orders.findByUserId(userId);
    }

    async updateOrder(id: number, input: UpdateOrderInput) {
        const order = await this.getOrderById(id);

        if (order.status === 'cancelled' || order.status === 'delivered') {
            throw new ConflictError(`Cannot edit a ${order.status} order`);
        }

        const updateData: Prisma.OrderUpdateInput = {};

        if (input.shippingAddress !== undefined) {
            updateData.shippingAddress = input.shippingAddress as Prisma.InputJsonValue;
        }

        if (input.billingAddress !== undefined) {
            updateData.billingAddress = input.billingAddress === null
                ? Prisma.JsonNull
                : input.billingAddress as Prisma.InputJsonValue;
        }

        if (input.trackingNumber !== undefined) updateData.trackingNumber = input.trackingNumber;
        if (input.notes !== undefined) updateData.notes = input.notes;

        if (
            input.shippingFee !== undefined
            || input.taxRate !== undefined
            || input.discountRate !== undefined
        ) {
            const totals = this.calculateTotals(
                order.orderItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price
                })),
                input.shippingFee ?? order.shippingFee,
                input.taxRate ?? this.calculateRate(order.tax, order.subtotal - (order.discount || 0)),
                input.discountRate ?? this.calculateRate(order.discount || 0, order.subtotal)
            );

            Object.assign(updateData, {
                subtotal: totals.subtotal,
                shippingFee: input.shippingFee ?? order.shippingFee,
                tax: totals.tax,
                discount: totals.discount,
                total: totals.total
            });
        }

        updateData.updatedAt = new Date();

        return this.orders.update(id, updateData);
    }

    async updateStatus(id: number, status: OrderStatus) {
        const order = await this.getOrderById(id);

        this.assertStatusTransition(order.status as OrderStatus, status);

        const now = new Date();
        const updateData: Prisma.OrderUpdateInput = {
            status,
            updatedAt: now
        };

        if (status === 'shipped') updateData.shippedAt = now;
        if (status === 'delivered') updateData.deliveredAt = now;
        if (status === 'cancelled') updateData.cancelledAt = now;

        if (status === 'cancelled') {
            return this.orders.updateWithStockRestore(
                id,
                updateData,
                order.orderItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                }))
            );
        }

        return this.orders.update(id, updateData);
    }

    async updatePaymentStatus(id: number, paymentStatus: PaymentStatus) {
        const order = await this.getOrderById(id);

        if (order.status === 'cancelled' && paymentStatus === 'paid') {
            throw new ConflictError('Cannot mark a cancelled order as paid');
        }

        return this.orders.update(id, {
            paymentStatus,
            updatedAt: new Date()
        });
    }

    getStats() {
        return this.orders.getStats();
    }

    private async prepareOrderItems(input: CreateOrderInput) {
        const quantityByProductId = new Map<number, number>();

        for (const item of input.products) {
            quantityByProductId.set(
                item.productId,
                (quantityByProductId.get(item.productId) || 0) + item.quantity
            );
        }

        const products = await this.orders.findProductsByIds([...quantityByProductId.keys()]);
        const productsById = new Map(products.map(product => [product.id, product]));
        const items: PreparedOrderItem[] = [];

        for (const [productId, quantity] of quantityByProductId.entries()) {
            const product = productsById.get(productId);

            if (!product) {
                throw new NotFoundError(`Product ${productId} not found`);
            }

            if (!product.isActive) {
                throw new ConflictError(`Product ${product.name} is inactive`);
            }

            if (product.stock < quantity) {
                throw new ConflictError(`Insufficient stock for ${product.name}`);
            }

            items.push({
                productId,
                quantity,
                price: product.price
            });
        }

        return items;
    }

    private calculateTotals(
        items: PreparedOrderItem[],
        shippingFee: number,
        taxRate: number,
        discountRate: number
    ) {
        const subtotal = this.roundMoney(
            items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        );
        const discount = this.roundMoney(subtotal * (discountRate / 100));
        const taxableAmount = Math.max(0, subtotal - discount);
        const tax = this.roundMoney(taxableAmount * (taxRate / 100));
        const total = this.roundMoney(taxableAmount + tax + shippingFee);

        return {
            subtotal,
            tax,
            discount,
            total
        };
    }

    private buildOrderWhere(input: ListOrdersQueryInput) {
        const where: Prisma.OrderWhereInput = {};

        if (input.search) {
            where.OR = [
                { uuid: { contains: input.search, mode: 'insensitive' } },
                { trackingNumber: { contains: input.search, mode: 'insensitive' } },
                { user: { firstName: { contains: input.search, mode: 'insensitive' } } },
                { user: { lastName: { contains: input.search, mode: 'insensitive' } } },
                { user: { email: { contains: input.search, mode: 'insensitive' } } }
            ];
        }

        if (input.userId !== undefined) where.userId = input.userId;
        if (input.status !== undefined) where.status = input.status;
        if (input.paymentStatus !== undefined) where.paymentStatus = input.paymentStatus;

        if (input.minTotal !== undefined || input.maxTotal !== undefined) {
            where.total = {};
            if (input.minTotal !== undefined) where.total.gte = input.minTotal;
            if (input.maxTotal !== undefined) where.total.lte = input.maxTotal;
        }

        return where;
    }

    private assertStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
        if (currentStatus === nextStatus) {
            throw new ConflictError(`Order is already ${nextStatus}`);
        }

        const transitions: Record<OrderStatus, OrderStatus[]> = {
            pending: ['processing', 'cancelled'],
            processing: ['shipped', 'cancelled'],
            shipped: ['delivered'],
            delivered: [],
            cancelled: []
        };

        if (!transitions[currentStatus]?.includes(nextStatus)) {
            throw new ConflictError(`Cannot change status from ${currentStatus} to ${nextStatus}`);
        }
    }

    private calculateRate(amount: number, base: number) {
        if (base <= 0) {
            return 0;
        }

        return (amount / base) * 100;
    }

    private roundMoney(value: number) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    private validateOrderId(id: number) {
        if (!id || Number.isNaN(id)) {
            throw new BadRequestError('Order ID is required and must be a number');
        }
    }
}
