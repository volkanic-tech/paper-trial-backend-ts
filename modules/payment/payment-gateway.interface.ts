import {
    CreatePaymentSessionInput,
    GatewayCallbackInput,
    PaymentGatewayName,
    PaymentSessionResult,
    VerifiedPaymentResult
} from './payment.types';

export interface PaymentGateway {
    readonly name: PaymentGatewayName;
    readonly defaultCurrency: string;

    createPaymentSession(input: CreatePaymentSessionInput): PaymentSessionResult;
    verifyCallback(input: GatewayCallbackInput): VerifiedPaymentResult;
}
