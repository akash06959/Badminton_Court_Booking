# Database Design & Pricing Engine Approach

## 1. Database Schema Design (Multi-Resource)

The database design shifts from a simple "one-court-per-booking" model to a flexible **Header-Detail (Parent-Child)** architecture, allowing complex bookings that combine multiple resources (Courts, Coaches, Equipment) into a single atomic transaction.

### Core Tables:
*   **`bookings` (Header)**: Represents the transaction. Stores the User, overall timing, total price, and status. It is the "source of truth" for the existence of a reservation.
*   **`booking_items` (Detail)**: The distinct resources reserved.
    *   **Polymorphic Association**: Uses `resource_type` ('court', 'coach', 'equipment') and `resource_id` to link to different entities.
    *   **Atomic Availability**: This table contains the *Exclusion Constraints*. By duplicating `start_time` and `end_time` here, we leverage PostgreSQL's powerful `EXCLUDE USING GIST` to prevent overlapping bookings for unique resources (Courts, Coaches) at the database level. This guarantees zero double-booking conditions without complex application locking.
    *   **Inventory Management**: For fungible items (Equipment), the constraint is relaxed. Application logic queries `SUM(quantity)` of active items in the time window to compare against `equipment.total_quantity`.

### Resource Tables:
*   **`courts`**: Differentiates between 'indoor' and 'outdoor' types, allowing for base price variations.
*   **`coaches`**: Independent entities with hourly rates.
*   **`equipment`**: Tracks total inventory limits (e.g., 10 Rackets).

### Configuration:
*   **`pricing_rules`**: A data-driven approach to pricing logic. Instead of hardcoding "Weekends = 1.2x", we store rules with `JSONB` conditions (e.g., `{ "days_of_week": [0, 6] }` or `{ "start_hour": 18 }`). This allows Admins to modify pricing strategies without deploying new code.

---

## 2. Pricing Engine Approach

The pricing engine is designed to be **layered and additive**.

1.  **Base Cost Calculation**:
    *   Iterate through all `booking_items`.
    *   For Courts/Coaches: `(Hourly Rate) * (Duration)`
    *   For Equipment: `(Flat Item Price) * (Quantity)` [or hourly if configured]
    *   *Result*: `Subtotal`.

2.  **Rule Application**:
    *   Fetch all active `pricing_rules`.
    *   **Filter**: Check if the booking's `start_time/end_time` matches the rule's `conditions` (JSONB).
        *   *Example*: Is the booking on a Saturday? (Day 6).
        *   *Example*: Does it overlap 6 PM - 9 PM?
    *   **Apply**:
        *   `multiplier`: Multiply the relevant item cost or total subtotal (e.g., 1.2x for Weekends).
        *   `flat_fee`: Add a fixed amount (e.g., +$5 Peak Surcharge).

This decoupling ensures that the "Business Rules" (Pricing) are separate from "Operational Rules" (Availability).
