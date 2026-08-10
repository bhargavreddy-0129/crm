import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addFollowUpNote,
} from '../controllers/customerController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', authorize(['ADMIN', 'SALES']), createCustomer);
router.put('/:id', authorize(['ADMIN', 'SALES']), updateCustomer);
router.post('/:id/followups', authorize(['ADMIN', 'SALES']), addFollowUpNote);

export default router;
