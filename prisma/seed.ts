import { PrismaClient, Role } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check if super admin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (existingSuperAdmin) {
    console.log('Super admin already exists, skipping seed');
    return;
  }

  // Create the master institution
  const eduhubHQ = await prisma.institution.create({
    data: {
      name: 'Eduhub Master Tenant',
      joinCode: 'MASTER-KEY-DO-NOT-USE',
    },
  });

  console.log('Created institution:', eduhubHQ);

  // Hash the password
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create the super admin user
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superAdmin@eduhub.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Super Admin',
      role: Role.SUPER_ADMIN,
      institutionId: eduhubHQ.id,
    },
  });

  console.log('Created super admin user:', superAdmin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });