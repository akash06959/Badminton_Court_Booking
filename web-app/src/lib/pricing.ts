import { PoolClient } from 'pg';
import { parseISO, differenceInMinutes, getDay, getHours } from 'date-fns';

type BookingItem = {
    resource_type: string;
    resource_id: number;
    quantity?: number;
};

export async function calculateDynamicPrice(client: PoolClient, items: BookingItem[], startTimeStr: string, endTimeStr: string) {
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
        if (conditions.start_hour !== undefined && conditions.end_hour !== undefined) {
            if (startHour < conditions.start_hour || startHour >= conditions.end_hour) {
                applies = false;
            }
        }

        if (applies) {
            if (rule.type === 'multiplier') {
                multiplier *= parseFloat(rule.value);
            } else if (rule.type === 'flat_fee') {
                flatFees += parseFloat(rule.value);
            }
        }
    }

    const finalPrice = (baseTotal * multiplier) + flatFees;
    return parseFloat(finalPrice.toFixed(2));
}
