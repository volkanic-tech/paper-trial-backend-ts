import express from 'express';


const router = express.Router();
router.use('/auth/admin', require('../modules/auth/admin/auth.route').default);
router.use('/product', require('../modules/product/product.route').default);
export default router;