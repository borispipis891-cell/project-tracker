const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating existing projects...');

  // Получаем первого пользователя (или создаём системного)
  let defaultUser = await prisma.user.findFirst();

  if (!defaultUser) {
    console.log('No users found, creating system user...');
    const bcrypt = require('bcryptjs');
    const password = await bcrypt.hash('admin123', 12);

    defaultUser = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@system.local',
        password,
        emailVerified: true,
        role: 'admin',
      },
    });
    console.log('System user created:', defaultUser.email);
  }

  // Обновляем проекты без владельца
  const projectsWithoutOwner = await prisma.project.findMany({
    where: { ownerId: null },
  });

  console.log(`Found ${projectsWithoutOwner.length} projects without owner`);

  for (const project of projectsWithoutOwner) {
    await prisma.project.update({
      where: { id: project.id },
      data: { ownerId: defaultUser.id },
    });

    // Создаём запись в ProjectMember
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: defaultUser.id,
        role: 'owner',
      },
    });

    console.log(`  ✓ Project "${project.name}" assigned to ${defaultUser.name}`);
  }

  console.log('Migration completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
