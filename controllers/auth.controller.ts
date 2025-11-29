import express  from 'express';
const router = express.Router();

router.get('/login' , (req, res) => {
    res.json({
        message: 'Login route',
        data: null
    });
    return
});


export default router;


