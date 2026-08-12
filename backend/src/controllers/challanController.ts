import { Response } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { prisma } from '../utils/prisma';
import { AuthenticatedRequest } from '../types';

const challanItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
});

const createChallanSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  status: z.enum(['Draft', 'Confirmed']).default('Draft'),
  items: z.array(challanItemSchema).min(1, 'At least one product must be added to the challan'),
});

async function generateNextChallanNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CHN-${currentYear}-`;

  const lastChallan = await prisma.challan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { challanNumber: 'desc' },
  });

  if (!lastChallan) {
    return `${prefix}0001`;
  }

  const lastNumStr = lastChallan.challanNumber.replace(prefix, '');
  const lastNum = parseInt(lastNumStr, 10);
  const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

export async function getChallans(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const customerId = (req.query.customerId as string) || '';

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { challanNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { businessName: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [challans, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, businessName: true, email: true, mobile: true } },
          user: { select: { id: true, name: true, role: true } },
          items: true,
        },
      }),
      prisma.challan.count({ where }),
    ]);

    return res.json({
      success: true,
      data: challans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching challans:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch challans' });
  }
}

export async function getChallanById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, name: true, role: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, currentStock: true, minStockAlert: true } },
          },
        },
      },
    });

    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }

    return res.json({ success: true, data: challan });
  } catch (error) {
    console.error('Error fetching challan detail:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch challan detail' });
  }
}

export async function createChallan(req: AuthenticatedRequest, res: Response) {
  try {
    const parseResult = createChallanSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten(),
      });
    }

    const { customerId, status, items } = parseResult.data;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Selected customer does not exist' });
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalQty = 0;
    let totalAmount = 0;
    const itemsToCreate: any[] = [];
    const stockShortages: string[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product with ID '${item.productId}' not found` });
      }

      if (status === 'Confirmed' && product.currentStock < item.quantity) {
        stockShortages.push(
          `Product '${product.name}' (SKU: ${product.sku}) has current stock of ${product.currentStock}, but ${item.quantity} requested.`
        );
      }

      const subtotal = product.unitPrice * item.quantity;
      totalQty += item.quantity;
      totalAmount += subtotal;

      itemsToCreate.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPrice: product.unitPrice,
        quantity: item.quantity,
        subtotal,
      });
    }

    if (stockShortages.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm challan due to insufficient stock!',
        errors: stockShortages,
      });
    }

    const challanNumber = await generateNextChallanNumber();

    const newChallan = await prisma.$transaction(async (tx) => {
      const createdChallan = await tx.challan.create({
        data: {
          challanNumber,
          customerId,
          totalQty,
          totalAmount,
          status,
          createdBy: req.user!.userId,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      if (status === 'Confirmed') {
        for (const item of itemsToCreate) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              changeQty: item.quantity,
              movementType: 'OUT',
              reason: `Dispatched via Sales Challan ${challanNumber}`,
              createdBy: req.user!.userId,
            },
          });
        }
      }

      return createdChallan;
    });

    return res.status(201).json({
      success: true,
      message: `Sales Challan ${challanNumber} created as ${status}`,
      data: newChallan,
    });
  } catch (error) {
    console.error('Error creating challan:', error);
    return res.status(500).json({ success: false, message: 'Failed to create sales challan' });
  }
}

export async function updateChallanStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Draft', 'Confirmed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Draft, Confirmed, or Cancelled.' });
    }

    const existingChallan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingChallan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }

    if (existingChallan.status === status) {
      return res.json({ success: true, message: `Challan is already in '${status}' status`, data: existingChallan });
    }

    const updatedChallan = await prisma.$transaction(async (tx) => {
      if (existingChallan.status === 'Draft' && status === 'Confirmed') {
        for (const item of existingChallan.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || product.currentStock < item.quantity) {
            const currentStock = product ? product.currentStock : 0;
            throw new Error(
              `Insufficient stock for '${item.productName}'. Stock available: ${currentStock}, required: ${item.quantity}`
            );
          }
        }

        for (const item of existingChallan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              changeQty: item.quantity,
              movementType: 'OUT',
              reason: `Dispatched via Sales Challan ${existingChallan.challanNumber}`,
              createdBy: req.user!.userId,
            },
          });
        }
      } else if (existingChallan.status === 'Confirmed' && status === 'Cancelled') {
        for (const item of existingChallan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              changeQty: item.quantity,
              movementType: 'IN',
              reason: `Restored stock from Cancelled Challan ${existingChallan.challanNumber}`,
              createdBy: req.user!.userId,
            },
          });
        }
      }

      return tx.challan.update({
        where: { id },
        data: { status },
        include: { customer: true, items: true },
      });
    });

    return res.json({
      success: true,
      message: `Challan status updated to ${status}`,
      data: updatedChallan,
    });
  } catch (error: any) {
    console.error('Error updating challan status:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to update challan status' });
  }
}

export async function downloadChallanPdf(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { name: true, email: true, role: true } },
        items: true,
      },
    });

    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }

    const itemCount = Math.max(challan.items.length, 1);
    const calculatedPageHeight = Math.min(Math.max(340 + (itemCount * 24) + 110, 420), 841.89);

    const doc = new PDFDocument({ margin: 25, size: [595.28, calculatedPageHeight] });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${challan.challanNumber}.pdf"`);

    doc.pipe(res);

    const primaryNavy = '#0F172A';
    const accentIndigo = '#4F46E5';
    const darkText = '#1E293B';
    const mutedText = '#64748B';
    const lightBg = '#F8FAFC';
    const borderCol = '#CBD5E1';

    doc.rect(25, 20, 545, 56).fill(primaryNavy);
    doc.rect(32, 28, 32, 32).fill(accentIndigo);
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('ERP', 38, 39);

    doc.fillColor('#FFFFFF').fontSize(10.5).font('Helvetica-Bold').text('APEX WHOLESALE & DISTRIBUTION', 72, 27, { width: 250, lineBreak: false });
    doc.fontSize(7.5).font('Helvetica').fillColor('#94A3B8').text('Mini ERP & CRM Operations Portal | GSTIN: 27AAACN1234F1Z9', 72, 41, { width: 250, lineBreak: false });
    doc.fontSize(7.5).fillColor('#CBD5E1').text('Toll Free: +91 1800 233 4455 | dispatch@apexdistribution.com', 72, 53, { width: 250, lineBreak: false });

    doc.fillColor('#F59E0B').fontSize(10).font('Helvetica-Bold').text('TAX INVOICE / DELIVERY CHALLAN', 330, 27, { width: 230, align: 'right' });
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text('Original Copy for Consignee', 330, 41, { width: 230, align: 'right' });

    doc.rect(25, 81, 545, 35).fill(lightBg);
    doc.rect(25, 81, 545, 35).stroke(borderCol);

    doc.fillColor(mutedText).fontSize(7.5).font('Helvetica').text('CHALLAN NO:', 35, 87);
    doc.fillColor(darkText).fontSize(9).font('Helvetica-Bold').text(challan.challanNumber, 35, 98);

    doc.fillColor(mutedText).fontSize(7.5).font('Helvetica').text('SALES EXECUTIVE:', 170, 87);
    doc.fillColor(darkText).fontSize(8.5).font('Helvetica-Bold').text(`${challan.user?.name || 'System User'} (${challan.user?.role || 'Sales'})`, 170, 98);

    doc.fillColor(mutedText).fontSize(7.5).font('Helvetica').text('ISSUE DATE:', 370, 87);
    doc.fillColor(darkText).fontSize(8.5).font('Helvetica-Bold').text(
      new Date(challan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      370,
      98
    );

    doc.fillColor(mutedText).fontSize(7.5).font('Helvetica').text('STATUS:', 485, 87);
    const statusText = challan.status.toUpperCase();
    let badgeBg = '#F59E0B';
    if (challan.status === 'Confirmed') badgeBg = '#10B981';
    if (challan.status === 'Cancelled') badgeBg = '#EF4444';

    doc.rect(485, 96, 75, 14).fill(badgeBg);
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold').text(statusText, 485, 99, { width: 75, align: 'center' });

    doc.rect(25, 121, 268, 70).fill('#FFFFFF');
    doc.rect(25, 121, 268, 70).stroke(borderCol);
    doc.rect(25, 121, 268, 15).fill('#E0E7FF');
    doc.fillColor(accentIndigo).fontSize(8).font('Helvetica-Bold').text('BILLED TO / CUSTOMER DETAILS', 35, 125);

    doc.fillColor(darkText).fontSize(9).font('Helvetica-Bold').text(challan.customer.businessName, 35, 139, { width: 248, lineBreak: false });
    doc.fillColor(darkText).fontSize(7.5).font('Helvetica')
      .text(`Contact Person: `, 35, 151, { continued: true, width: 248 })
      .font('Helvetica-Bold').text(`${challan.customer.name} (${challan.customer.customerType})`);
    doc.fillColor(darkText).fontSize(7.5).font('Helvetica')
      .text(`Mobile: `, 35, 162, { continued: true, width: 248 })
      .font('Helvetica-Bold').text(`${challan.customer.mobile}`);
    doc.fillColor(darkText).fontSize(7.5).font('Helvetica')
      .text(`Email: `, 35, 173, { continued: true, width: 248 })
      .font('Helvetica-Bold').text(`${challan.customer.email}`);

    doc.rect(302, 121, 268, 70).fill('#FFFFFF');
    doc.rect(302, 121, 268, 70).stroke(borderCol);
    doc.rect(302, 121, 268, 15).fill('#E0E7FF');
    doc.fillColor(accentIndigo).fontSize(8).font('Helvetica-Bold').text('DELIVERY & SHIPPING ADDRESS', 312, 125);
    doc.fillColor(darkText).fontSize(8).font('Helvetica').text(challan.customer.address, 312, 139, { width: 248, lineGap: 2 });

    let tableTop = 196;
    doc.rect(25, tableTop, 545, 20).fill('#334155');
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    doc.text('#', 35, tableTop + 6, { width: 25, align: 'center' });
    doc.text('ITEM DESCRIPTION & SKU CODE', 65, tableTop + 6, { width: 245, align: 'left' });
    doc.text('UNIT PRICE (INR)', 320, tableTop + 6, { width: 90, align: 'right' });
    doc.text('QTY', 420, tableTop + 6, { width: 45, align: 'center' });
    doc.text('SUBTOTAL (INR)', 475, tableTop + 6, { width: 85, align: 'right' });

    let y = tableTop + 20;
    challan.items.forEach((item: any, index: number) => {
      const rowBg = index % 2 === 0 ? '#FFFFFF' : lightBg;
      doc.rect(25, y, 545, 24).fill(rowBg);
      doc.rect(25, y, 545, 24).stroke('#F1F5F9');

      doc.fillColor(darkText).fontSize(8).font('Helvetica').text(`${index + 1}`, 35, y + 7, { width: 25, align: 'center' });
      doc.fillColor(darkText).fontSize(8).font('Helvetica-Bold').text(`${item.productName} `, 65, y + 7, { continued: true, width: 245 });
      doc.fillColor(mutedText).fontSize(7.5).font('Helvetica').text(`(SKU: ${item.sku})`);

      doc.fillColor(darkText).fontSize(8).font('Helvetica').text(
        `Rs. ${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        320,
        y + 7,
        { width: 90, align: 'right' }
      );
      doc.font('Helvetica-Bold').text(`${item.quantity}`, 420, y + 7, { width: 45, align: 'center' });
      doc.font('Helvetica-Bold').text(
        `Rs. ${item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        475,
        y + 7,
        { width: 85, align: 'right' }
      );

      y += 24;
    });

    y += 8;
    doc.rect(25, y, 545, 45).fill(lightBg);
    doc.rect(25, y, 545, 45).stroke(borderCol);

    doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Total Items Dispatched:', 35, y + 8);
    doc.fillColor(darkText).font('Helvetica-Bold').text(`${challan.items.length} Product Lines`, 145, y + 8);

    doc.fillColor(mutedText).font('Helvetica').text('Total Quantity:', 35, y + 24);
    doc.fillColor(darkText).font('Helvetica-Bold').text(`${challan.totalQty} Units`, 145, y + 24);

    doc.rect(335, y + 6, 225, 33).fill(primaryNavy);
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text('GRAND TOTAL AMOUNT:', 345, y + 10);
    doc.fillColor('#34D399').fontSize(12).font('Helvetica-Bold').text(
      `Rs. ${challan.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      345,
      y + 20
    );

    let footerY = y + 51;
    doc.rect(25, footerY, 350, 48).stroke(borderCol);
    doc.fillColor(darkText).fontSize(8).font('Helvetica-Bold').text('DECLARATION & TERMS OF SALE:', 35, footerY + 6);
    doc.fontSize(7).font('Helvetica').fillColor(mutedText);
    doc.text('1. Goods once sold & dispatched will not be accepted back without return memo.', 35, footerY + 18, { width: 330 });
    doc.text('2. Please check all packages and seal integrity at time of delivery.', 35, footerY + 28, { width: 330 });
    doc.text('3. This is an official computer-generated Delivery Challan document.', 35, footerY + 38, { width: 330 });

    doc.rect(385, footerY, 185, 48).stroke(borderCol);
    doc.fillColor(mutedText).fontSize(7).font('Helvetica').text('For APEX WHOLESALE & DISTRIBUTION', 390, footerY + 6, { align: 'center', width: 175 });

    doc.strokeColor(accentIndigo).lineWidth(0.8).dash(3, { space: 2 }).moveTo(405, footerY + 30).lineTo(550, footerY + 30).stroke();
    doc.undash();

    doc.fillColor(darkText).fontSize(7.5).font('Helvetica-Bold').text('AUTHORIZED SIGNATORY', 390, footerY + 34, { align: 'center', width: 175 });

    let bottomBarY = footerY + 54;
    doc.fontSize(7).font('Helvetica').fillColor('#94A3B8').text(
      `Apex ERP & CRM Operations Portal | Invoice Reference: ${challan.challanNumber}`,
      25,
      bottomBarY,
      { align: 'center', width: 545 }
    );

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
}
