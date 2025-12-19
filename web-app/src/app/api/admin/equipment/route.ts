import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { name, total_quantity, price_per_use } = await req.json();
        await pool.query(
            "INSERT INTO equipment (name, total_quantity, price_per_use) VALUES ($1, $2, $3)",
            [name, total_quantity, price_per_use]
        );
        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
