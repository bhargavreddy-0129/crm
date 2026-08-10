import { Router } from 'express';
import { getStockLogs } from '../controllers/stockController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);
router.get('/logs', getStockLogs);

export default router;
