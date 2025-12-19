-- Database Migration V2: Multi-Resource Booking System
-- Drops existing tables to rebuild the schema for the new requirements.

DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS courts CASCADE;
DROP TABLE IF EXISTS coaches CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;

-- 1. Courts Table (Updated)
CREATE TABLE courts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('indoor', 'outdoor')),
    base_price_per_hour DECIMAL(10, 2) NOT NULL
);

-- 2. Coaches Table (New)
CREATE TABLE coaches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    hourly_rate DECIMAL(10, 2) NOT NULL
);

-- 3. Equipment Table (New)
-- Tracks inventory.
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    price_per_use DECIMAL(10, 2) NOT NULL DEFAULT 0
);

-- 4. Pricing Rules Table (New)
-- Stores dynamic pricing logic configurations.
CREATE TABLE pricing_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('multiplier', 'flat_fee', 'hourly_add_on')),
    value DECIMAL(10, 2) NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. Bookings Table (Refactored)
-- Now acts as a "Header" for the transaction.
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_end_after_start CHECK (end_time > start_time)
);

-- 6. Booking Items Table (New)
-- Links resources (Courts, Coaches, Equipment) to a booking.
-- Includes redundancy of start/end time to enable Exclusion Constraints.
CREATE TABLE booking_items (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('court', 'coach', 'equipment')),
    resource_id INTEGER NOT NULL,
    
    -- Specific constraints for inventory handling and uniqueness
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Denormalized time & status for DB-level constraint enforcement
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
    
    CONSTRAINT check_item_end_after_start CHECK (end_time > start_time),

    -- Exclusion Constraint: 
    -- Prevent double-booking for Courts and Coaches.
    -- Equipment is excluded from this strict check because multiple users can book separate rackets.
    -- Equipment availability (Count < Total) must be checked at application level or via complex trigger.
    CONSTRAINT no_overlapping_resources EXCLUDE USING GIST (
        resource_id WITH =,
        resource_type WITH =,
        tsrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status = 'confirmed' AND resource_type IN ('court', 'coach'))
);

-- Indexes
CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX idx_booking_items_resource ON booking_items(resource_type, resource_id);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active);
