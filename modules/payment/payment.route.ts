import express from 'express';
import adminAuthMiddleware from '../../middlewares/auth.middleware';
import { getWebxpayConfig } from './gateways/webxpay/webxpay.config';
import { WebxpayGateway } from './gateways/webxpay/webxpay.gateway';
import { PaymentController } from './payment.controller';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';

const router = express.Router();

const paymentController = new PaymentController(
    new PaymentService(
        new PaymentRepository(),
        new WebxpayGateway(getWebxpayConfig())
    )
);

router.route('/orders/:orderId/initiate')
    .post(adminAuthMiddleware('moderator'), paymentController.initiate);

router.route('/orders/:orderId')
    .get(adminAuthMiddleware('moderator'), paymentController.listOrderPayments);

router.route('/webxpay/callback')
    .post(paymentController.webxpayCallback);

export default router;
