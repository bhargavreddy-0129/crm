import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthenticatedRequest } from '../types';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  try {
    const [
      totalCustomers,
      leadCustomers,
      activeCustomers,
      totalProducts,
      allProducts,
      totalChallans,
      confirmedChallans,
      draftChallans,
      recentChallans,
      recentFollowUps,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'Lead' } }),
      prisma.customer.count({ where: { status: 'Active' } }),
      prisma.product.count(),
      prisma.product.findMany({ select: { currentStock: true, minStockAlert: true } }),
      prisma.challan.count(),
      prisma.challan.findMany({
        where: { status: 'Confirmed' },
        select: { totalAmount: true },
      }),
      prisma.challan.count({ where: { status: 'Draft' } }),
      prisma.challan.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, businessName: true } },
        },
      }),
      prisma.followUp.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
          user: { select: { name: true, role: true } },
        },
      }),
    ]);

    // Count low stock products
    const lowStockCount = allProducts.filter((p) => p.currentStock <= p.minStockAlert).length;

    // Calculate confirmed revenue
    const totalRevenue = confirmedChallans.reduce((sum, c) => sum + c.totalAmount, 0);

    return res.json({
      success: true,
      stats: {
        totalCustomers,
        leadCustomers,
        activeCustomers,
        totalProducts,
        lowStockCount,
        totalChallans,
        draftChallansCount: draftChallans,
        confirmedChallansCount: confirmedChallans.length,
        totalRevenue,
      },
      recentChallans,
      recentFollowUps,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
}
