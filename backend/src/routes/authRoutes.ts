import { Router } from 'express';
import { login, me, updateProfile } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, updateProfile);

export default router;
