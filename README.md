# Employee Management PWA — V3

Production-ready PWA for small business employee management.  
PIN-protected · Mobile-first · Supabase backend · Vercel deployable

---

## ✅ Features

- 🔐 **PIN Login** — SHA-256 hashed, synced between localStorage + Supabase
- 👥 **Employees** — Add/edit/deactivate with joining date + roles
- ✅ **Attendance** — Daily marking (P/A/H), duplicate yesterday, monthly grid
- 💰 **Salary** — Cycle-based (joining date), Sunday exclusion, advance deduction
- 💸 **Advances** — Track, repay, per-employee history
- 📦 **Work Logs** — Daily orders per employee + value
- 🏆 **Performance** — Leaderboard, sparklines, monthly analytics
- 📋 **Contacts** — Customer/Supplier/Transport with Call & WhatsApp buttons, CSV import
- 🏪 **Shop Budget** — Admin budget + employee expenses, running balance, breakdown

---

## 🗄️ Supabase SQL Setup

Run the entire block below in your Supabase **SQL Editor**:

```sql
-- ── EMPLOYEES ─────────────────────────────────────────
create table employees (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  role         text,
  phone        text,
  salary       numeric(10,2) default 0,
  joining_date date,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- ── ATTENDANCE ────────────────────────────────────────
create table attendance (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  date        date not null,
  status      text check (status in ('present','absent','half_day')) not null,
  created_at  timestamptz default now(),
  unique(employee_id, date)
);

-- ── ADVANCES ──────────────────────────────────────────
create table advances (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  amount      numeric(10,2) not null,
  date        date default current_date,
  note        text,
  is_repaid   boolean default false,
  created_at  timestamptz default now()
);

-- ── SALARY RECORDS ────────────────────────────────────
create table salary_records (
  id                uuid primary key default gen_random_uuid(),
  employee_id       uuid references employees(id) on delete cascade,
  month             int not null,
  year              int not null,
  cycle_start       date,
  cycle_end         date,
  total_days        int default 0,
  sundays           int default 0,
  working_days      int default 26,
  present_days      int default 0,
  half_days         int default 0,
  absent_days       int default 0,
  per_day           numeric(10,2) default 0,
  gross_salary      numeric(10,2) default 0,
  advance_deduction numeric(10,2) default 0,
  final_salary      numeric(10,2) default 0,
  is_paid           boolean default false,
  paid_date         date,
  created_at        timestamptz default now(),
  unique(employee_id, month, year)
);

-- ── WORK LOGS ─────────────────────────────────────────
create table work_logs (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid references employees(id) on delete cascade,
  date             date not null,
  orders_delivered int not null default 0,
  order_value      numeric(10,2),
  notes            text,
  created_at       timestamptz default now(),
  unique(employee_id, date)
);

-- ── CONTACTS ──────────────────────────────────────────
create table contacts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text check (type in ('customer','supplier','transport','other')) default 'customer',
  city       text,
  phone      text,
  email      text,
  notes      text,
  created_at timestamptz default now()
);

-- ── BUDGET ENTRIES ────────────────────────────────────
create table budget_entries (
  id         uuid primary key default gen_random_uuid(),
  amount     numeric(10,2) not null,
  date       date default current_date,
  note       text,
  created_at timestamptz default now()
);

-- ── EXPENSES ──────────────────────────────────────────
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  amount      numeric(10,2) not null,
  category    text not null,
  employee_id uuid references employees(id) on delete set null,
  date        date default current_date,
  note        text,
  created_at  timestamptz default now()
);

-- ── APP CONFIG (PIN storage) ───────────────────────────
create table app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────
alter table employees     enable row level security;
alter table attendance    enable row level security;
alter table advances      enable row level security;
alter table salary_records enable row level security;
alter table work_logs     enable row level security;
alter table contacts      enable row level security;
alter table budget_entries enable row level security;
alter table expenses      enable row level security;
alter table app_config    enable row level security;

create policy "Allow all" on employees      for all using (true) with check (true);
create policy "Allow all" on attendance     for all using (true) with check (true);
create policy "Allow all" on advances       for all using (true) with check (true);
create policy "Allow all" on salary_records for all using (true) with check (true);
create policy "Allow all" on work_logs      for all using (true) with check (true);
create policy "Allow all" on contacts       for all using (true) with check (true);
create policy "Allow all" on budget_entries for all using (true) with check (true);
create policy "Allow all" on expenses       for all using (true) with check (true);
create policy "Allow all" on app_config     for all using (true) with check (true);
```

---

## 🚀 Vercel Deployment — Step by Step

### Step 1 — Prepare your project

```bash
unzip emp-mgmt-pwa-v3.zip
cd emp-mgmt
npm install
```

### Step 2 — Set up Supabase

1. Go to [https://supabase.com](https://supabase.com) → **New Project**
2. Open **SQL Editor** → paste the entire SQL block above → **Run**
3. Go to **Project Settings → API**
   - Copy **Project URL** (looks like `https://xxxx.supabase.co`)
   - Copy **anon public** key

### Step 3 — Test locally

```bash
cp .env.example .env
# Edit .env and paste your Supabase URL + anon key
npm run dev
# Open http://localhost:3000 — set your PIN and test everything
```

### Step 4 — Deploy to Vercel

#### Option A: Vercel CLI (fastest)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy from project root
vercel

# Follow prompts:
#   Set up and deploy? → Y
#   Which scope? → your account
#   Link to existing project? → N
#   Project name? → emp-manager (or any name)
#   Directory? → ./  (just press Enter)
#   Override settings? → N

# After deploy, add environment variables:
vercel env add VITE_SUPABASE_URL
# Paste your Supabase URL, select all environments

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your anon key, select all environments

# Redeploy to pick up env vars:
vercel --prod
```

#### Option B: Vercel Dashboard (no CLI)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "emp manager v3"
   # Create a GitHub repo and push
   git remote add origin https://github.com/YOUR_USERNAME/emp-manager.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. **Framework Preset**: Vite
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. **Environment Variables** — add both:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
8. Click **Deploy** ✅

### Step 5 — PWA Install (optional)

Once deployed, open on your phone:
- **Android**: Chrome → ⋮ menu → "Add to Home Screen"
- **iPhone**: Safari → Share → "Add to Home Screen"

---

## 📁 Project Structure

```
src/
├── lib/
│   ├── auth.js         ← PIN hashing + Supabase sync
│   ├── supabase.js     ← Client config
│   ├── db.js           ← All DB queries
│   ├── utils.js        ← Cycle salary + formatters
│   └── export.js       ← CSV export helpers
├── components/
│   ├── PinSetup.jsx    ← First-launch PIN creation
│   ├── PinLogin.jsx    ← Numpad login (correct digit count)
│   ├── Sidebar.jsx     ← Navigation
│   ├── Layout.jsx      ← App shell
│   ├── Modal.jsx       ← Reusable modal
│   ├── Toast.jsx       ← Notifications
│   ├── EmployeeForm.jsx← Fixed focus bug (Field outside component)
│   └── ConfigBanner.jsx
└── pages/
    ├── Dashboard.jsx   ← Stats + budget balance
    ├── Employees.jsx   ← CRUD with new roles
    ├── Attendance.jsx  ← Daily + monthly
    ├── Salary.jsx      ← Cycle-based + Sunday exclusion
    ├── Advances.jsx
    ├── WorkLogs.jsx
    ├── Performance.jsx ← Leaderboard + analytics
    ├── Contacts.jsx    ← Customer/Supplier/Transport + CSV import
    └── Budget.jsx      ← Shop budget + expenses
```

---

## 🔑 Key Fixes & Features in V3

| Item | Details |
|------|---------|
| PIN length bug | Login now reads stored PIN length → shows exact dots → verifies only at that length |
| Input focus bug | `Field` component moved outside parent → no remount on re-render |
| Salary cycle | `joining_date → same date + 1 month` cycle per employee |
| Sunday exclusion | Sundays counted separately, excluded from working days & salary |
| New roles | Driver, Delivery Boy, Collection Agent, Billing Staff, Helper, Manager + Custom |
| Contacts | Customer / Supplier / Transport with Call & WhatsApp buttons, CSV bulk import |
| Shop Budget | Admin adds budget, employees log expenses, live balance shown |
| Vercel | Full step-by-step deploy guide above |
