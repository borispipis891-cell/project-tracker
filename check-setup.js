#!/usr/bin/env node

/**
 * Скрипт для проверки готовности системы к запуску
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Проверка готовности системы...\n');

let hasErrors = false;

// 1. Проверка .env файла
console.log('1️⃣  Проверка .env файла...');
if (!fs.existsSync('.env')) {
  console.log('   ❌ Файл .env не найден');
  console.log('   💡 Скопируйте .env.example в .env');
  hasErrors = true;
} else {
  const envContent = fs.readFileSync('.env', 'utf-8');

  // Проверка DATABASE_URL
  if (envContent.includes('user:password@localhost')) {
    console.log('   ⚠️  DATABASE_URL содержит значения по умолчанию');
    console.log('   💡 Замените "user:password" на реальные данные PostgreSQL');
    hasErrors = true;
  } else {
    console.log('   ✅ .env настроен');
  }

  // Проверка NEXTAUTH_SECRET
  if (envContent.includes('change-me-to-a-random-string')) {
    console.log('   ⚠️  NEXTAUTH_SECRET не изменён');
    console.log('   💡 Запустите: openssl rand -base64 32');
    hasErrors = true;
  }
}

// 2. Проверка node_modules
console.log('\n2️⃣  Проверка зависимостей...');
if (!fs.existsSync('node_modules')) {
  console.log('   ❌ Зависимости не установлены');
  console.log('   💡 Запустите: npm install --legacy-peer-deps');
  hasErrors = true;
} else {
  console.log('   ✅ Зависимости установлены');
}

// 3. Проверка Prisma Client
console.log('\n3️⃣  Проверка Prisma Client...');
if (!fs.existsSync('node_modules/@prisma/client')) {
  console.log('   ❌ Prisma Client не сгенерирован');
  console.log('   💡 Запустите: npx prisma generate');
  hasErrors = true;
} else {
  console.log('   ✅ Prisma Client готов');
}

// 4. Проверка подключения к PostgreSQL
console.log('\n4️⃣  Проверка подключения к базе данных...');
try {
  execSync('npx prisma db pull --force', { stdio: 'pipe', encoding: 'utf-8' });
  console.log('   ✅ PostgreSQL доступен');

  // Проверка миграций
  console.log('\n5️⃣  Проверка миграций...');
  const migrationsDir = path.join('prisma', 'migrations');
  if (!fs.existsSync(migrationsDir) || fs.readdirSync(migrationsDir).length === 0) {
    console.log('   ⚠️  Миграции не применены');
    console.log('   💡 Запустите: npx prisma migrate dev --name init');
    hasErrors = true;
  } else {
    console.log('   ✅ Миграции применены');
  }

} catch (error) {
  console.log('   ❌ Не удалось подключиться к PostgreSQL');
  console.log('   💡 Проверьте:');
  console.log('      - PostgreSQL запущен');
  console.log('      - База данных создана');
  console.log('      - Правильность данных в .env');
  hasErrors = true;
}

// 6. Проверка портов
console.log('\n6️⃣  Проверка портов...');
try {
  const { spawn } = require('child_process');
  const netstat = spawn('netstat', ['-an']);

  let output = '';
  netstat.stdout.on('data', (data) => {
    output += data.toString();
  });

  netstat.on('close', (code) => {
    if (output.includes(':3000') && output.includes('LISTENING')) {
      console.log('   ⚠️  Порт 3000 уже занят');
      console.log('   💡 Остановите другой процесс или измените порт');
    } else {
      console.log('   ✅ Порт 3000 свободен');
    }
  });
} catch (error) {
  console.log('   ⚠️  Не удалось проверить порты');
}

// Итоговый отчёт
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Система не готова к запуску');
  console.log('\n📖 Прочитайте SETUP.md для подробных инструкций');
  process.exit(1);
} else {
  console.log('✅ Система готова к запуску!');
  console.log('\n🚀 Запустите: npm run dev');
  console.log('🌐 Откройте: http://localhost:3000');
}
console.log('='.repeat(50) + '\n');
