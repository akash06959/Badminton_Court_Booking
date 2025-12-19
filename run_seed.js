require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
    try {
        const client = await pool.connect();
        console.log("Seeding V2 Data...");

        const sql = fs.readFileSync(path.join(__dirname, 'seed_v2.sql'), 'utf8');

        // Execute the entire SQL file
        await client.query(sql);

        console.log("✅ Seed complete.");
        client.release();
    } catch (e) {
        console.error("❌ Seed Error:", e.message);
        if (e.message.includes("duplicate key")) {
            console.log("ℹ️  Data likely already exists. Skipping.");
        }
    } finally {
        pool.end();
    }
}
seed();
