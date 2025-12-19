import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { name, type, base_price_per_hour } = await req.json();
        await pool.query(
            "INSERT INTO courts (name, type, base_price_per_hour) VALUES ($1, $2, $3)",
            [name, type, base_price_per_hour]
        );
        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
