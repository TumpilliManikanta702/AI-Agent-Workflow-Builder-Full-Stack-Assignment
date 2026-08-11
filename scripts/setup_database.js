const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgrespassword@localhost:5432/postgres';

async function setupDB() {
  console.log('Connecting to PostgreSQL database at localhost:5432...');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully.');

    const migrationSql = fs.readFileSync(path.join(__dirname, '../database/migrations/01_init_schema.sql'), 'utf8');
    console.log('Executing database schema migrations (01_init_schema.sql)...');
    await client.query(migrationSql);
    console.log('Schema migration executed successfully.');

    const seedSql = fs.readFileSync(path.join(__dirname, '../database/seed/demo_seed.sql'), 'utf8');
    console.log('Executing database seed data (demo_seed.sql)...');
    await client.query(seedSql);
    console.log('Seed data inserted successfully.');

  } catch (err) {
    console.error('Database Setup Error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDB();
