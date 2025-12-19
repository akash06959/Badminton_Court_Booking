-- Seed Data for V2 Schema

-- 1. Courts (2 Indoor, 2 Outdoor)
INSERT INTO courts (name, type, base_price_per_hour) VALUES
('Court 1 (Indoor)', 'indoor', 25.00),
('Court 2 (Indoor)', 'indoor', 25.00),
('Court 3 (Outdoor)', 'outdoor', 15.00),
('Court 4 (Outdoor)', 'outdoor', 15.00);

-- 2. Coaches (3 Coaches)
INSERT INTO coaches (name, bio, hourly_rate) VALUES
('Coach John', 'Senior Badminton Pro with 10 years experience.', 50.00),
('Coach Sarah', 'Former National Champion, specializes in agility.', 60.00),
('Coach Mike', 'Focuses on beginners and fundamentals.', 40.00);

-- 3. Equipment (Rackets, Shoes)
INSERT INTO equipment (name, total_quantity, price_per_use) VALUES
('Pro Racket', 10, 5.00),
('Court Shoes', 8, 3.00);

-- 4. Pricing Rules
INSERT INTO pricing_rules (name, type, value, conditions) VALUES
-- Weekend Premium: 20% extra on Saturdays (6) and Sundays (0)
('Weekend Premium', 'multiplier', 1.2, '{"days_of_week": [0, 6]}'),

-- Peak Hours: 6 PM (18) to 9 PM (21), Flat $5 fee per hour or multiplier? 
-- Prompt says "Peak hours (6-9 PM) -> higher rate". Let's use multiplier 1.5x for peak.
('Peak Hour Surge', 'multiplier', 1.5, '{"start_hour": 18, "end_hour": 21}'),

-- Indoor Premium is handled via base price difference in courts table, 
-- but could be a rule if base prices were same. We already set indoor=25, outdoor=15.
-- Let's add a "Friday Night Fun" generic rule for testing.
('Friday Discount', 'multiplier', 0.9, '{"days_of_week": [5]}');
