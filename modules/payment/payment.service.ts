import { randomUUID } from 'node:crypto';
import { BadRequestError, ConflictError, NotFoundError } from '../common/error';
import { PaymentGateway } from './payment-gateway.interface';
import { InitiatePaymentInput } from './payment.schemas';
import { PaymentRepository } from './payment.repository';
import { GatewayCallbackInput, PaymentCustomer } from './payment.types';

export class PaymentService {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentGateway: PaymentGateway
    ) { }

    async initiateOrderPayment(orderId: number, input: InitiatePaymentInput) {

        const order = await this.paymentRepository.findOrderById(orderId);

        if (!order) {
            throw new NotFoundError('Order not found');
        }

        if (order.status === 'cancelled') {
            throw new ConflictError('Cannot initiate a payment for a cancelled order');
        }

        if (order.paymentStatus === 'paid') {
            throw new ConflictError('Order is already paid');
        }

        const currency = this.paymentGateway.defaultCurrency;
        const customer = this.buildCustomer(order.user, order.shippingAddress);
        const internalReference = randomUUID();

        const session = this.paymentGateway.createPaymentSession({
            internalReference,
            orderUuid: order.uuid,
            amount: order.total,
            currency,
            customer,
            paymentGatewayId: input.paymentGatewayId,
            multiplePaymentGatewayIds: input.multiplePaymentGatewayIds
        });

        const transaction = await this.paymentRepository.createTransaction({
            orderId: order.id,
            provider: this.paymentGateway.name,
            internalReference,
            amount: order.total,
            currency
        });

        return {
            transaction,
            session: {
                ...session,
                fields: this.maskSensitiveFields(session.fields)
            },
            rawSession: session
        };
    }

    async handleGatewayCallback(input: GatewayCallbackInput) {
        const result = this.paymentGateway.verifyCallback(input);

        if (!result.isSignatureValid) {
            throw new BadRequestError('Invalid payment callback signature');
        }

        const transaction = await this.paymentRepository.findTransactionByReference(result.internalReference);

        if (!transaction) {
            throw new NotFoundError('Payment transaction not found');
        }

        if (transaction.status === 'paid') {
            return {
                payment: transaction,
                result,
                alreadyProcessed: true
            };
        }

        const payment = await this.paymentRepository.completeTransaction(result.internalReference, {
            providerReference: result.providerReference,
            status: result.status,
            gatewayStatusCode: result.gatewayStatusCode,
            gatewayMessage: result.gatewayMessage,
            gatewayPaymentMethod: result.gatewayPaymentMethod,
            responsePayload: {
                rawPayment: result.rawPayment,
                customFields: result.customFields
            }
        });

        return {
            payment,
            result,
            alreadyProcessed: false
        };
    }

    listOrderPayments(orderId: number) {
        return this.paymentRepository.findTransactionsByOrderId(orderId);
    }

    private buildCustomer(user: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        address: string;
    }, shippingAddress: unknown): PaymentCustomer {
        const address = this.asRecord(shippingAddress);

        return {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            contactNumber: user.phone,
            addressLineOne: this.readAddressValue(address, ['addressLineOne', 'line1', 'address']) || user.address,
            addressLineTwo: this.readAddressValue(address, ['addressLineTwo', 'line2']),
            city: this.readAddressValue(address, ['city']),
            state: this.readAddressValue(address, ['state', 'province']),
            postalCode: this.readAddressValue(address, ['postalCode', 'zip']),
            country: this.readAddressValue(address, ['country'])
        };
    }

    private asRecord(value: unknown): Record<string, unknown> {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, unknown>;
        }

        return {};
    }

    private readAddressValue(address: Record<string, unknown>, keys: string[]) {
        for (const key of keys) {
            const value = address[key];

            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }

        return undefined;
    }

    private maskSensitiveFields(fields: Record<string, string>) {
        const masked = { ...fields };

        if (masked.secret_key) {
            masked.secret_key = '***';
        }

        return masked;
    }
}
