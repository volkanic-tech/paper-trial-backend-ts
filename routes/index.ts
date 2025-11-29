import express from 'express';


const router = express.Router();
router.use('/auth', require('../controllers/auth.controller').default);
// router.use('/admin', require('../controllers/admin/admin.controller').default);
export default router;
