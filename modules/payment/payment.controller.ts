import { Request, Response } from 'express';
import { AuthenticatedAdminRequest } from '../../types';
import { handleError } from '../../utils/error-handler';
import { initiatePaymentSchema, webxpayCallbackSchema } from './payment.schemas';
import { PaymentService } from './payment.service';

export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    initiate = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = initiatePaymentSchema.parse(req.body);
            const data = await this.paymentService.initiateOrderPayment(Number(req.params.orderId), input);

            res.status(201).json({
                message: 'Payment session created successfully',
                data: {
                    transaction: data.transaction,
                    session: data.rawSession
                }
            });
        } catch (error) {
            handleError(error, res, 'Payment initiation error:');
        }
    };

    webxpayCallback = async (req: Request, res: Response) => {
        try {
            const payload = webxpayCallbackSchema.parse(req.body);
            const data = await this.paymentService.handleGatewayCallback({
                provider: 'webxpay',
                payload
            });

            res.json({
                message: data.result.status === 'paid' ? 'Transaction successful' : 'Transaction incomplete',
                data
            });
        } catch (error) {
            handleError(error, res, 'WebX Pay callback error:');
        }
    };

    listOrderPayments = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const payments = await this.paymentService.listOrderPayments(Number(req.params.orderId));

            res.json({
                message: 'Order payments retrieved successfully',
                data: { payments }
            });
        } catch (error) {
            handleError(error, res, 'Get order payments error:');
        }
    };
}
