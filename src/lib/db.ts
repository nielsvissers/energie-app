// src/lib/db.ts
import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST || '192.168.1.252',
  user: process.env.DB_USER || 'energydb',
  password: process.env.DB_PASSWORD || 'baU4M(K6lfd9TzaV',
  database: process.env.DB_NAME || 'energie_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});