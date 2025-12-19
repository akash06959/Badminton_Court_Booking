import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Add this block to support the ?sslmode=require in your URL
    ssl: {
        rejectUnauthorized: false
    }
});

export default pool;
