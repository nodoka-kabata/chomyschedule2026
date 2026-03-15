import createKnex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'choms_schedule'
  },
  pool: { min: 2, max: 10 }
};

const db = createKnex(config);

export default db;
