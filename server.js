require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const {
  parseISO,
  differenceInMinutes,
  getDay,
  getHours,
  isWithinInterval,
  areIntervalsOverlapping,
  setHours,
  setMinutes
} = require('date-fns');

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Database Connection Check
pool.connect().then(client => {
  console.log('✅ Connected to database');
  client.release();
}).catch(err => console.error('❌ DB Connection Error:', err));


// --- HELPER: Pricing Engine ---
async function calculateDynamicPrice(client, items, startTimeStr, endTimeStr) {
  const start = parseISO(startTimeStr);
  const end = parseISO(endTimeStr);
  const durationHours = differenceInMinutes(end, start) / 60;

  if (durationHours <= 0) throw new Error("Invalid duration");

  // 1. Fetch Base Prices for all items
  let baseTotal = 0;

  for (const item of items) {
    if (item.resource_type === 'court') {
      const res = await client.query('SELECT base_price_per_hour FROM courts WHERE id = $1', [item.resource_id]);
      if (res.rows.length === 0) throw new Error(`Court ${item.resource_id} not found`);
      baseTotal += parseFloat(res.rows[0].base_price_per_hour) * durationHours;
    }
    else if (item.resource_type === 'coach') {
      const res = await client.query('SELECT hourly_rate FROM coaches WHERE id = $1', [item.resource_id]);
      if (res.rows.length === 0) throw new Error(`Coach ${item.resource_id} not found`);
      baseTotal += parseFloat(res.rows[0].hourly_rate) * durationHours;
    }
    else if (item.resource_type === 'equipment') {
      const res = await client.query('SELECT price_per_use FROM equipment WHERE id = $1', [item.resource_id]);
      if (res.rows.length === 0) throw new Error(`Equipment ${item.resource_id} not found`);
      // Equipment is flat fee per use (per booking) in this model
      baseTotal += parseFloat(res.rows[0].price_per_use) * (item.quantity || 1);
    }
  }

  // 2. Fetch Active Pricing Rules
  const rulesRes = await client.query('SELECT * FROM pricing_rules WHERE is_active = true');
  const rules = rulesRes.rows;

  let multiplier = 1.0;
  let flatFees = 0;

  // 3. Apply Rules
  const dayOfWeek = getDay(start); // 0 = Sun, 6 = Sat
  const startHour = getHours(start);

  for (const rule of rules) {
    const conditions = rule.conditions;
    let applies = true;

    // Condition: Days of Week
    if (conditions.days_of_week && !conditions.days_of_week.includes(dayOfWeek)) {
      applies = false;
    }

    // Condition: Time Range (Peak Hours)
    // Check if usage overlaps with the rule window? 
    // Simplified: Check if start hour matches rule window
    if (conditions.start_hour !== undefined && conditions.end_hour !== undefined) {
      if (startHour < conditions.start_hour || startHour >= conditions.end_hour) {
        applies = false;
      }
    }

    if (applies) {
      console.log(`Applying Rule: ${rule.name}`);
      if (rule.type === 'multiplier') {
        // Multipliers stack multiplicatively? or Additively? 
        // Prompt says "Rules should stack". Usually 20% + 50% = 1.7x or 1.2 * 1.5 = 1.8x. 
        // Implementation: Chain multiplication.
        multiplier *= parseFloat(rule.value);
      } else if (rule.type === 'flat_fee') {
        flatFees += parseFloat(rule.value);
      }
    }
  }

  const finalPrice = (baseTotal * multiplier) + flatFees;
  return parseFloat(finalPrice.toFixed(2));
}

// --- ROUTE: Create Booking (Atomic Transaction) ---
app.post('/api/bookings', async (req, res) => {
  const { user_name, start_time, end_time, items } = req.body;
  // Items format: [{ resource_type: 'court', resource_id: 1 }, { resource_type: 'equipment', resource_id: 1, quantity: 2 }]

  if (!user_name || !start_time || !end_time || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start Transaction

    // 1. Equipment Availability Check (Manual)
    // Courts & Coaches are handled by DB Constraints, but Equipment is Count-based.
    for (const item of items) {
      if (item.resource_type === 'equipment') {
        const qty = item.quantity || 1;

        // Check inventory
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

    await client.query('COMMIT'); // Commit Transaction

    res.status(201).json({
      message: 'Booking successful',
      booking_id: bookingId,
      total_price: totalPrice
    });

  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on ANY error

    // Handle Constraint Violations (Overlaps)
    if (err.code === '23P01') {
      return res.status(409).json({ error: 'One or more selected resources are already booked for this time slot.' });
    }

    console.error('Booking Transaction Failed:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  } finally {
    client.release();
  }
});


// --- GET Routes for Frontend ---

// Get Courts
app.get('/api/courts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courts ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Coaches
app.get('/api/coaches', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coaches ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Equipment
app.get('/api/equipment', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Bookings (for a specific date/court to disable slots)
app.get('/api/bookings', async (req, res) => {
  const { date, resource_type, resource_id } = req.query;
  if (!date) return res.status(400).json({ error: "Date required" });

  // Returns all busy slots for the given date (simple view)
  const startOfDay = `${date} 00:00:00`;
  const endOfDay = `${date} 23:59:59`;

  try {
    let query = `
        SELECT start_time, end_time, resource_type, resource_id
        FROM booking_items
        WHERE status = 'confirmed'
        AND tsrange(start_time, end_time, '[)') && tsrange($1, $2, '[)')
      `;
    // Optionally filter by specific resource if requested
    const params = [startOfDay, endOfDay];

    if (resource_type && resource_id) {
      query += ` AND resource_type = $3 AND resource_id = $4`;
      params.push(resource_type, resource_id);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// --- ADMIN ROUTES ---

// Create Court
app.post('/api/admin/courts', async (req, res) => {
  const { name, type, base_price_per_hour } = req.body;
  try {
    await pool.query(
      "INSERT INTO courts (name, type, base_price_per_hour) VALUES ($1, $2, $3)",
      [name, type, base_price_per_hour]
    );
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete Court
app.delete('/api/admin/courts/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM courts WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create Coach
app.post('/api/admin/coaches', async (req, res) => {
  const { name, bio, hourly_rate } = req.body;
  try {
    await pool.query(
      "INSERT INTO coaches (name, bio, hourly_rate) VALUES ($1, $2, $3)",
      [name, bio, hourly_rate]
    );
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete Coach
app.delete('/api/admin/coaches/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM coaches WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create Equipment
app.post('/api/admin/equipment', async (req, res) => {
  const { name, total_quantity, price_per_use } = req.body;
  try {
    await pool.query(
      "INSERT INTO equipment (name, total_quantity, price_per_use) VALUES ($1, $2, $3)",
      [name, total_quantity, price_per_use]
    );
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete Equipment
app.delete('/api/admin/equipment/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM equipment WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Rules (Admin View - shows active & inactive)
app.get('/api/admin/rules', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pricing_rules ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create Rule
app.post('/api/admin/rules', async (req, res) => {
  const { name, type, value, conditions } = req.body;
  try {
    // Ensure conditions is a valid JSON string or object
    const conditionsVal = typeof conditions === 'string' ? conditions : JSON.stringify(conditions);

    await pool.query(
      "INSERT INTO pricing_rules (name, type, value, conditions) VALUES ($1, $2, $3, $4)",
      [name, type, value, conditionsVal]
    );
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Rule Status
app.patch('/api/admin/rules/:id', async (req, res) => {
  const { is_active } = req.body;
  try {
    await pool.query(
      "UPDATE pricing_rules SET is_active = $1 WHERE id = $2",
      [is_active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- WAITLIST & CANCELLATION ---

// Join Waitlist
app.post('/api/waitlist', async (req, res) => {
  const { user_name, resource_type, resource_id, start_time, end_time } = req.body;
  try {
    await pool.query(
      `INSERT INTO waitlist (user_name, resource_type, resource_id, start_time, end_time) 
             VALUES ($1, $2, $3, $4, $5)`,
      [user_name, resource_type, resource_id, start_time, end_time]
    );
    res.status(201).json({ message: "Added to waitlist" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cancel Booking & Notify Waitlist
app.post('/api/bookings/:id/cancel', async (req, res) => {
  const bookingId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Mark Booking as Cancelled
    await client.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [bookingId]);

    // 2. Get the items to release and mark them cancelled too
    const itemsRes = await client.query(
      "UPDATE booking_items SET status = 'cancelled' WHERE booking_id = $1 RETURNING resource_type, resource_id, start_time, end_time",
      [bookingId]
    );

    // 3. Check Waitlist for EACH released item
    for (const item of itemsRes.rows) {
      // Find pending waitlist users for this specific slot
      // Overlap logic: waitlist request overlaps with the released slot
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
    res.json({ message: "Booking cancelled. Waitlist processed." });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});


// Route: Get User Booking History
app.get('/api/my-bookings', async (req, res) => {
  const { user_name } = req.query;
  if (!user_name) return res.status(400).json({ error: "User name required" });

  try {
    // Fetch Booking Headers
    const bookingsRes = await pool.query(
      `SELECT * FROM bookings WHERE user_name = $1 ORDER BY start_time DESC`,
      [user_name]
    );
    const bookings = bookingsRes.rows;

    // Fetch Booking Items for these bookings
    // Note: Doing a separate query or JOIN. Let's do a JOIN approach for efficiency or loop if small.
    // Given the scale, loop is okay, but let's do a single query to get all items for these bookings.
    if (bookings.length === 0) return res.json([]);

    const bookingIds = bookings.map(b => b.id);
    const itemsRes = await pool.query(`
            SELECT bi.*, 
                COALESCE(c.name, ch.name, e.name) as resource_name
            FROM booking_items bi
            LEFT JOIN courts c ON bi.resource_type = 'court' AND bi.resource_id = c.id
            LEFT JOIN coaches ch ON bi.resource_type = 'coach' AND bi.resource_id = ch.id
            LEFT JOIN equipment e ON bi.resource_type = 'equipment' AND bi.resource_id = e.id
            WHERE bi.booking_id = ANY($1::int[])
        `, [bookingIds]);

    // Map items to bookings
    const result = bookings.map(booking => {
      return {
        ...booking,
        items: itemsRes.rows.filter(item => item.booking_id === booking.id)
      };
    });

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
