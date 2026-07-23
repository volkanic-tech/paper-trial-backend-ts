import { z } from 'zod';
import { PaymentGatewayName, PaymentTransactionStatus } from './payment.types';
import { Prisma } from '../../generated/prisma/client';

export const initiatePaymentSchema = z.object({
    paymentGatewayId: z.string().trim().min(1).optional(),
    multiplePaymentGatewayIds: z.string().trim().min(1).optional()
});

export const webxpayCallbackSchema = z.object({
    payment: z.string().min(1),
    signature: z.string().min(1),
    custom_fields: z.string().optional()
}).passthrough();


export type CreatePaymentTransactionInput = {
    orderId: number;
    provider: PaymentGatewayName;
    internalReference: string;
    amount: number;
    currency: string;
    requestPayload?: Prisma.InputJsonValue;
};

export type CompletePaymentTransactionInput = {
    providerReference?: string;
    status: PaymentTransactionStatus;
    gatewayStatusCode?: string;
    gatewayMessage?: string;
    gatewayPaymentMethod?: string;
    responsePayload?: Prisma.InputJsonValue;
};

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type WebxpayCallbackInput = z.infer<typeof webxpayCallbackSchema>;
