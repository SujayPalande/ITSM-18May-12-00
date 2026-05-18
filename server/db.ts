import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// MySQL local database configuration (itsm_helpdesk)
const mysqlConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'itsm_helpdesk',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  charset: process.env.DB_CHARSET || 'utf8mb4',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
};

console.log(`🔗 Connecting to MySQL database: ${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}`);
export const connection = mysql.createPool(mysqlConfig);
export const db = drizzle(connection, { schema, mode: 'default' });