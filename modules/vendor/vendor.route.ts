import express from 'express';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { VendorRepository } from './vendor.repository';
import adminAuthMiddleware from '../../middlewares/auth.middleware';

const router = express.Router();

const vendorController = new VendorController(
    new VendorService(
        new VendorRepository()
    )
)

router.route('/')
    .post(adminAuthMiddleware("admin"), vendorController.createVendor)
    .get(adminAuthMiddleware("admin"), vendorController.listVendors);

router.route('/:id')
    .get(adminAuthMiddleware("admin"), vendorController.getVendorById)
    .patch(adminAuthMiddleware("admin"), vendorController.updateVendor)
    .delete(adminAuthMiddleware("admin"), vendorController.deleteVendor);

export default router;