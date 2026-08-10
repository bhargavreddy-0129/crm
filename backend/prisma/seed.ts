import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing records
  await prisma.challanItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.stockLog.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users for all 4 roles
  const passwordHash = await bcrypt.hash('Password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@company.com',
      password: passwordHash,
      name: 'Arjun singh (Admin)',
      role: 'ADMIN',
    },
  });

  const sales = await prisma.user.create({
    data: {
      email: 'sales@company.com',
      password: passwordHash,
      name: 'Sarah Connor (Sales)',
      role: 'SALES',
    },
  });

  const warehouse = await prisma.user.create({
    data: {
      email: 'warehouse@company.com',
      password: passwordHash,
      name: 'Walter White (Warehouse)',
      role: 'WAREHOUSE',
    },
  });

  const accounts = await prisma.user.create({
    data: {
      email: 'accounts@company.com',
      password: passwordHash,
      name: 'Amy Santiago (Accounts)',
      role: 'ACCOUNTS',
    },
  });

  console.log('✅ Created 4 Role Users (Admin, Sales, Warehouse, Accounts)');

  // 3. Create Sample Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Rajesh Kumar',
      mobile: '+919876543210',
      email: 'rajesh@apexdistributors.com',
      businessName: 'Apex Wholesale & Distributors',
      gstNumber: '27AAAAA0000A1Z5',
      customerType: 'Distributor',
      address: '104 Industrial Area Phase 2, Mumbai, Maharashtra 400093',
      status: 'Active',
      followUpDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
      notes: 'Key distributor for West region. Prefers bulk delivery on Mondays.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Priya Sharma',
      mobile: '+919811223344',
      email: 'priya@metroretail.in',
      businessName: 'Metro Retail Outlets',
      gstNumber: '07BBBCC1111B2Z2',
      customerType: 'Retail',
      address: 'Shop 12, Main Market, Connaught Place, New Delhi 110001',
      status: 'Lead',
      followUpDate: new Date(Date.now() + 86400000 * 1), // Tomorrow
      notes: 'Interested in electronic accessories range. Sent product catalog.',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Vikram Mehta',
      mobile: '+919933445566',
      email: 'vikram@horizontraders.com',
      businessName: 'Horizon Wholesale Mart',
      gstNumber: '29DDDFF3333D4Z9',
      customerType: 'Wholesale',
      address: '88 Commercial Street, Bengaluru, Karnataka 560001',
      status: 'Active',
      followUpDate: new Date(Date.now() + 86400000 * 5),
      notes: 'High credit rating. Regular monthly buyer.',
    },
  });

  console.log('✅ Created sample customers');

  // Add follow-up notes for customer 1
  await prisma.followUp.create({
    data: {
      customerId: customer1.id,
      note: 'Initial inquiry regarding bulk price discounts for Q3.',
      createdBy: sales.id,
    },
  });

  await prisma.followUp.create({
    data: {
      customerId: customer1.id,
      note: 'Sent revised quotation with 12% distributor discount.',
      createdBy: sales.id,
    },
  });

  // 4. Create Sample Products
  const prod1 = await prisma.product.create({
    data: {
      name: 'Wireless Ergonomic Mouse X200',
      sku: 'PRD-MOUSE-001',
      category: 'Electronics',
      unitPrice: 1250.0,
      currentStock: 45,
      minStockAlert: 10,
      location: 'Warehouse A - Shelf 4B',
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      name: 'Mechanical RGB Keyboard K90',
      sku: 'PRD-KEYB-002',
      category: 'Electronics',
      unitPrice: 3499.0,
      currentStock: 3, // Low stock alert!
      minStockAlert: 10,
      location: 'Warehouse A - Shelf 2A',
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400',
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      name: 'USB-C Fast Charging Cable 2M',
      sku: 'PRD-CABL-003',
      category: 'Accessories',
      unitPrice: 450.0,
      currentStock: 120,
      minStockAlert: 20,
      location: 'Warehouse B - Bin 12',
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      name: 'UltraWide 34" Curved Monitor',
      sku: 'PRD-MON-004',
      category: 'Displays',
      unitPrice: 28990.0,
      currentStock: 8,
      minStockAlert: 5,
      location: 'Warehouse C - High Value Bay',
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
    },
  });

  console.log('✅ Created sample products');

  // Initial Stock Logs
  await prisma.stockLog.createMany({
    data: [
      {
        productId: prod1.id,
        changeQty: 50,
        movementType: 'IN',
        reason: 'Initial Inventory Stocking',
        createdBy: warehouse.id,
      },
      {
        productId: prod2.id,
        changeQty: 20,
        movementType: 'IN',
        reason: 'Initial Inventory Stocking',
        createdBy: warehouse.id,
      },
      {
        productId: prod3.id,
        changeQty: 150,
        movementType: 'IN',
        reason: 'Bulk Vendor Received',
        createdBy: warehouse.id,
      },
    ],
  });

  // 5. Create Sample Sales Challans
  const challan1 = await prisma.challan.create({
    data: {
      challanNumber: 'CHN-2026-0001',
      customerId: customer1.id,
      totalQty: 5,
      totalAmount: 6250.0,
      status: 'Confirmed',
      createdBy: sales.id,
      items: {
        create: [
          {
            productId: prod1.id,
            productName: prod1.name,
            sku: prod1.sku,
            unitPrice: prod1.unitPrice,
            quantity: 5,
            subtotal: 6250.0,
          },
        ],
      },
    },
  });

  // Stock deduction log for confirmed challan
  await prisma.stockLog.create({
    data: {
      productId: prod1.id,
      changeQty: 5,
      movementType: 'OUT',
      reason: 'Dispatched via Sales Challan CHN-2026-0001',
      createdBy: sales.id,
    },
  });

  const challan2 = await prisma.challan.create({
    data: {
      challanNumber: 'CHN-2026-0002',
      customerId: customer3.id,
      totalQty: 2,
      totalAmount: 6998.0,
      status: 'Draft',
      createdBy: sales.id,
      items: {
        create: [
          {
            productId: prod2.id,
            productName: prod2.name,
            sku: prod2.sku,
            unitPrice: prod2.unitPrice,
            quantity: 2,
            subtotal: 6998.0,
          },
        ],
      },
    },
  });

  console.log('✅ Created sample sales challans');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
