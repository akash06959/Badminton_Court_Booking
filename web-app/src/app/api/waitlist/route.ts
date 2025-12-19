import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
    const { user_name, resource_type, resource_id, start_time, end_time } = await req.json();
    try {
        await pool.query(
            `INSERT INTO waitlist (user_name, resource_type, resource_id, start_time, end_time) 
             VALUES ($1, $2, $3, $4, $5)`,
            [user_name, resource_type, resource_id, start_time, end_time]
        );
        return NextResponse.json({ message: "Added to waitlist" }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
