import express from 'express';


const router = express.Router();
router.use('/auth/admin', require('../controllers/auth/admin/auth.controller').default);
// router.use('/admin', require('../controllers/admin/admin.controller').default);
export default router;