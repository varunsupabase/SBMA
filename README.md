# Employee Management PWA

A production-ready employee management system for small businesses. PIN-protected, mobile-first, powered by Supabase.

## Features

- 🔐 PIN-based admin login (no accounts required)
- 📊 Dashboard with today's attendance & salary overview
- 👥 Employee management (add/edit/deactivate)
- ✅ Daily attendance marking (P/A/H) with "duplicate yesterday"
- 💸 Advance tracking with pending amount summary
- 💰 Auto salary calculation with advance deductions
- 📥 CSV export for all modules
- 🌙 Dark/Light mode
- 📱 Mobile-first PWA

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo>
cd emp-mgmt
npm install
```

### 2. Set up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Open **SQL Editor** and run the SQL below to create all tables
3. Copy your **Project URL** and **anon key** from Project Settings → API

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run

```bash
npm run dev
```

---

## Supabase SQL Setup

Run this entire block in the Supabase SQL Editor:

```sql
-- EMPLOYEES
create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  phone text,
  salary numeric(10,2) default 0,
  joining_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ATTENDANCE
create table attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  date date not null,
  status text check (status in ('present','absent','half_day')) not null,
  created_at timestamptz default now(),
  unique(employee_id, date)
);

-- ADVANCES
create table advances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  amount numeric(10,2) not null,
  date date default current_date,
  note text,
  is_repaid boolean default false,
  created_at timestamptz default now()
);

-- SALARY RECORDS
create table salary_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  month int not null,
  year int not null,
  working_days int default 26,
  present_days int default 0,
  half_days int default 0,
  absent_days int default 0,
  gross_salary numeric(10,2) default 0,
  advance_deduction numeric(10,2) default 0,
  final_salary numeric(10,2) default 0,
  is_paid boolean default false,
  paid_date date,
  created_at timestamptz default now(),
  unique(employee_id, month, year)
);

-- Enable Row Level Security (open for anon since no auth)
alter table employees enable row level security;
alter table attendance enable row level security;
alter table advances enable row level security;
alter table salary_records enable row level security;

-- Allow all operations via anon key (admin-only app, PIN protected client-side)
create policy "Allow all" on employees for all using (true) with check (true);
create policy "Allow all" on attendance for all using (true) with check (true);
create policy "Allow all" on advances for all using (true) with check (true);
create policy "Allow all" on salary_records for all using (true) with check (true);
```

---

## Build for Production

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

---

## Security Note

The PIN is hashed with SHA-256 + salt before being stored in localStorage. This protects against casual inspection but is not a substitute for server-side authentication. For sensitive production environments, consider adding Supabase Auth.

---

## Tech Stack

- React 18 + Vite
- Supabase (PostgreSQL)
- Tailwind CSS v3
- React Router v6
- date-fns
- lucide-react
