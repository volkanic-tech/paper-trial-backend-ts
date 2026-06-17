import express from 'express'
import adminAuthMiddleware from '../../../middlewares/auth.middleware'
import { AdminAuthController } from './auth.controller'
import { AdminRepository } from './admin.repository'
import { AuthService } from './auth.service'
import { JwtService } from '../../../utils/jwt.service'

const router = express.Router();

const adminAuthController = new AdminAuthController(
    new AuthService(
        new AdminRepository(),
        new JwtService()
    )
)

router.route('/login').post(adminAuthController.login);

router.route('/register')
    .post(adminAuthMiddleware('admin'), adminAuthController.register);

router.route('/toggle-active/:adminId')
    .patch(adminAuthMiddleware('admin'), adminAuthController.toggleActiveStatus);

router.route('/me')
    .get(adminAuthMiddleware('admin'), adminAuthController.me);

router.route('/edit/:adminId')
    .patch(adminAuthMiddleware('admin'), adminAuthController.edit);

router.route('/all')
    .get(adminAuthMiddleware('admin'), adminAuthController.all);

export default router;