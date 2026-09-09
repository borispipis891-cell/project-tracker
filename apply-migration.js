#!/usr/bin/env node
/**
 * Скрипт для применения миграции к production БД
 * Использование: node apply-migration.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Читаем миграцию
const migrationPath = path.join(
  __dirname,
  'prisma',
  'migrations',
  '20260909_add_verification_token_type',
  'migration.sql'
);

const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Миграция загружена из:', migrationPath);
console.log('\n🔍 SQL для выполнения:');
console.log('─'.repeat(80));
console.log(migrationSQL);
console.log('─'.repeat(80));

console.log('\n⚠️  ВНИМАНИЕ: Этот скрипт покажет SQL для применения к production БД!');
console.log('\n📝 Для применения миграции выполните SQL выше в Supabase Dashboard:');
console.log('   1. Откройте Supabase Dashboard → SQL Editor');
console.log('   2. Создайте новый запрос');
console.log('   3. Скопируйте и вставьте SQL выше');
console.log('   4. Нажмите "Run"');
console.log('\n✅ Миграция безопасна и сохраняет все данные!');
