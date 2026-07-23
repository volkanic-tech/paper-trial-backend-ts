import express from 'express';
import adminAuthMiddleware from '../../middlewares/auth.middleware';
import customerAuthMiddleware from '../../middlewares/customer.middleware';
import { OrderController } from './order.controller';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';
import { OrderPolicyService } from './order-policy.service';

const router = express.Router();

const orderController = new OrderController(
    new OrderService(
        new OrderRepository(),
        new OrderPolicyService(new OrderRepository()),
    ),
);

router.route('/')
    .post(adminAuthMiddleware('moderator'), orderController.create)
    .get(adminAuthMiddleware('moderator'), orderController.list);

router.route('/stats')
    .get(adminAuthMiddleware('moderator'), orderController.stats);

router.route('/dispatch-order')
    .post(adminAuthMiddleware('moderator'), orderController.dispatchOrder);

router.route('/checkout')
    .post(customerAuthMiddleware(), orderController.createCustomerOrder);

router.route('/uuid/:uuid')
    .get(adminAuthMiddleware('moderator'), orderController.getByUUID);

router.route('/user/:userId')
    .get(adminAuthMiddleware('moderator'), orderController.getByUserId);

router.route('/:id')
    .get(adminAuthMiddleware('moderator'), orderController.getById)
    .patch(adminAuthMiddleware('moderator'), orderController.update);

router.route('/:id/status')
    .patch(adminAuthMiddleware('moderator'), orderController.updateStatus);

router.route('/:id/payment-status')
    .patch(adminAuthMiddleware('moderator'), orderController.updatePaymentStatus);

export default router;
