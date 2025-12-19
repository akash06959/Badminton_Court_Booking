import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Mark Booking as Cancelled
        await client.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);

        // 2. Get the items to release and mark them cancelled too
        const itemsRes = await client.query(
            "UPDATE booking_items SET status = 'cancelled' WHERE booking_id = $1 RETURNING resource_type, resource_id, start_time, end_time",
            [id]
        );

        // 3. Check Waitlist for EACH released item
        for (const item of itemsRes.rows) {
            const waitlistRes = await client.query(`
                SELECT * FROM waitlist 
                WHERE resource_type = $1 
                AND resource_id = $2
                AND status = 'pending'
                AND tsrange(start_time, end_time, '[)') && tsrange($3, $4, '[)')
                ORDER BY created_at ASC
                LIMIT 1
             `, [item.resource_type, item.resource_id, item.start_time, item.end_time]);

            if (waitlistRes.rows.length > 0) {
                const nextUser = waitlistRes.rows[0];
                console.log(`🔔 NOTIFICATION: Slot available! Notifying ${nextUser.user_name} for ${item.resource_type} ${item.resource_id}`);
                // Update waitlist status
                await client.query("UPDATE waitlist SET status = 'notified' WHERE id = $1", [nextUser.id]);
            }
        }

        await client.query('COMMIT');
        return NextResponse.json({ message: "Booking cancelled. Waitlist processed." });

    } catch (err: any) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
        client.release();
    }
}
