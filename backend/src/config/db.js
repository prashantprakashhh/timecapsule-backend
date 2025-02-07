// backend/src/config/db.js
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: process.env.DB_HOST || '34.34.145.67',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'admin',
  database: process.env.DB_NAME || 'capsuledb',
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect()
  .then(() => console.log("PostgreSQL connected."))
  .catch(err => console.error("Connection error", err.stack));

// Export the client so other files can use it
export default client;
