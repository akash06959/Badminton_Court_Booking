# Badminton Court Booking System

A full-stack booking platform for a sports facility featuring multi-resource bookings (courts, coaches, equipment), dynamic pricing, and an admin dashboard.

## 🚀 Features

*   **Atomic Multi-Resource Booking**: Book a court, coach, and equipment in a single transaction.
*   **Dynamic Pricing Engine**: Automated pricing based on rules (e.g., Weekend Premiums, Peak Hours).
*   **Waitlist System**: Users can join a waitlist for busy slots and are notified upon cancellation.
*   **Admin Dashboard**: Manage Courts, Coaches, Equipment, and Pricing Rules.
*   **Concurrency Handling**: Database-level constraints prevent double bookings.
*   **Serverless Architecture**: Fully integrated within Next.js App Router (API Routes).

## 🛠️ Tech Stack

*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript
*   **Database**: PostgreSQL
*   **Styling**: TailwindCSS, Framer Motion

## 📦 Setup Instructions

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL installed and running
*   Git

### 1. Database Setup
Create a PostgreSQL database and configure the connection.

```bash
# Create DB (using psql or pgAdmin)
CREATE DATABASE badminton_db;
```

Update the `web-app/.env` file:
```env
DATABASE_URL=postgres://user:password@localhost:5432/badminton_db
```

### 2. Initialize Data
Run the seeder to set up the schema and initial data (Courts, Coaches, Equipment).

```bash
# From the root directory
node run_seed.js
```

### 3. Run Application
The application (Frontend + API) runs as a single Next.js app.

```bash
cd web-app

# Install dependencies
npm install

# Run Development Server
npm run dev
```
*App runs on http://localhost:3000*

## 📚 Deliverables Checklist

- [x] **Git Repo**: Initialized with source code.
- [x] **Seed Data**: Included in `seed_v2.sql`.
- [x] **Write-up**: See [DB_DESIGN.md](./DB_DESIGN.md) for Database Design & Pricing Engine approach.

## 🧪 Admin Credentials
*   **URL**: `http://localhost:3000/admin`
*   *(No authentication implemented for demo purposes)*

## 📝 Assumptions
1.  **Authentication**: Skipped for this MVP to focus on Booking Logic and Availability.
2.  **Payment Processing**: Mocked; bookings are confirmed immediately without actual payment gateway integration.
3.  **Time Slots**: Slots are currently 1-hour blocks for simplicity.
