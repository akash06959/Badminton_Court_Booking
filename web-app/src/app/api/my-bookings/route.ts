import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const user_name = searchParams.get('user_name');

    if (!user_name) return NextResponse.json({ error: "User name required" }, { status: 400 });

    try {
        const bookingsRes = await pool.query(
            `SELECT * FROM bookings WHERE user_name = $1 ORDER BY start_time DESC`,
            [user_name]
        );
        const bookings = bookingsRes.rows;

        if (bookings.length === 0) return NextResponse.json([]);

        const bookingIds = bookings.map((b: any) => b.id);
        const itemsRes = await pool.query(`
            SELECT bi.*, 
                COALESCE(c.name, ch.name, e.name) as resource_name
            FROM booking_items bi
            LEFT JOIN courts c ON bi.resource_type = 'court' AND bi.resource_id = c.id
            LEFT JOIN coaches ch ON bi.resource_type = 'coach' AND bi.resource_id = ch.id
            LEFT JOIN equipment e ON bi.resource_type = 'equipment' AND bi.resource_id = e.id
            WHERE bi.booking_id = ANY($1::int[])
        `, [bookingIds]);

        const result = bookings.map((booking: any) => {
            return {
                ...booking,
                items: itemsRes.rows.filter((item: any) => item.booking_id === booking.id)
            };
        });

        return NextResponse.json(result);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
