import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { calculateDynamicPrice } from '@/lib/pricing';

// GET: Get Bookings (Availability Check)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const resource_type = searchParams.get('resource_type');
    const resource_id = searchParams.get('resource_id');

    if (!date) return NextResponse.json({ error: "Date required" }, { status: 400 });

    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;

    try {
        let query = `
            SELECT start_time, end_time, resource_type, resource_id
            FROM booking_items
            WHERE status = 'confirmed'
            AND tsrange(start_time, end_time, '[)') && tsrange($1, $2, '[)')
        `;
        const params: any[] = [startOfDay, endOfDay];

        if (resource_type && resource_id) {
            query += ` AND resource_type = $3 AND resource_id = $4`;
            params.push(resource_type, resource_id);
        }

        const result = await pool.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create Booking
export async function POST(req: Request) {
    const { user_name, start_time, end_time, items } = await req.json();

    if (!user_name || !start_time || !end_time || !items || items.length === 0) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Equipment Availability Check
        for (const item of items) {
            if (item.resource_type === 'equipment') {
                const qty = item.quantity || 1;

                const invQuery = `
                  WITH inventory AS (
                     SELECT total_quantity FROM equipment WHERE id = $1
                  ),
                  usage AS (
                     SELECT COALESCE(SUM(quantity), 0) as used 
                     FROM booking_items 
                     WHERE resource_type = 'equipment' 
                     AND resource_id = $1 
                     AND status = 'confirmed'
                     AND tsrange(start_time, end_time, '[)') && tsrange($2, $3, '[)')
                  )
                  SELECT i.total_quantity, u.used 
                  FROM inventory i, usage u
                `;
                const invRes = await client.query(invQuery, [item.resource_id, start_time, end_time]);

                if (invRes.rows.length === 0) throw new Error(`Equipment ${item.resource_id} not found`);
                const { total_quantity, used } = invRes.rows[0];

                if (parseInt(used) + qty > parseInt(total_quantity)) {
                    throw new Error(`Not enough equipment (ID: ${item.resource_id}) available.`);
                }
            }
        }

        // 2. Calculate Final Price
        const totalPrice = await calculateDynamicPrice(client, items, start_time, end_time);

        // 3. Create Booking Header
        const bookingRes = await client.query(
            `INSERT INTO bookings (user_name, start_time, end_time, total_price, status)
             VALUES ($1, $2, $3, $4, 'confirmed')
             RETURNING id`,
            [user_name, start_time, end_time, totalPrice]
        );
        const bookingId = bookingRes.rows[0].id;

        // 4. Create Booking Items
        for (const item of items) {
            await client.query(
                `INSERT INTO booking_items (booking_id, resource_type, resource_id, quantity, start_time, end_time, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')`,
                [bookingId, item.resource_type, item.resource_id, item.quantity || 1, start_time, end_time]
            );
        }

        await client.query('COMMIT');

        return NextResponse.json({
            message: 'Booking successful',
            booking_id: bookingId,
            total_price: totalPrice
        }, { status: 201 });

    } catch (err: any) {
        await client.query('ROLLBACK');

        if (err.code === '23P01') {
            return NextResponse.json({ error: 'One or more selected resources are already booked for this time slot.' }, { status: 409 });
        }

        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    } finally {
        client.release();
    }
}
