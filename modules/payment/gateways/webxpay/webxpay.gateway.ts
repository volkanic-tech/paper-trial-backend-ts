import { BadRequestError } from '../../../common/error';
import { PaymentGateway } from '../../payment-gateway.interface';
import {
    CreatePaymentSessionInput,
    GatewayCallbackInput,
    PaymentTransactionStatus,
    VerifiedPaymentResult
} from '../../payment.types';
import { WebxpayConfig } from './webxpay.config';
import { WebxpayCrypto } from './webxpay.crypto';

export class WebxpayGateway implements PaymentGateway {
    readonly name = 'webxpay' as const;

    private readonly crypto: WebxpayCrypto;

    constructor(private readonly config: WebxpayConfig) {
        this.crypto = new WebxpayCrypto(config.publicKey);
    }

    get defaultCurrency() {
        return this.config.currency;
    }

    createPaymentSession(input: CreatePaymentSessionInput) {
        this.assertConfigured();

        const payment = this.crypto.encryptPayment(`${input.internalReference}|${input.amount.toFixed(2)}`);
        const customFields = this.crypto.encodeCustomFields([
            input.orderUuid,
            input.internalReference,
            ...(input.metadata ? Object.values(input.metadata) : [])
        ]);

        const fields: Record<string, string> = {
            first_name: input.customer.firstName,
            last_name: input.customer.lastName,
            email: input.customer.email,
            contact_number: input.customer.contactNumber,
            address_line_one: input.customer.addressLineOne,
            secret_key: this.config.secretKey,
            payment,
            custom_fields: customFields,
            cms: this.config.cms,
            process_currency: input.currency
        };

        if (input.customer.addressLineTwo) fields.address_line_two = input.customer.addressLineTwo;
        if (input.customer.city) fields.city = input.customer.city;
        if (input.customer.state) fields.state = input.customer.state;
        if (input.customer.postalCode) fields.postal_code = input.customer.postalCode;
        if (input.customer.country) fields.country = input.customer.country;
        if (input.paymentGatewayId) fields.payment_gateway_id = input.paymentGatewayId;
        if (input.multiplePaymentGatewayIds) fields.multiple_payment_gateway_ids = input.multiplePaymentGatewayIds;

        return {
            gateway: 'webxpay' as const,
            method: 'POST' as const,
            url: this.config.paymentUrl,
            fields
        };
    }

    verifyCallback(input: GatewayCallbackInput): VerifiedPaymentResult {
        this.assertConfigured();

        const payment = input.payload.payment;
        const signature = input.payload.signature;

        if (typeof payment !== 'string' || typeof signature !== 'string') {
            throw new BadRequestError('Invalid WebX Pay callback payload');
        }

        const rawPayment = this.crypto.decodeGatewayPayment(payment);
        const isSignatureValid = this.crypto.verifyGatewaySignature(payment, signature);
        const parts = rawPayment.split('|');

        if (parts.length < 6) {
            throw new BadRequestError('Invalid WebX Pay payment response');
        }

        const [
            internalReference,
            providerReference,
            transactionDateTime,
            statusCode,
            comment,
            gatewayPaymentMethod,
            paidAmount,
            orderAmount
        ] = parts;

        return {
            provider: 'webxpay',
            internalReference,
            providerReference,
            status: this.mapStatus(statusCode),
            gatewayStatusCode: statusCode,
            gatewayMessage: comment?.trim(),
            gatewayPaymentMethod,
            isSignatureValid,
            rawPayment,
            transactionDateTime,
            paidAmount,
            orderAmount,
            customFields: this.crypto.decodeCustomFields(input.payload.custom_fields)
        };
    }

    private mapStatus(statusCode: string): PaymentTransactionStatus {
        if (statusCode === '0' || statusCode === '00') {
            return 'paid';
        }

        return 'failed';
    }

    private assertConfigured() {
        if (!this.config.secretKey) {
            throw new BadRequestError('WEBXPAY_SECRET_KEY is not configured');
        }

        if (!this.config.publicKey) {
            throw new BadRequestError('WEBXPAY_PUBLIC_KEY is not configured');
        }
    }
}
