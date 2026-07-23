import prisma from '../../config/prisma';
import { PAYMENT_STATUS } from './payment.constant';
import { CompletePaymentTransactionInput, CreatePaymentTransactionInput } from './payment.schemas';


export class PaymentRepository {

    findOrderById(orderId: number) {
        return prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });
    }

    findTransactionByReference(internalReference: string) {
        return prisma.paymentTransaction.findUnique({
            where: { internalReference },
            include: { order: true }
        });
    }

    createTransaction(input: CreatePaymentTransactionInput) {
        return prisma.paymentTransaction.create({
            data: {
                orderId: input.orderId,
                provider: input.provider,
                internalReference: input.internalReference,
                amount: input.amount,
                currency: input.currency,
                status: 'pending',
                requestPayload: input.requestPayload
            }
        });
    }

    completeTransaction(
        internalReference: string,
        input: CompletePaymentTransactionInput
    ) {
        return prisma.$transaction(async transaction => {

            const payment = await transaction.paymentTransaction.update({
                where: { internalReference },
                data: {
                    providerReference: input.providerReference,
                    status: input.status,
                    gatewayStatusCode: input.gatewayStatusCode,
                    gatewayMessage: input.gatewayMessage,
                    gatewayPaymentMethod: input.gatewayPaymentMethod,
                    responsePayload: input.responsePayload,
                    updatedAt: new Date()
                },
                include: { order: true }
            });

            const orderPaymentStatus = input.status === PAYMENT_STATUS.PAID ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.FAILED;

            await transaction.order.update({
                where: { id: payment.orderId },
                data: {
                    paymentStatus: orderPaymentStatus,
                    updatedAt: new Date()
                }
            });

            return payment;
        });

    }

    findTransactionsByOrderId(orderId: number) {
        return prisma.paymentTransaction.findMany({
            where: { orderId },
            orderBy: { createdAt: 'desc' }
        });
    }

}