-- Waitlist Schema Updates

-- 1. Waitlist Table
-- Stores users waiting for a specific resource type/id at a specific time.
CREATE TABLE waitlist (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('court', 'coach')),
    resource_id INTEGER NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' -- pending, notified, expired
);

-- Index for fast lookup of cancellations
CREATE INDEX idx_waitlist_resource_time ON waitlist(resource_type, resource_id, start_time, end_time);
