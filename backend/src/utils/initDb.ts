import { execSync } from 'child_process';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export async function autoInitDatabase() {
  try {
    console.log('🔄 Checking database connection and schema...');
    try {
      await prisma.$connect();
      console.log('✅ Database connection established.');
    } catch (connErr) {
      console.error('❌ Failed connecting to database:', connErr);
      return;
    }

    try {
      await prisma.user.count();
    } catch (tableErr) {
      console.log('⚠️ Database tables missing. Pushing Prisma schema to PostgreSQL...');
      try {
        const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        execSync('npx prisma db push --accept-data-loss', {
          stdio: 'inherit',
          env: {
            ...process.env,
            ...(dbUrl && { DATABASE_URL: dbUrl.trim() }),
          },
        });
        console.log('✅ Prisma schema pushed successfully.');
      } catch (pushErr) {
        console.error('❌ Prisma db push error:', pushErr);
      }
    }

    const userCount = await prisma.user.count().catch(() => 0);
    if (userCount === 0) {
      console.log('🌱 Seeding default role users...');
      const passwordHash = await bcrypt.hash('Password123', 10);

      await prisma.user.createMany({
        data: [
          {
            email: 'admin@company.com',
            password: passwordHash,
            name: 'Arjun singh (Admin)',
            role: 'ADMIN',
          },
          {
            email: 'sales@company.com',
            password: passwordHash,
            name: 'Sarah Connor (Sales)',
            role: 'SALES',
          },
          {
            email: 'warehouse@company.com',
            password: passwordHash,
            name: 'Walter White (Warehouse)',
            role: 'WAREHOUSE',
          },
          {
            email: 'accounts@company.com',
            password: passwordHash,
            name: 'Amy Santiago (Accounts)',
            role: 'ACCOUNTS',
          },
        ],
        skipDuplicates: true,
      });

      console.log('✅ Pre-seeded 4 default role users successfully!');
    } else {
      console.log(`✅ Database ready. ${userCount} users present.`);
    }
  } catch (error) {
    console.error('⚠️ Database auto-init notice:', error);
  }
}
