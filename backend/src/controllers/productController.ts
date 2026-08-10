import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AuthenticatedRequest } from '../types';

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  currentStock: z.number().int().min(0, 'Initial stock cannot be negative').default(0),
  minStockAlert: z.number().int().min(0, 'Min stock alert quantity must be non-negative').default(5),
  location: z.string().min(1, 'Location/Warehouse is required'),
  imageUrl: z.string().optional().nullable(),
});

const stockAdjustSchema = z.object({
  changeQty: z.number().int().positive('Quantity must be greater than zero'),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.string().min(2, 'Reason is required'),
});

export async function getProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const lowStockOnly = req.query.lowStock === 'true';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { category: { contains: search } },
        { location: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (lowStockOnly) {
      const allProducts = await prisma.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });
      const filtered = allProducts.filter((p) => p.currentStock <= p.minStockAlert);
      const paginated = filtered.slice(skip, skip + limit);

      return res.json({
        success: true,
        data: paginated,
        pagination: {
          total: filtered.length,
          page,
          limit,
          totalPages: Math.ceil(filtered.length / limit),
        },
      });
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
}

export async function getProductById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockLogs: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 15,
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch product detail' });
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const parseResult = productSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten(),
      });
    }

    const data = parseResult.data;

    // Check SKU unique
    const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existingSku) {
      return res.status(400).json({ success: false, message: `SKU '${data.sku}' already exists` });
    }

    const product = await prisma.$transaction(async (tx) => {
      const newProd = await tx.product.create({
        data: {
          name: data.name,
          sku: data.sku,
          category: data.category,
          unitPrice: data.unitPrice,
          currentStock: data.currentStock,
          minStockAlert: data.minStockAlert,
          location: data.location,
          imageUrl: data.imageUrl || null,
        },
      });

      if (data.currentStock > 0 && req.user) {
        await tx.stockLog.create({
          data: {
            productId: newProd.id,
            changeQty: data.currentStock,
            movementType: 'IN',
            reason: 'Initial stock addition upon product creation',
            createdBy: req.user.userId,
          },
        });
      }

      return newProd;
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ success: false, message: 'Failed to create product' });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const parseResult = productSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten(),
      });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const data = parseResult.data;

    if (data.sku && data.sku !== existing.sku) {
      const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (existingSku) {
        return res.status(400).json({ success: false, message: `SKU '${data.sku}' already exists` });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.sku && { sku: data.sku }),
        ...(data.category && { category: data.category }),
        ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
        ...(data.minStockAlert !== undefined && { minStockAlert: data.minStockAlert }),
        ...(data.location && { location: data.location }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      },
    });

    return res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product' });
  }
}

export async function adjustStock(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const parseResult = stockAdjustSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten(),
      });
    }

    const { changeQty, movementType, reason } = parseResult.data;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let newStock = product.currentStock;
    if (movementType === 'IN') {
      newStock += changeQty;
    } else {
      if (product.currentStock < changeQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock! Current stock is ${product.currentStock}, requested reduction is ${changeQty}.`,
        });
      }
      newStock -= changeQty;
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data: { currentStock: newStock },
      });

      await tx.stockLog.create({
        data: {
          productId: id,
          changeQty,
          movementType,
          reason,
          createdBy: req.user!.userId,
        },
      });

      return prod;
    });

    return res.json({
      success: true,
      message: `Stock updated successfully. New stock: ${updatedProduct.currentStock}`,
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return res.status(500).json({ success: false, message: 'Failed to adjust stock' });
  }
}

export async function uploadProductImage(req: AuthenticatedRequest, res: Response) {
  try {
    const { fileName, fileData, mimeType } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ success: false, message: 'fileName and fileData (base64) are required' });
    }

    const { uploadProductImageToS3 } = await import('../utils/s3');
    const buffer = Buffer.from(fileData.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    const uploadResult = await uploadProductImageToS3(buffer, fileName, mimeType || 'image/jpeg');

    return res.json({
      success: true,
      message: 'Product image uploaded to AWS S3 storage',
      data: uploadResult,
    });
  } catch (error: any) {
    console.error('Error uploading product image:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload product image to S3' });
  }
}
