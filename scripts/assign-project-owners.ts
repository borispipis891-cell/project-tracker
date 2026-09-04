import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignOwners() {
  console.log('🔍 Checking projects without owners...');

  // Найти проекты без владельцев
  const projectsWithoutOwners = await prisma.project.findMany({
    where: {
      ownerId: null,
    },
  });

  if (projectsWithoutOwners.length === 0) {
    console.log('✅ All projects already have owners!');
    return;
  }

  console.log(`Found ${projectsWithoutOwners.length} projects without owners`);

  // Получить первого пользователя (обычно admin)
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!firstUser) {
    console.error('❌ No users found in database. Create a user first.');
    return;
  }

  console.log(`📝 Assigning ownership to: ${firstUser.email}`);

  // Назначить владельца всем проектам
  for (const project of projectsWithoutOwners) {
    await prisma.project.update({
      where: { id: project.id },
      data: { ownerId: firstUser.id },
    });
    console.log(`  ✓ Project #${project.id} "${project.name}"`);
  }

  console.log('✅ Done!');
}

assignOwners()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
