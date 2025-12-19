# Badminton Court Booking System

A full-stack booking platform for a sports facility featuring multi-resource bookings (courts, coaches, equipment), dynamic pricing, and an admin dashboard.

## 🚀 Features

*   **Atomic Multi-Resource Booking**: Book a court, coach, and equipment in a single transaction.
*   **Dynamic Pricing Engine**: Automated pricing based on rules (e.g., Weekend Premiums, Peak Hours).
*   **Waitlist System**: Users can join a waitlist for busy slots and are notified upon cancellation.
*   **Admin Dashboard**: Manage Courts, Coaches, Equipment, and Pricing Rules.
*   **Concurrency Handling**: Database-level constraints prevent double bookings.

## 🛠️ Tech Stack

*   **Frontend**: Next.js 16 (App Router), TailwindCSS, Framer Motion
*   **Backend**: Node.js, Express.js
*   **Database**: PostgreSQL (with exclusion constraints for availability)

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

Update the `.env` file in the root directory:
```env
DATABASE_URL=postgres://user:password@localhost:5432/badminton_db
PORT=5000
```
*(Check `DB_DESIGN.md` for detailed schema explanations)*

### 2. Install & Run Backend
The backend handles API requests and database transactions.

```bash
# Install dependencies
npm install

# Initialize Database Schema & Seed Data
node run_seed.js

# Start Server
npm start
```
*Server runs on http://localhost:5000*

### 3. Install & Run Frontend
The frontend provides the user and admin interfaces.

```bash
cd web-app

# Install dependencies
npm install

# Run Development Server
npm run dev
```
*Frontend runs on http://localhost:3000*

## 📚 Deliverables Checklist

- [x] **Git Repo**: Initialized with source code.
- [x] **Seed Data**: Included in `seed_v2.sql` (loaded via `run_seed.js`).
- [x] **Write-up**: See [DB_DESIGN.md](./DB_DESIGN.md) for Database Design & Pricing Engine approach.

## 🧪 Admin Credentials
*   **URL**: `http://localhost:3000/admin`
*   *(No authentication implemented for demo purposes)*

## 📝 Assumptions
1.  **Authentication**: Skipped for this MVP to focus on Booking Logic and Availability.
2.  **Payment Processing**: Mocked; bookings are confirmed immediately without actual payment gateway integration.
3.  **Time Slots**: Slots are currently 1-hour blocks for simplicity.
