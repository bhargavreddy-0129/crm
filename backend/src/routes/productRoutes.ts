import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  adjustStock,
  uploadProductImage,
} from '../controllers/productController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', authorize(['ADMIN', 'WAREHOUSE']), createProduct);
router.put('/:id', authorize(['ADMIN', 'WAREHOUSE']), updateProduct);
router.post('/:id/adjust-stock', authorize(['ADMIN', 'WAREHOUSE']), adjustStock);
router.post('/upload-image', authorize(['ADMIN', 'WAREHOUSE']), uploadProductImage);

export default router;
