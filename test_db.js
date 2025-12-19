const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
    try {
        console.log('Connecting to:', process.env.DATABASE_URL);
        const client = await pool.connect();
        console.log('Connected successfully!');

        const res = await client.query("SELECT to_regclass('public.courts')");
        console.log('Table "courts" exists:', res.rows[0].to_regclass !== null);

        if (res.rows[0].to_regclass) {
            const count = await client.query('SELECT count(*) FROM courts');
            console.log('Row count in courts:', count.rows[0].count);
        }

        client.release();
        pool.end();
    } catch (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
}

testConnection();
