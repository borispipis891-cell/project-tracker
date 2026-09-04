import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  let admin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Администратор',
        password: hashedPassword,
        role: 'admin',
        emailVerified: true,
        status: 'active',
        plan: 'free',
      },
    });
    console.log('✅ Admin user created:', admin.email);
  } else {
    console.log('ℹ️  Admin user already exists:', admin.email);
  }

  // Create test user
  const testUserPassword = await bcrypt.hash('user123', 10);

  let testUser = await prisma.user.findUnique({
    where: { email: 'user@example.com' },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Тестовый пользователь',
        password: testUserPassword,
        role: 'user',
        emailVerified: true,
        status: 'active',
        plan: 'free',
      },
    });
    console.log('✅ Test user created:', testUser.email);
  } else {
    console.log('ℹ️  Test user already exists:', testUser.email);
  }

  // Create test project
  let project = await prisma.project.findFirst({
    where: { name: 'Тестовый проект' },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Тестовый проект',
        receivedAt: new Date().toISOString(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'Тестовый клиент',
        pss: 'ПСС-001',
        reg: 'РЕГ-001',
        status: 'progress',
        priority: 'high',
        responsible: 'Иванов И.И.',
        engineer: 'Петров П.П.',
        color: '#3B82F6',
        tags: ['важный', 'срочный'],
        ownerId: admin.id,
      },
    });
    console.log('✅ Test project created:', project.name);
  } else {
    console.log('ℹ️  Test project already exists:', project.name);
  }

  // Create test tasks
  const tasks = [
    {
      title: 'Анализ требований',
      status: 'done',
      receivedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      responsible: 'Иванов И.И.',
      engineer: 'Петров П.П.',
      projectId: project.id,
    },
    {
      title: 'Разработка архитектуры',
      status: 'done',
      receivedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      responsible: 'Иванов И.И.',
      engineer: 'Петров П.П.',
      projectId: project.id,
    },
    {
      title: 'Реализация backend',
      status: 'in_progress',
      receivedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      responsible: 'Петров П.П.',
      engineer: 'Сидоров С.С.',
      projectId: project.id,
    },
    {
      title: 'Разработка UI',
      status: 'in_progress',
      receivedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      responsible: 'Иванов И.И.',
      engineer: 'Козлов К.К.',
      projectId: project.id,
    },
    {
      title: 'Интеграционное тестирование',
      status: 'todo',
      receivedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      responsible: 'Тестировщик Т.Т.',
      projectId: project.id,
    },
    {
      title: 'Исправление критического бага',
      status: 'blocked',
      receivedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      responsible: 'Петров П.П.',
      engineer: 'Сидоров С.С.',
      projectId: project.id,
    },
  ];

  for (const taskData of tasks) {
    const task = await prisma.task.create({
      data: taskData,
    });
    console.log('✅ Task created:', task.title);
  }

  // Add project member
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: testUser.id,
      role: 'editor',
    },
  });

  console.log('✅ Project member added');

  console.log('\n🎉 Seed completed!');
  console.log('\n📝 Login credentials:');
  console.log('Admin: admin@example.com / admin123');
  console.log('User:  user@example.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
