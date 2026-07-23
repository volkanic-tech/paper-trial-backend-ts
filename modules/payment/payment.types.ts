export type PaymentGatewayName = 'webxpay';

export type PaymentTransactionStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export type PaymentCustomer = {
    firstName: string;
    lastName: string;
    email: string;
    contactNumber: string;
    addressLineOne: string;
    addressLineTwo?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
};

export type CreatePaymentSessionInput = {
    internalReference: string;
    orderUuid: string;
    amount: number;
    currency: string;
    customer: PaymentCustomer;
    metadata?: Record<string, string>;
    paymentGatewayId?: string;
    multiplePaymentGatewayIds?: string;
};

export type PaymentSessionResult = {
    gateway: PaymentGatewayName;
    method: 'POST';
    url: string;
    fields: Record<string, string>;
};

export type GatewayCallbackInput = {
    provider: PaymentGatewayName;
    payload: Record<string, unknown>;
};

export type VerifiedPaymentResult = {
    provider: PaymentGatewayName;
    internalReference: string;
    providerReference?: string;
    status: PaymentTransactionStatus;
    gatewayStatusCode?: string;
    gatewayMessage?: string;
    gatewayPaymentMethod?: string;
    transactionDateTime?: string;
    paidAmount?: string;
    orderAmount?: string;
    isSignatureValid: boolean;
    rawPayment: string;
    customFields: string[];
};
