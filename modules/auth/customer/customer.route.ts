import express from 'express'
import adminAuthMiddleware from '../../../middlewares/auth.middleware'
import userAuthMiddleware from '../../../middlewares/customer.middleware'
import { JwtService } from '../../../utils/jwt.service'
import { CustomerAuthController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './customer.repository';
import { CustomerPolicyService } from './customer-policy.service';

const router = express.Router();

const userAuthController = new CustomerAuthController(
    new CustomerService(
        new CustomerRepository(),
        new JwtService(),
        new CustomerPolicyService(new CustomerRepository())
    )
)

router.route('/register')
    .post(userAuthController.register);

router.route('/login')
    .post(userAuthController.login);

router.route('/me')
    .get(userAuthMiddleware, userAuthController.me);

router.route('/list')
    .get(adminAuthMiddleware('admin'), userAuthController.listCustomers);

router.route('/active-status')
    .patch(adminAuthMiddleware('admin'), userAuthController.changeActiveStatus);

export default router;