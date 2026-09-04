const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Drop all foreign key constraints from Project table
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
          constraint_name text;
      BEGIN
          FOR constraint_name IN
              SELECT conname::text
              FROM pg_constraint
              WHERE conrelid = '"Project"'::regclass
              AND contype = 'f'
          LOOP
              EXECUTE 'ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
              RAISE NOTICE 'Dropped constraint: %', constraint_name;
          END LOOP;
      END $$;
    `);

    // Drop all foreign key constraints from Task table (except projectId)
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
          constraint_name text;
      BEGIN
          FOR constraint_name IN
              SELECT conname::text
              FROM pg_constraint
              WHERE conrelid = '"Task"'::regclass
              AND contype = 'f'
              AND confrelid = '"User"'::regclass
          LOOP
              EXECUTE 'ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
              RAISE NOTICE 'Dropped constraint: %', constraint_name;
          END LOOP;
      END $$;
    `);

    console.log('Successfully dropped all User foreign key constraints');
  } catch (error) {
    console.error('Error dropping constraints:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
