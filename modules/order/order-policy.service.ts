import { Prisma } from "../../generated/prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "../common/error";
import { OrderRepository } from "./order.repository";
import { CreateOrderInput, ListOrdersQueryInput, OrderStatus } from "./order.schemas";

type PreparedOrderItem = {
    productId: number;
    quantity: number;
    price: number;
};

export class OrderPolicyService {
    constructor(private readonly orders: OrderRepository) { }

    async prepareOrderItems(input: CreateOrderInput) {
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

    calculateTotals(
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

    buildOrderWhere(input: ListOrdersQueryInput) {
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

    assertStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
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

    calculateRate(amount: number, base: number) {
        if (base <= 0) {
            return 0;
        }

        return (amount / base) * 100;
    }

    roundMoney(value: number) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    validateOrderId(id: number) {
        if (!id || Number.isNaN(id)) {
            throw new BadRequestError('Order ID is required and must be a number');
        }
    }


}