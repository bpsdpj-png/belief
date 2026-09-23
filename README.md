# Belief — Trade with Conviction

A trading performance dashboard and journal engineered for discipline, equity tracking, capital management, and long-term compounding.

![Belief Dashboard](public/favicon.svg)

---

## Features

- **Executive Overview & Performance**:
  - Real-time **Current Capital**, **Today's P&L**, **Overall P&L**, and **Overall ROI %**.
  - **Discipline Score %** and **Rule-by-rule Adherence** tracking stop-loss, position sizing, revenge trading prevention, and plan execution.
  - Interactive **Equity Curve** (Area chart) with average daily P&L and ROI indicators.
  - **Daily Target & Stop-loss Calculator** with configurable target % heuristic.
  - **Capital Appreciation & Max Downside** tracking from account inception.
  - **Profit vs. Withdrawal Health** monitoring principal capital retention.
  - **Monthly & Weekly P&L** bar charts with ROI annotations.
  - **Win/Loss Distribution** pie chart with average win, average loss, profit factor, and max drawdown.
  - **Strategy Performance** breakdown (Straddles, Strangles, Directional spreads).
  - **Annualized Return (XIRR)** engine using Newton-Raphson numerical analysis for both trading capital and equity portfolio cashflows.

- **Trade Journal & Log**:
  - Full trade logging with Index (`NIFTY`, `BANKNIFTY`, `SENSEX`, `MIDCAP`, `STOCKS`, etc.), Strategy, Market Bias (`Bullish`, `Bearish`, `Sideways`), Gross P&L, Charges, Net P&L, and Notes.
  - 4-point Discipline Checklist validation.
  - In-place editing and deletion.
  - 1-click **Quick Log Withdrawal** from the trade screen.

- **Capital & Withdrawals Ledger**:
  - Starting capital configuration.
  - Deposits, daily profit withdrawals, and capital injections ledger.
  - Automatic deduction of equity investments.

- **Equity Portfolio (Holdings)**:
  - Long-term equity positions funded directly from trading profits.
  - Real-time unrealized P&L, holding value, and Equity XIRR.
  - In-table live price updates.

- **Persistence & Cloud Sync**:
  - Powered by **Supabase PostgreSQL** cloud persistence.
  - Built-in local offline cache fallback.
  - Direct 1-click export to **JSON** and **Excel (.xlsx)**.

---

## Tech Stack

- **Framework**: React 18, Vite
- **Data Visualization**: Recharts
- **Database & Backend**: Supabase (PostgreSQL + PostgREST)
- **Icons**: Lucide React
- **Export**: SheetJS (`xlsx`)
- **Typography**: Kaushan Script, Jost, IBM Plex Mono, Playfair Display

---

## Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- pnpm or npm

### 2. Install Dependencies
```bash
corepack pnpm install
# or: npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://kcxrlctweznilghukmca.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_WFWLxjicAVhyuaRfJfPLQg_qns8OCIQ
```

### 4. Supabase Database Setup
1. Open your [Supabase SQL Editor](https://supabase.com/dashboard/project/kcxrlctweznilghukmca/sql).
2. Copy and run [`supabase/schema.sql`](supabase/schema.sql) to create the `trades`, `ledger`, `holdings`, and `settings` tables with Row-Level Security.
3. (Optional) Run [`supabase/seed.sql`](supabase/seed.sql) to seed the 47 historical trades, 47 ledger transactions, and equity holdings.

Alternatively, you can run the seed script:
```bash
corepack pnpm seed
# or: node scripts/seed-supabase.mjs
```

### 5. Start Development Server
```bash
corepack pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### 6. Build for Production
```bash
corepack pnpm build
```
The optimized bundle will be compiled into the `dist/` directory, ready to deploy to Vercel, Netlify, Cloudflare Pages, or GitHub Pages.

---

## Project Structure

```
├── public/                     # Static assets (favicons, brand logo)
├── scripts/
│   └── seed-supabase.mjs       # Database migration & import script
├── src/
│   ├── components/
│   │   └── Dashboard.jsx       # Complete trading dashboard UI & charts
│   ├── data/
│   │   └── initialData.json    # Historical backup baseline
│   ├── lib/
│   │   └── supabase.js         # Supabase client initialization
│   ├── services/
│   │   └── dashboardService.js # Data access layer with Supabase sync & offline fallback
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   ├── migrations/
│   │   └── 20260923000000_create_belief_tables.sql
│   ├── schema.sql              # Supabase tables, indexes, and RLS policies
│   └── seed.sql                # Complete SQL inserts for historical backup
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## License

Private & Confidential — Built for Belief Trading.
