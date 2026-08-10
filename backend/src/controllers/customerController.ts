import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AuthenticatedRequest } from '../types';

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().min(5, 'Mobile number is required'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(2, 'Business name is required'),
  gstNumber: z.string().optional().nullable(),
  customerType: z.enum(['Retail', 'Wholesale', 'Distributor']),
  address: z.string().min(3, 'Address is required'),
  status: z.enum(['Lead', 'Active', 'Inactive']).default('Lead'),
  followUpDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function getCustomers(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const customerType = (req.query.customerType as string) || '';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { businessName: { contains: search } },
        { mobile: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerType) {
      where.customerType = customerType;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { followUps: true, challans: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return res.json({
      success: true,
      data: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
}

export async function getCustomerById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUps: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    return res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Error fetching customer detail:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer detail' });
  }
}

export async function createCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const parseResult = customerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten(),
      });
    }

    const data = parseResult.data;
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        mobile: data.mobile,
        email: data.email,
        businessName: data.businessName,
        gstNumber: data.gstNumber || null,
        customerType: data.customerType,
        address: data.address,
        status: data.status,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        notes: data.notes || null,
      },
    });

    // Automatically create initial follow-up note if notes provided
    if (data.notes && req.user) {
      await prisma.followUp.create({
        data: {
          customerId: customer.id,
          note: `Initial customer creation note: ${data.notes}`,
          createdBy: req.user.userId,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ success: false, message: 'Failed to create customer' });
  }
}

export async function updateCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const parseResult = customerSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten(),
      });
    }

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const data = parseResult.data;
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.mobile && { mobile: data.mobile }),
        ...(data.email && { email: data.email }),
        ...(data.businessName && { businessName: data.businessName }),
        ...(data.gstNumber !== undefined && { gstNumber: data.gstNumber || null }),
        ...(data.customerType && { customerType: data.customerType }),
        ...(data.address && { address: data.address }),
        ...(data.status && { status: data.status }),
        ...(data.followUpDate !== undefined && {
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });

    return res.json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ success: false, message: 'Failed to update customer' });
  }
}

export async function addFollowUpNote(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { note, followUpDate } = req.body;

    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const followUp = await prisma.followUp.create({
      data: {
        customerId: id,
        note: note.trim(),
        createdBy: req.user!.userId,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    // Optionally update customer followUpDate
    if (followUpDate) {
      await prisma.customer.update({
        where: { id },
        data: { followUpDate: new Date(followUpDate) },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Follow-up note added',
      data: followUp,
    });
  } catch (error) {
    console.error('Error adding follow-up note:', error);
    return res.status(500).json({ success: false, message: 'Failed to add follow-up note' });
  }
}
