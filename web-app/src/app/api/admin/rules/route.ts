import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const result = await pool.query('SELECT * FROM pricing_rules ORDER BY id');
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, type, value, conditions } = await req.json();
        const conditionsVal = typeof conditions === 'string' ? conditions : JSON.stringify(conditions);

        await pool.query(
            "INSERT INTO pricing_rules (name, type, value, conditions) VALUES ($1, $2, $3, $4)",
            [name, type, value, conditionsVal]
        );
        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
