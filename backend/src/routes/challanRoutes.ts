import { Router } from 'express';
import {
  getChallans,
  getChallanById,
  createChallan,
  updateChallanStatus,
  downloadChallanPdf,
} from '../controllers/challanController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getChallans);
router.get('/:id', getChallanById);
router.get('/:id/pdf', downloadChallanPdf);
router.post('/', authorize(['ADMIN', 'SALES']), createChallan);
router.put('/:id/status', authorize(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']), updateChallanStatus);

export default router;
