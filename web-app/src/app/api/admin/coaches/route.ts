import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { name, bio, hourly_rate } = await req.json();
        await pool.query(
            "INSERT INTO coaches (name, bio, hourly_rate) VALUES ($1, $2, $3)",
            [name, bio, hourly_rate]
        );
        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
