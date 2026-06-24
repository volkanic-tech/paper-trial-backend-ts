import express from 'express';


const router = express.Router();
router.use('/auth/admin', require('../modules/auth/admin/admin.route').default);
router.use('/product', require('../modules/product/product.route').default);
router.use('/invoice', require('../modules/invoice/invoice.route').default);
router.use('/order', require('../modules/order/order.route').default);
export default router;
