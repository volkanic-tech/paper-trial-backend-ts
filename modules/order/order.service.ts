import { Prisma } from '../../generated/prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '../common/error';
import { PaginationOptions } from '../common/pagination';
import { OrderPolicyService } from './order-policy.service';
import { OrderRepository } from './order.repository';
import {
    CreateCustomerOrderInput,
    CreateOrderInput,
    ListOrdersQueryInput,
    OrderStatus,
    PaymentStatus,
    UpdateOrderInput
} from './order.schemas';

export class OrderService {
    constructor(
        private readonly ordersRepository: OrderRepository,
        private readonly orderPolicyService: OrderPolicyService
    ) { }

    async createOrder(input: CreateOrderInput) {
        const user = await this.ordersRepository.findUserById(input.userId);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        if (!user.isActive) {
            throw new ConflictError('Cannot create an order for an inactive user');
        }

        const items = await this.orderPolicyService.prepareOrderItems(input);
        const totals = this.orderPolicyService.calculateTotals(
            items,
            input.shippingFee,
            input.taxRate,
            input.discountRate
        );

        try {
            return await this.ordersRepository.create(input, items, totals);
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('Insufficient stock')) {
                throw new ConflictError(error.message);
            }

            throw error;
        }
    }

    createCustomerOrder(customerId: number, input: CreateCustomerOrderInput) {
        return this.createOrder({
            userId: customerId,
            products: input.products,
            shippingFee: 0,
            taxRate: 0,
            discountRate: 0,
            paymentMethod: 'online',
            paymentStatus: 'unpaid',
            status: 'pending',
            shippingAddress: input.shippingAddress,
            billingAddress: input.billingAddress,
            notes: input.notes
        });
    }

    async listOrders(input: ListOrdersQueryInput) {
        const skip = (input.page - 1) * input.limit;
        const where = this.orderPolicyService.buildOrderWhere(input);
        const orderBy = { [input.sortBy]: input.sortOrder } as Prisma.OrderOrderByWithRelationInput;

        const totalCount = await this.ordersRepository.count(where);
        const orders = await this.ordersRepository.findMany(where, skip, input.limit, orderBy);
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
        this.orderPolicyService.validateOrderId(id);

        const order = await this.ordersRepository.findById(id);

        if (!order) {
            throw new NotFoundError('Order not found');
        }

        return order;
    }

    async getOrderByUUID(uuid: string) {
        if (!uuid) {
            throw new BadRequestError('Order UUID is required');
        }

        const order = await this.ordersRepository.findByUUID(uuid);

        if (!order) {
            throw new NotFoundError('Order not found');
        }

        return order;
    }

    async getOrdersByUserId(userId: number) {
        if (!userId || Number.isNaN(userId)) {
            throw new BadRequestError('User ID is required and must be a number');
        }

        const user = await this.ordersRepository.findUserById(userId);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        return this.ordersRepository.findByUserId(userId);
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
            const totals = this.orderPolicyService.calculateTotals(
                order.orderItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price
                })),
                input.shippingFee ?? order.shippingFee,
                input.taxRate ?? this.orderPolicyService.calculateRate(order.tax, order.subtotal - (order.discount || 0)),
                input.discountRate ?? this.orderPolicyService.calculateRate(order.discount || 0, order.subtotal)
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

        return this.ordersRepository.update(id, updateData);
    }

    async updateStatus(id: number, status: OrderStatus) {
        const order = await this.getOrderById(id);

        this.orderPolicyService.assertStatusTransition(order.status as OrderStatus, status);

        const now = new Date();
        const updateData: Prisma.OrderUpdateInput = {
            status,
            updatedAt: now
        };

        if (status === 'shipped') updateData.shippedAt = now;
        if (status === 'delivered') updateData.deliveredAt = now;
        if (status === 'cancelled') updateData.cancelledAt = now;

        if (status === 'cancelled') {
            return this.ordersRepository.updateWithStockRestore(
                id,
                updateData,
                order.orderItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                }))
            );
        }

        return this.ordersRepository.update(id, updateData);
    }

    async updatePaymentStatus(id: number, paymentStatus: PaymentStatus) {
        const order = await this.getOrderById(id);

        if (order.status === 'cancelled' && paymentStatus === 'paid') {
            throw new ConflictError('Cannot mark a cancelled order as paid');
        }

        return this.ordersRepository.update(id, {
            paymentStatus,
            updatedAt: new Date()
        });
    }

    getStats() {
        return this.ordersRepository.getStats();
    }

    dispatchOrder(input: CreateOrderInput) {
        return this.createOrder({
            ...input,
            paymentStatus: 'unpaid'
        });
    }

}
