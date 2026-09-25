import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, Cell, PieChart, Pie, ReferenceLine
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, IndianRupee, Target, ShieldCheck, X, Trash2,
  Wallet, PiggyBank, ArrowDownToLine, Flame, Briefcase, Percent, Download, Pencil,
  Database, RefreshCw, Sun, Moon, Search, Filter, CheckCircle2, ChevronRight,
  ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, Layers,
  Calendar, ChevronLeft, Award, Sparkles, Clock
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  loadDashboardData,
  saveLocalCache,
  persistTrade,
  removeTradeFromDb,
  persistLedger,
  removeLedgerFromDb,
  persistHolding,
  removeHoldingFromDb,
  persistSettings,
  syncAllToSupabase,
  fetchStockQuote,
  STOCK_PRICE_CATALOG
} from "../services/dashboardService";
import Plan20CrTab from "./Plan20CrTab";
import DailyHabitsTab from "./DailyHabitsTab";
import PnLMountainClimber from "./PnLMountainClimber";
import BudgetPlannerTab from "./BudgetPlannerTab";
import { BHARAT_ACTIVITIES, getBharatActivityById } from "../data/bharatAvatar";
import {
  playMeditationChime,
  playCricketShotSound,
  playPushupRepSound,
  playGlassClinkSound,
  playProfitFanfare,
} from "../utils/avatarAudio";
import "../styles/dashboard.css";

const RULE_DEFS = [
  { key: "sl", label: "Stop-loss respected" },
  { key: "sizing", label: "Position sizing followed" },
  { key: "noRevenge", label: "No revenge trade" },
  { key: "plan", label: "Entry/exit per plan" },
];

const INDEX_OPTIONS = ["ALL", "NIFTY", "BANKNIFTY", "SENSEX", "BANKEX", "MIDCAP", "STOCKS"];
const BIAS_OPTIONS = ["Bullish", "Bearish", "Sideways"];
const STRATEGY_OPTIONS = ["Straddle", "Strangle", "Bullish", "Bearish"];

const DAILY_THOUGHTS = [
  "Discipline is the bridge between your trading plan and your trading results.",
  "The market doesn't reward being right. It rewards being disciplined.",
  "Cut losses fast, let profits breathe — the oldest rule is still the hardest one.",
  "Your edge dies the moment you break your own rules to chase a trade.",
  "Patience is a position too — sometimes the best trade is no trade.",
  "One disciplined day means little. Ten in a row change everything.",
  "Risk management is not the boring part of trading. It is the whole game.",
  "The trader who survives is not the one who is never wrong, but the one who never overstays being wrong.",
  "A plan followed loosely is just a guess with extra steps.",
  "Consistency compounds quietly, while impulsiveness erodes loudly.",
  "You don't need to win every trade. You need to protect capital on the ones you lose.",
  "Revenge trading is the market inviting you to lose twice.",
  "Every stop-loss you honor today is an account you get to trade tomorrow.",
  "Confidence built on discipline survives losses. Confidence built on luck does not.",
  "Small, repeatable edges beat big, unrepeatable wins.",
  "The size of the position should match the size of your conviction, not your impatience.",
  "Boredom is not a reason to trade. Setup is.",
  "Your worst trading days are usually caused by your best winning streaks.",
  "Process over outcome — a good decision can still lose, a bad one can still win.",
  "The market will test your discipline far more often than your analysis.",
  "Sit on your hands until the setup sits in front of you.",
  "A trader who journals every trade eventually stops repeating every mistake.",
  "Capital preservation today buys you optionality tomorrow.",
  "The moment a trade needs hope to work, it has already failed.",
  "Emotion is not the enemy — acting on it unchecked is.",
  "Great trading looks boring from the outside and feels boring from the inside.",
  "Every rule you break once becomes a rule you'll break again.",
  "The market pays for discipline in a currency called compounding.",
  "Losses are tuition. Repeating the same loss is refusing the lesson.",
  "Your P&L is a lagging indicator. Your discipline is the leading one.",
  "Trade the plan, not the feeling that shows up after two coffees and a red candle.",
  "A calm mind sizes positions correctly. A restless one doubles down.",
  "The best traders are not fearless — they are simply prepared.",
  "Win or lose, ask only one question at day's end: did I follow my process?",
  "Steady hands build wealth. Shaking hands build regret.",
  "The market has no memory of yesterday's win — trade today on its own merit.",
  "Every great trading year is just a string of disciplined ordinary days.",
  "Stop trying to be right. Start trying to be disciplined — right follows.",
];

function getDailyThought() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const idx = (dayOfYear + now.getFullYear()) % DAILY_THOUGHTS.length;
  return DAILY_THOUGHTS[idx];
}

const toLocalISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayLocalISO = () => toLocalISODate(new Date());

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 9);
};

const emptyTrade = () => ({
  id: generateId(),
  date: todayLocalISO(),
  index: "NIFTY",
  strategy: "Straddle",
  bias: "Sideways",
  gross: "",
  charges: "",
  capitalDeployed: "",
  rules: { sl: true, sizing: true, noRevenge: true, plan: true },
  notes: "",
});

const emptyTranche = (date = todayLocalISO()) => ({
  id: generateId(),
  date: date || todayLocalISO(),
  qty: "",
  buyPrice: "",
  note: "",
});

const emptyLedger = (type = "Deposit") => ({
  id: generateId(),
  date: todayLocalISO(),
  type: type, // "Deposit" or "Withdrawal"
  amount: "",
  note: "",
});

const emptyHolding = () => ({
  id: generateId(),
  date: todayLocalISO(),
  stock: "",
  companyName: "",
  exchange: "NSE",
  qty: "",
  buyPrice: "",
  currentPrice: "",
  priceUpdatedOn: todayLocalISO(),
  peRatio: "",
  beta: "",
  companySize: "Large cap",
  valuationView: "Needs review",
  dividendDate: "",
  dividendPerShare: "",
  investmentNote: "",
  newsDate: "",
  metadata: {},
  tranches: [emptyTranche()],
});

const fmtINR = (n) => {
  const v = Number(n) || 0;
  const sign = v < 0 ? "-" : "";
  return sign + "₹" + Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const fmtSigned = (n) => {
  const v = Number(n) || 0;
  return (v >= 0 ? "+" : "-") + "₹" + Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}-${m}-${y}`;
};

const fmtPct = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

// ---- XIRR (Newton-Raphson) ----
const daysBetween = (a, b) => (b - a) / (1000 * 60 * 60 * 24);

function xirr(cashflows) {
  const flows = cashflows.filter(cf => cf.amount !== 0 && !isNaN(cf.date.getTime()));
  if (flows.length < 2) return null;
  const hasPos = flows.some(f => f.amount > 0);
  const hasNeg = flows.some(f => f.amount < 0);
  if (!hasPos || !hasNeg) return null;

  const sorted = [...flows].sort((a, b) => a.date - b.date);
  const t0 = sorted[0].date;
  const npv = (rate) => sorted.reduce((sum, cf) => {
    const t = daysBetween(t0, cf.date) / 365;
    return sum + cf.amount / Math.pow(1 + rate, t);
  }, 0);
  const dnpv = (rate) => sorted.reduce((sum, cf) => {
    const t = daysBetween(t0, cf.date) / 365;
    return sum - (t * cf.amount) / Math.pow(1 + rate, t + 1);
  }, 0);

  let rate = 0.15;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate);
    const df = dnpv(rate);
    if (Math.abs(df) < 1e-10) break;
    let next = rate - f / df;
    if (next <= -0.999) next = -0.5;
    if (!isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-6) { rate = next; break; }
    rate = next;
  }
  if (!isFinite(rate) || isNaN(rate)) return null;
  return rate * 100;
}

function calcHoldingXIRR(dateStr, invested, curVal) {
  if (!dateStr || invested <= 0 || curVal <= 0) return null;
  const d = new Date(dateStr);
  const now = new Date();
  if (isNaN(d.getTime())) return null;
  const days = Math.max(1, (now - d) / (1000 * 60 * 60 * 24));
  if (days < 5) {
    return ((curVal - invested) / invested) * 100;
  }
  const ratio = curVal / invested;
  const annualRate = (Math.pow(ratio, 365 / days) - 1) * 100;
  if (!isFinite(annualRate) || isNaN(annualRate)) return null;
  return annualRate;
}

function getHoldingMetrics(h) {
  const tranches = Array.isArray(h?.tranches) && h.tranches.length > 0
    ? h.tranches
    : (h?.qty && h?.buyPrice ? [{
        id: `${h.id}-default`,
        date: h.date || todayLocalISO(),
        qty: Number(h.qty) || 0,
        buyPrice: Number(h.buyPrice) || 0,
        note: "Initial purchase",
      }] : []);

  let totalQty = 0;
  let totalInvested = 0;
  const cashflows = [];

  tranches.forEach(t => {
    const q = Number(t.qty) || 0;
    const p = Number(t.buyPrice) || 0;
    totalQty += q;
    totalInvested += (q * p);
    if (q > 0 && p > 0 && t.date) {
      cashflows.push({
        date: new Date(t.date),
        amount: -(q * p),
      });
    }
  });

  // Fallback to top-level qty & buyPrice if tranches sum was 0
  if (totalQty === 0 && Number(h?.qty) > 0) {
    totalQty = Number(h.qty) || 0;
    const bp = Number(h.buyPrice) || 0;
    totalInvested = totalQty * bp;
    if (totalInvested > 0 && h.date) {
      cashflows.push({ date: new Date(h.date), amount: -totalInvested });
    }
  }

  const avgBuyPrice = totalQty > 0 ? (totalInvested / totalQty) : (Number(h?.buyPrice) || 0);
  const cp = h?.currentPrice !== "" && h?.currentPrice != null && !isNaN(Number(h?.currentPrice))
    ? Number(h.currentPrice)
    : avgBuyPrice;
  const currentValue = totalQty * cp;
  const pnl = currentValue - totalInvested;
  const returnPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

  // Add final current market value on today for XIRR
  if (currentValue > 0) {
    cashflows.push({ date: new Date(), amount: currentValue });
  }

  let holdingXIRR = null;
  if (cashflows.length >= 2) {
    holdingXIRR = xirr(cashflows);
  }
  if (holdingXIRR === null && totalInvested > 0 && h?.date) {
    holdingXIRR = calcHoldingXIRR(h.date, totalInvested, currentValue);
  }

  return {
    tranches,
    totalQty,
    totalInvested,
    avgBuyPrice,
    currentPrice: cp,
    currentValue,
    pnl,
    returnPct,
    holdingXIRR,
    cashflows,
  };
}

export default function Dashboard() {
  const [loaded, setLoaded] = useState(false);
  const [startingCapital, setStartingCapital] = useState(975000);
  const [trades, setTrades] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [targetPct, setTargetPct] = useState(0.75);

  const [theme, setTheme] = useState(() => localStorage.getItem("belief-theme") || "dark");
  const [tab, setTab] = useState("overview");
  const [tradeSearch, setTradeSearch] = useState("");
  const [indexFilter, setIndexFilter] = useState("ALL");

  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarPreviewMode, setAvatarPreviewMode] = useState(null); // null (auto) | 'zen' | 'happy'
  const [showQuickPartModal, setShowQuickPartModal] = useState(false);
  const [quickPartHoldingId, setQuickPartHoldingId] = useState(null);
  const [quickPartDraft, setQuickPartDraft] = useState({ date: todayLocalISO(), qty: "", buyPrice: "", note: "" });

  const [tradeDraft, setTradeDraft] = useState(emptyTrade());
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [ledgerDraft, setLedgerDraft] = useState(emptyLedger());
  const [editingLedgerId, setEditingLedgerId] = useState(null);
  const [holdingDraft, setHoldingDraft] = useState(emptyHolding());
  const [editingHoldingId, setEditingHoldingId] = useState(null);
  const [withdrawDraft, setWithdrawDraft] = useState({ date: todayLocalISO(), amount: "", note: "" });

  const [saveState, setSaveState] = useState("idle");
  const [dbStatus, setDbStatus] = useState({ isSupabaseConnected: false, tablesReady: false });
  const [syncingAll, setSyncingAll] = useState(false);

  // Sync theme to document body & html
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    document.body.style.backgroundColor = theme === "light" ? "#F8FAFC" : "#070A11";
    document.body.style.color = theme === "light" ? "#0F172A" : "#F8FAFC";
    localStorage.setItem("belief-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  // Initial load
  const loadData = useCallback(async () => {
    try {
      const data = await loadDashboardData();
      setStartingCapital(data.startingCapital ?? 975000);
      setTrades(data.trades ?? []);
      setLedger(data.ledger ?? []);
      setHoldings(data.holdings ?? []);
      setTargetPct(data.targetPct ?? 0.75);
      setDbStatus({
        isSupabaseConnected: data.isSupabaseConnected,
        tablesReady: data.tablesReady,
      });
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Persist to local cache and settings save
  useEffect(() => {
    if (!loaded) return;
    saveLocalCache({ startingCapital, trades, ledger, holdings, targetPct });

    if (dbStatus.tablesReady) {
      const t = setTimeout(async () => {
        try {
          await persistSettings({ startingCapital, targetPct });
        } catch (e) {
          console.warn("Failed to persist settings:", e);
        }
      }, 500);
      return () => clearTimeout(t);
    }
  }, [startingCapital, trades, ledger, holdings, targetPct, loaded, dbStatus.tablesReady]);

  const tradesSorted = useMemo(
    () => [...trades].sort((a, b) => a.date.localeCompare(b.date)),
    [trades]
  );

  const filteredTrades = useMemo(() => {
    return [...tradesSorted].reverse().filter(t => {
      const matchesSearch =
        tradeSearch.trim() === "" ||
        t.date.includes(tradeSearch) ||
        t.index.toLowerCase().includes(tradeSearch.toLowerCase()) ||
        t.strategy.toLowerCase().includes(tradeSearch.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(tradeSearch.toLowerCase()));
      const matchesIndex = indexFilter === "ALL" || t.index === indexFilter;
      return matchesSearch && matchesIndex;
    });
  }, [tradesSorted, tradeSearch, indexFilter]);

  const stats = useMemo(() => {
    const netOf = (t) => (Number(t.gross) || 0) - (Number(t.charges) || 0);
    const totalNet = trades.reduce((s, t) => s + netOf(t), 0);
    const deposits = ledger.filter(l => l.type === "Deposit").reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const withdrawals = ledger.filter(l => l.type === "Withdrawal").reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const netCapitalAdded = deposits - withdrawals;

    const currentCapital = startingCapital + netCapitalAdded + totalNet;
    const capitalBase = startingCapital + deposits;
    const overallROI = capitalBase > 0 ? (totalNet / capitalBase) * 100 : 0;

    // Equity Holdings multi-tranche metrics & portfolio cashflows
    let holdingsInvested = 0;
    let holdingsCurrentValue = 0;
    let totalTranchesCount = 0;
    const allEquityFlows = [];

    holdings.forEach(h => {
      const m = getHoldingMetrics(h);
      holdingsInvested += m.totalInvested;
      holdingsCurrentValue += m.currentValue;
      totalTranchesCount += m.tranches.length;
      m.tranches.forEach(t => {
        const q = Number(t.qty) || 0;
        const p = Number(t.buyPrice) || 0;
        if (q > 0 && p > 0 && t.date) {
          allEquityFlows.push({
            date: new Date(t.date),
            amount: -(q * p),
          });
        }
      });
    });

    if (holdingsCurrentValue > 0) {
      allEquityFlows.push({ date: new Date(), amount: holdingsCurrentValue });
    }

    const holdingsUnrealized = holdingsCurrentValue - holdingsInvested;
    const holdingsReturnPct = holdingsInvested > 0 ? (holdingsUnrealized / holdingsInvested) * 100 : 0;
    const equityXIRR = xirr(allEquityFlows);

    const today = todayLocalISO();
    const todayPnl = trades.filter(t => t.date === today).reduce((s, t) => s + netOf(t), 0);
    const dailyROI = capitalBase > 0 ? (todayPnl / capitalBase) * 100 : 0;

    const thisMonth = today.slice(0, 7);
    const monthNet = trades.filter(t => t.date.startsWith(thisMonth)).reduce((s, t) => s + netOf(t), 0);
    const monthlyROI = capitalBase > 0 ? (monthNet / capitalBase) * 100 : 0;

    const wins = trades.filter(t => netOf(t) > 0);
    const losses = trades.filter(t => netOf(t) < 0);
    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + netOf(t), 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + netOf(t), 0) / losses.length : 0;
    const grossProfit = wins.reduce((s, t) => s + netOf(t), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + netOf(t), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

    let ruleTotal = 0, ruleChecked = 0;
    trades.forEach(t => {
      RULE_DEFS.forEach(r => {
        ruleTotal += 1;
        if (t.rules?.[r.key]) ruleChecked += 1;
      });
    });
    const discipline = ruleTotal ? (ruleChecked / ruleTotal) * 100 : 100;

    let running = startingCapital;
    const dayMap = {};
    tradesSorted.forEach(t => {
      dayMap[t.date] = (dayMap[t.date] || 0) + netOf(t);
    });
    let runningProfit = 0;
    const days = Object.keys(dayMap).sort();
    const curve = [];
    days.forEach(d => {
      running += dayMap[d];
      runningProfit += dayMap[d];
      curve.push({
        date: d,
        equity: Math.round(running),
        profit: Math.round(runningProfit),
        pnl: Math.round(dayMap[d]),
      });
    });

    let peak = startingCapital, maxDD = 0;
    let peakProfit = 0;
    curve.forEach(pt => {
      if (pt.equity > peak) peak = pt.equity;
      const dd = peak > 0 ? ((peak - pt.equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
      if (pt.profit > peakProfit) peakProfit = pt.profit;
    });

    const capitalAppreciation = currentCapital - startingCapital;
    const capitalAppreciationPct = startingCapital > 0 ? (capitalAppreciation / startingCapital) * 100 : 0;
    const equityPoints = [startingCapital, ...curve.map(c => c.equity)];
    const minEquityFromStart = Math.min(...equityPoints);
    const downsideFromStart = minEquityFromStart - startingCapital;
    const downsideFromStartPct = startingCapital > 0 ? (downsideFromStart / startingCapital) * 100 : 0;

    const profitWithdrawalDeficit = totalNet - withdrawals;

    const dayPnls = Object.values(dayMap);
    const profitableDays = dayPnls.filter(v => v > 0).length;
    const consistency = dayPnls.length ? (profitableDays / dayPnls.length) * 100 : 0;
    const avgDailyPnl = dayPnls.length ? dayPnls.reduce((s, v) => s + v, 0) / dayPnls.length : 0;
    const avgDailyROI = capitalBase > 0 ? (avgDailyPnl / capitalBase) * 100 : 0;

    let streak = 0, streakType = null;
    for (let i = days.length - 1; i >= 0; i--) {
      const v = dayMap[days[i]];
      const type = v >= 0 ? "win" : "loss";
      if (streakType === null) { streakType = type; streak = 1; }
      else if (type === streakType) streak += 1;
      else break;
    }

    const monthMap = {};
    trades.forEach(t => {
      const m = t.date.slice(0, 7);
      monthMap[m] = (monthMap[m] || 0) + netOf(t);
    });
    const monthly = Object.keys(monthMap).sort().map(m => ({
      month: m,
      pnl: Math.round(monthMap[m]),
      roi: capitalBase > 0 ? (monthMap[m] / capitalBase) * 100 : 0,
    }));

    const getWeekStart = (dateStr) => {
      const d = new Date(`${dateStr}T00:00:00`);
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      d.setDate(d.getDate() + diff);
      return toLocalISODate(d);
    };
    const weekMap = {};
    trades.forEach(t => {
      const w = getWeekStart(t.date);
      weekMap[w] = (weekMap[w] || 0) + netOf(t);
    });
    const weekly = Object.keys(weekMap).sort().map(w => ({
      week: w,
      pnl: Math.round(weekMap[w]),
      roi: capitalBase > 0 ? (weekMap[w] / capitalBase) * 100 : 0,
    })).slice(-12);

    const stratMap = {};
    trades.forEach(t => {
      const key = t.strategy || "Unspecified";
      if (!stratMap[key]) stratMap[key] = { strategy: key, net: 0, count: 0, wins: 0 };
      const n = netOf(t);
      stratMap[key].net += n;
      stratMap[key].count += 1;
      if (n > 0) stratMap[key].wins += 1;
    });
    const strategyPerf = Object.values(stratMap)
      .map(s => ({ ...s, net: Math.round(s.net), winRate: s.count ? (s.wins / s.count) * 100 : 0 }))
      .sort((a, b) => b.net - a.net);

    const allTradingDates = [
      ...trades.map(t => t.date), ...ledger.map(l => l.date),
    ].filter(Boolean).sort();
    const firstDate = allTradingDates.length ? new Date(allTradingDates[0]) : new Date();
    const tradingFlows = [{ date: firstDate, amount: -startingCapital }];
    ledger.forEach(l => {
      const amt = Number(l.amount) || 0;
      if (l.type === "Deposit") tradingFlows.push({ date: new Date(l.date), amount: -amt });
      if (l.type === "Withdrawal") tradingFlows.push({ date: new Date(l.date), amount: amt });
    });
    tradingFlows.push({ date: new Date(), amount: currentCapital });
    const tradingXIRR = xirr(tradingFlows);

    return {
      totalNet, currentCapital, overallROI, dailyROI, monthlyROI, todayPnl, monthNet,
      winRate, avgWin, avgLoss, profitFactor, discipline, curve, maxDD, peakProfit, consistency, avgDailyPnl, avgDailyROI, streak, streakType,
      monthly, weekly, deposits, withdrawals, netCapitalAdded, capitalBase, tradeCount: trades.length,
      winCount: wins.length, lossCount: losses.length,
      holdingsInvested, holdingsCurrentValue, holdingsUnrealized, holdingsReturnPct, equityXIRR, tradingXIRR,
      totalTranchesCount, strategyPerf,
      capitalAppreciation, capitalAppreciationPct, downsideFromStart, downsideFromStartPct, profitWithdrawalDeficit,
    };
  }, [trades, ledger, holdings, startingCapital, tradesSorted]);

  // Avatar companion dynamic emotional states for Bharat
  const isAvatarHappy = stats.todayPnl > 0 && stats.discipline >= 80;
  const autoAvatarSrc = isAvatarHappy ? "/avatars/bharat_profit.jpg" : "/avatars/bharat_standing.jpg";
  const currentBharatActivity = avatarPreviewMode
    ? getBharatActivityById(avatarPreviewMode)
    : isAvatarHappy
    ? getBharatActivityById("profit")
    : getBharatActivityById("standing");

  // Trade actions
  const addTrade = async () => {
    setSaveState("saving");
    try {
      if (editingTradeId) {
        const updated = { ...tradeDraft, id: editingTradeId };
        setTrades(prev => prev.map(t => (t.id === editingTradeId ? updated : t)));
        if (dbStatus.tablesReady) await persistTrade(updated);
        setEditingTradeId(null);
      } else {
        const created = { ...tradeDraft, id: tradeDraft.id || generateId() };
        setTrades(prev => [...prev, created]);
        if (dbStatus.tablesReady) await persistTrade(created);
      }
      setTradeDraft(emptyTrade());
      setShowTradeForm(false);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed to save trade:", e);
      setSaveState("error");
    }
  };

  const startEditTrade = (trade) => {
    setTradeDraft({ ...trade, rules: { ...(trade.rules || {}) } });
    setEditingTradeId(trade.id);
    setShowTradeForm(true);
  };
  const openNewTradeForm = () => {
    setTradeDraft(emptyTrade());
    setEditingTradeId(null);
    setShowTradeForm(true);
  };
  const cancelTradeForm = () => {
    setShowTradeForm(false);
    setEditingTradeId(null);
    setTradeDraft(emptyTrade());
  };

  const deleteTrade = async (id) => {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    setSaveState("saving");
    try {
      setTrades(prev => prev.filter(t => t.id !== id));
      if (dbStatus.tablesReady) await removeTradeFromDb(id);
      if (editingTradeId === id) cancelTradeForm();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed to delete trade:", e);
      setSaveState("error");
    }
  };

  // Ledger actions (Pure Capital Movement)
  const openNewDepositModal = () => {
    setLedgerDraft(emptyLedger("Deposit"));
    setEditingLedgerId(null);
    setShowLedgerForm(true);
  };

  const openNewWithdrawModal = () => {
    setLedgerDraft(emptyLedger("Withdrawal"));
    setEditingLedgerId(null);
    setShowLedgerForm(true);
  };

  const startEditLedger = (l) => {
    setLedgerDraft({
      id: l.id,
      date: l.date,
      type: l.type === "Withdrawal" ? "Withdrawal" : "Deposit",
      amount: l.amount || "",
      note: l.note || "",
    });
    setEditingLedgerId(l.id);
    setShowLedgerForm(true);
  };

  const cancelLedgerForm = () => {
    setShowLedgerForm(false);
    setEditingLedgerId(null);
    setLedgerDraft(emptyLedger());
  };

  const addLedger = async () => {
    setSaveState("saving");
    try {
      const ledgerId = editingLedgerId || ledgerDraft.id || generateId();
      const amountNum = Number(ledgerDraft.amount) || 0;

      const ledgerObj = {
        id: ledgerId,
        date: ledgerDraft.date || todayLocalISO(),
        type: ledgerDraft.type === "Withdrawal" ? "Withdrawal" : "Deposit",
        amount: String(amountNum),
        note: ledgerDraft.note || "",
      };

      let nextLedger;
      if (editingLedgerId) {
        nextLedger = ledger.map(l => (l.id === editingLedgerId ? ledgerObj : l));
        setLedger(nextLedger);
        if (dbStatus.tablesReady) await persistLedger(ledgerObj);
        setEditingLedgerId(null);
      } else {
        nextLedger = [...ledger, ledgerObj];
        setLedger(nextLedger);
        if (dbStatus.tablesReady) await persistLedger(ledgerObj);
      }

      saveLocalCache({ startingCapital, trades, ledger: nextLedger, holdings, targetPct });

      setLedgerDraft(emptyLedger());
      setShowLedgerForm(false);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed to save ledger:", e);
      setSaveState("error");
    }
  };

  const quickWithdraw = async () => {
    if (!withdrawDraft.amount) return;
    setSaveState("saving");
    try {
      const created = { id: generateId(), type: "Withdrawal", ...withdrawDraft };
      const nextLedger = [...ledger, created];
      setLedger(nextLedger);
      saveLocalCache({ startingCapital, trades, ledger: nextLedger, holdings, targetPct });
      if (dbStatus.tablesReady) await persistLedger(created);
      setWithdrawDraft({ date: todayLocalISO(), amount: "", note: "" });
      setShowWithdrawForm(false);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed quick withdraw:", e);
      setSaveState("error");
    }
  };

  const deleteLedger = async (id) => {
    if (!confirm("Are you sure you want to delete this capital entry?")) return;
    setSaveState("saving");
    try {
      const nextLedger = ledger.filter(l => l.id !== id);
      setLedger(nextLedger);
      if (dbStatus.tablesReady) await removeLedgerFromDb(id);

      saveLocalCache({ startingCapital, trades, ledger: nextLedger, holdings, targetPct });

      if (editingLedgerId === id) cancelLedgerForm();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed to delete ledger entry:", e);
      setSaveState("error");
    }
  };

  // Holdings Quick Part / Tranche Actions
  const openQuickPartModal = (holdingId) => {
    const target = holdings.find(h => h.id === holdingId);
    setQuickPartHoldingId(holdingId);
    setQuickPartDraft({
      date: todayLocalISO(),
      qty: "",
      buyPrice: target?.currentPrice || target?.buyPrice || "",
      note: "",
    });
    setShowQuickPartModal(true);
  };

  const saveQuickPart = async (holdingId, partData) => {
    const current = holdings.find(h => h.id === holdingId);
    if (!current) return;

    setSaveState("saving");
    try {
      const newTranche = {
        id: generateId(),
        date: partData.date || todayLocalISO(),
        qty: Number(partData.qty) || 0,
        buyPrice: Number(partData.buyPrice) || 0,
        note: partData.note || "",
      };

      const existingTranches = Array.isArray(current.tranches) && current.tranches.length > 0
        ? [...current.tranches]
        : (current.qty && current.buyPrice ? [{
            id: `${current.id}-t1`,
            date: current.date || todayLocalISO(),
            qty: Number(current.qty),
            buyPrice: Number(current.buyPrice),
            note: "Initial purchase",
          }] : []);

      const updatedTranches = [...existingTranches, newTranche];

      let totalQty = 0;
      let totalCost = 0;
      updatedTranches.forEach(t => {
        const q = Number(t.qty) || 0;
        const p = Number(t.buyPrice) || 0;
        totalQty += q;
        totalCost += (q * p);
      });
      const avgBuy = totalQty > 0 ? (totalCost / totalQty) : 0;

      const updatedHolding = {
        ...current,
        qty: String(totalQty),
        buyPrice: String(Number(avgBuy.toFixed(2))),
        tranches: updatedTranches,
        metadata: {
          ...(current.metadata || {}),
          tranches: updatedTranches,
        },
      };

      const nextHoldings = holdings.map(h => (h.id === holdingId ? updatedHolding : h));
      setHoldings(nextHoldings);
      saveLocalCache({ startingCapital, trades, ledger, holdings: nextHoldings, targetPct });

      if (dbStatus.tablesReady) {
        await persistHolding(updatedHolding);
      }

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed to add purchase part:", e);
      setSaveState("error");
    }
  };

  const deleteHoldingTranche = async (holdingId, trancheId) => {
    const current = holdings.find(h => h.id === holdingId);
    if (!current) return;

    setSaveState("saving");
    try {
      const existingTranches = Array.isArray(current.tranches) ? current.tranches : [];
      const filteredTranches = existingTranches.filter(t => t.id !== trancheId);

      if (filteredTranches.length === 0) {
        alert("A position must have at least one purchase part. To remove the position, use Delete Position.");
        setSaveState("idle");
        return;
      }

      let totalQty = 0;
      let totalCost = 0;
      filteredTranches.forEach(t => {
        const q = Number(t.qty) || 0;
        const p = Number(t.buyPrice) || 0;
        totalQty += q;
        totalCost += (q * p);
      });
      const avgBuy = totalQty > 0 ? (totalCost / totalQty) : 0;

      const updatedHolding = {
        ...current,
        qty: String(totalQty),
        buyPrice: String(Number(avgBuy.toFixed(2))),
        tranches: filteredTranches,
        metadata: {
          ...(current.metadata || {}),
          tranches: filteredTranches,
        },
      };

      const nextHoldings = holdings.map(h => (h.id === holdingId ? updatedHolding : h));
      setHoldings(nextHoldings);
      saveLocalCache({ startingCapital, trades, ledger, holdings: nextHoldings, targetPct });

      if (dbStatus.tablesReady) {
        await persistHolding(updatedHolding);
      }

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed to delete purchase part:", e);
      setSaveState("error");
    }
  };

  // Holdings Actions (Independent Equity Tracking)
  const startEditHolding = (h) => {
    const tranches = Array.isArray(h.tranches) && h.tranches.length > 0
      ? h.tranches.map(t => ({ ...t }))
      : [{
          id: generateId(),
          date: h.date || todayLocalISO(),
          qty: h.qty != null ? String(h.qty) : "",
          buyPrice: h.buyPrice != null ? String(h.buyPrice) : "",
          note: "Initial purchase",
        }];

    setHoldingDraft({
      id: h.id,
      date: h.date || todayLocalISO(),
      stock: h.stock || "",
      companyName: h.companyName || "",
      exchange: h.exchange || "NSE",
      qty: h.qty != null ? String(h.qty) : "",
      buyPrice: h.buyPrice != null ? String(h.buyPrice) : "",
      currentPrice: h.currentPrice != null ? String(h.currentPrice) : "",
      priceUpdatedOn: h.priceUpdatedOn || h.date || todayLocalISO(),
      peRatio: h.peRatio != null ? String(h.peRatio) : "",
      beta: h.beta != null ? String(h.beta) : "",
      companySize: h.companySize || "Large cap",
      valuationView: h.valuationView || "Needs review",
      dividendDate: h.dividendDate || "",
      dividendPerShare: h.dividendPerShare != null ? String(h.dividendPerShare) : "",
      investmentNote: h.investmentNote || "",
      newsDate: h.newsDate || "",
      metadata: h.metadata || {},
      tranches: tranches,
    });
    setEditingHoldingId(h.id);
    setShowHoldingForm(true);
  };

  const cancelHoldingForm = () => {
    setShowHoldingForm(false);
    setEditingHoldingId(null);
    setHoldingDraft(emptyHolding());
  };

  const addHolding = async () => {
    setSaveState("saving");
    try {
      const holdingId = editingHoldingId || holdingDraft.id || generateId();
      const stockSymbol = (holdingDraft.stock || holdingDraft.companyName || "STOCK").toUpperCase().trim();

      const rawTranches = Array.isArray(holdingDraft.tranches) && holdingDraft.tranches.length > 0
        ? holdingDraft.tranches
        : [{
            id: generateId(),
            date: holdingDraft.date || todayLocalISO(),
            qty: holdingDraft.qty,
            buyPrice: holdingDraft.buyPrice,
            note: "Initial purchase",
          }];

      const tranches = rawTranches.map(t => ({
        id: t.id || generateId(),
        date: t.date || todayLocalISO(),
        qty: Number(t.qty) || 0,
        buyPrice: Number(t.buyPrice) || 0,
        note: t.note || "",
      })).filter(t => t.qty > 0 && t.buyPrice > 0);

      let totalQty = 0;
      let totalCost = 0;
      tranches.forEach(t => {
        totalQty += t.qty;
        totalCost += (t.qty * t.buyPrice);
      });

      const avgBuyPrice = totalQty > 0 ? (totalCost / totalQty) : (Number(holdingDraft.buyPrice) || 0);
      const effectiveQty = totalQty > 0 ? totalQty : (Number(holdingDraft.qty) || 0);

      const holdingObj = {
        ...holdingDraft,
        id: holdingId,
        date: tranches[0]?.date || holdingDraft.date || todayLocalISO(),
        stock: stockSymbol,
        companyName: holdingDraft.companyName || stockSymbol,
        exchange: holdingDraft.exchange || "NSE",
        qty: String(effectiveQty),
        buyPrice: String(Number(avgBuyPrice.toFixed(2))),
        currentPrice: holdingDraft.currentPrice !== "" && holdingDraft.currentPrice != null
          ? String(holdingDraft.currentPrice)
          : String(Number(avgBuyPrice.toFixed(2))),
        priceUpdatedOn: holdingDraft.priceUpdatedOn || todayLocalISO(),
        tranches: tranches.length > 0 ? tranches : [{
          id: generateId(),
          date: holdingDraft.date || todayLocalISO(),
          qty: effectiveQty,
          buyPrice: avgBuyPrice,
          note: "Initial purchase",
        }],
        metadata: {
          ...(holdingDraft.metadata || {}),
          tranches: tranches.length > 0 ? tranches : [{
            id: generateId(),
            date: holdingDraft.date || todayLocalISO(),
            qty: effectiveQty,
            buyPrice: avgBuyPrice,
            note: "Initial purchase",
          }],
        },
      };

      let nextHoldings;
      if (editingHoldingId) {
        nextHoldings = holdings.map(h => (h.id === editingHoldingId ? holdingObj : h));
        setHoldings(nextHoldings);
        await persistHolding(holdingObj);
        setEditingHoldingId(null);
      } else {
        nextHoldings = [...holdings, holdingObj];
        setHoldings(nextHoldings);
        await persistHolding(holdingObj);
      }

      saveLocalCache({ startingCapital, trades, ledger, holdings: nextHoldings, targetPct });

      setHoldingDraft(emptyHolding());
      setShowHoldingForm(false);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed to save holding:", e);
      setSaveState("error");
    }
  };

  const deleteHolding = async (id) => {
    setSaveState("saving");
    try {
      const nextHoldings = holdings.filter(h => h.id !== id);
      setHoldings(nextHoldings);
      saveLocalCache({ startingCapital, trades, ledger, holdings: nextHoldings, targetPct });
      await removeHoldingFromDb(id);

      if (editingHoldingId === id) cancelHoldingForm();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed to delete holding:", e);
      setSaveState("error");
    }
  };

  const updateHoldingField = async (id, field, val) => {
    const current = holdings.find(h => h.id === id);
    if (!current) return;

    const updated = {
      ...current,
      [field]: val,
      ...(field === "currentPrice" || field === "buyPrice" ? { priceUpdatedOn: todayLocalISO() } : {}),
    };

    const nextHoldings = holdings.map(h => (h.id === id ? updated : h));
    setHoldings(nextHoldings);
    saveLocalCache({ startingCapital, trades, ledger, holdings: nextHoldings, targetPct });

    try {
      setSaveState("saving");
      const res = await persistHolding(updated);
      if (res?.error) {
        console.error("Supabase persistHolding error:", res.error);
        setSaveState("error");
      } else {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      }
    } catch (e) {
      console.error("Failed to persist holding field update:", e);
      setSaveState("error");
    }
  };

  const [fetchingQuotes, setFetchingQuotes] = useState(false);
  const [quoteFetchStatus, setQuoteFetchStatus] = useState("");

  const fetchHoldingLiveCMP = async (id) => {
    const target = holdings.find(h => h.id === id);
    if (!target) return;
    try {
      const q = await fetchStockQuote(target.stock);
      if (q && q.price != null) {
        await updateHoldingField(id, "currentPrice", q.price);
        return q.price;
      }
    } catch (e) {
      console.warn("Quote fetch error:", e);
    }
  };

  const fetchAllLiveCMPs = async () => {
    if (fetchingQuotes) return;
    setFetchingQuotes(true);
    setQuoteFetchStatus("Fetching live market prices...");
    try {
      let count = 0;
      for (const h of holdings) {
        const q = await fetchStockQuote(h.stock);
        if (q && q.price != null) {
          await updateHoldingField(h.id, "currentPrice", q.price);
          count++;
        }
      }
      setQuoteFetchStatus(`Updated ${count} stock prices!`);
      setTimeout(() => setQuoteFetchStatus(""), 3500);
    } catch (e) {
      console.warn("Bulk quote fetch error:", e);
      setQuoteFetchStatus("Could not fetch some prices.");
      setTimeout(() => setQuoteFetchStatus(""), 3500);
    } finally {
      setFetchingQuotes(false);
    }
  };

  // Sync to Supabase
  const handleSyncToSupabase = async () => {
    setSyncingAll(true);
    try {
      const res = await syncAllToSupabase({
        startingCapital,
        targetPct,
        trades,
        ledger,
        holdings
      });
      if (res.errors.length === 0) {
        setDbStatus(prev => ({ ...prev, tablesReady: true }));
        alert(`Successfully synced with Supabase Cloud!\n• ${res.trades} trades active\n• ${res.ledger} ledger transactions active\n• ${res.holdings} equity investments active`);
      } else {
        alert(`Sync warning:\n${res.errors.join('\n')}`);
      }
    } catch (err) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncingAll(false);
    }
  };

  const dailyThought = useMemo(() => getDailyThought(), []);

  // Export tools
  const downloadBlob = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const payload = { startingCapital, trades, ledger, holdings, exportedAt: new Date().toISOString() };
    downloadBlob(JSON.stringify(payload, null, 2), `belief-backup-${todayLocalISO()}.json`, "application/json");
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const tradeRows = trades.map(t => ({
      Date: t.date, Index: t.index, Strategy: t.strategy, Bias: t.bias,
      "Gross P&L": Number(t.gross) || 0, "Charges": Number(t.charges) || 0,
      "Net P&L": (Number(t.gross) || 0) - (Number(t.charges) || 0),
      "Stop-loss": t.rules?.sl ? "Y" : "N", "Sizing": t.rules?.sizing ? "Y" : "N",
      "No Revenge": t.rules?.noRevenge ? "Y" : "N", "Plan Followed": t.rules?.plan ? "Y" : "N",
      Notes: t.notes || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tradeRows), "Trade Log");

    const ledgerRows = ledger.map(l => ({ Date: l.date, Type: l.type, "Amount": Number(l.amount) || 0, Note: l.note || "" }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ledgerRows), "Capital Ledger");

    const holdingRows = holdings.map(h => ({
      Date: h.date, Stock: h.stock, Qty: Number(h.qty) || 0, "Buy Price": Number(h.buyPrice) || 0,
      "Current Price": h.currentPrice !== "" ? Number(h.currentPrice) : Number(h.buyPrice) || 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(holdingRows), "Equity Investments");

    const summaryRows = [{ "Starting Capital": startingCapital, "Current Capital": stats.currentCapital, "Exported On": todayLocalISO() }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadBlob(out, `belief-backup-${todayLocalISO()}.xlsx`, "application/octet-stream");
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", paddingBottom: 60, background: "var(--bg-main)", color: "var(--text-main)", transition: "background-color 0.2s ease, color 0.2s ease" }}>
      {/* Top Navigation Bar */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--header-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-card)",
        padding: "12px 20px"
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Logo & Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width={24} height={24} viewBox="0 0 40 40">
                <rect x={7} y={22} width={5} height={11} rx={1.5} fill="#D97706" />
                <rect x={15} y={15} width={5} height={18} rx={1.5} fill="#F59E0B" />
                <rect x={23} y={9} width={5} height={24} rx={1.5} fill="#FCD34D" />
                <path d="M23 9 L33 4 M33 4 L28 4.5 M33 4 L32.5 9" stroke="#FCD34D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="script-brand" style={{ fontSize: 26, color: "var(--color-gold)", lineHeight: 1 }}>Belief</span>
                <span className="desktop-only" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase" }}>Institutional</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-secondary)", fontWeight: 500, letterSpacing: "0.02em" }}>
                Trade with Conviction
              </div>
            </div>
          </div>

          {/* Controls on Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Supabase Status Pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "var(--color-win-soft)",
              border: "1px solid var(--color-win-border)",
              color: "var(--color-win-text)",
              padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-win)", boxShadow: "0 0 8px var(--color-win)" }} />
              <span className="desktop-only">Supabase Cloud</span>
            </div>

            {/* Sync Button */}
            <button
              onClick={handleSyncToSupabase}
              disabled={syncingAll}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}
              title="Force Sync All to Supabase"
            >
              <RefreshCw size={13} className={syncingAll ? "animate-spin" : ""} />
              <span className="desktop-only">{syncingAll ? "Syncing..." : "Sync"}</span>
            </button>

            {/* Backups */}
            <button onClick={exportJSON} style={{
              display: "flex", alignItems: "center", gap: 4, background: "transparent",
              border: "1px solid var(--border-subtle)", color: "var(--text-secondary)",
              borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer"
            }} title="Export JSON backup">
              <Download size={13} />
              <span className="desktop-only">JSON</span>
            </button>

            <button onClick={exportExcel} style={{
              display: "flex", alignItems: "center", gap: 4, background: "transparent",
              border: "1px solid var(--border-subtle)", color: "var(--text-secondary)",
              borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer"
            }} title="Export Excel backup">
              <Download size={13} />
              <span className="desktop-only">Excel</span>
            </button>

            {/* Theme Toggle */}
            <button onClick={toggleTheme} style={{
              width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", cursor: "pointer"
            }} title="Toggle Dark/Light Mode">
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Avatar Profile Medallion */}
            <button
              onClick={() => setShowAvatarModal(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                padding: 0,
                border: isAvatarHappy ? "2px solid var(--color-win)" : "2px solid var(--color-gold)",
                boxShadow: isAvatarHappy ? "0 0 10px rgba(16, 185, 129, 0.45)" : "0 0 8px rgba(198, 167, 94, 0.35)",
                overflow: "hidden",
                cursor: "pointer",
                background: "var(--bg-elevated)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              title="Bharat's Life & Mindset Companion (Click to view full-body poses & stats)"
            >
              <img
                src={autoAvatarSrc}
                alt="Bharat Avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </button>

            {saveState !== "idle" && (
              <span className="mono" style={{ fontSize: 11, color: "var(--color-gold)", marginLeft: 4 }}>
                {saveState === "saving" ? "saving…" : "saved ✓"}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 20px" }}>
        {/* Thought for Today Banner */}
        <div className="daily-focus-banner" style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
          background: "var(--bg-card)", border: "1px solid var(--border-card)",
          borderRadius: 10, marginBottom: 16
        }}>
          <span style={{ color: "var(--color-gold)", fontSize: 14, flexShrink: 0 }}>✦</span>
          <span style={{ fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", flexShrink: 0 }}>
            Daily Focus
          </span>
          <div className="desktop-only" style={{ height: 12, width: 1, background: "var(--border-subtle)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            "{dailyThought}"
          </span>
        </div>

        {/* Top 6 KPI Metric Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12, marginBottom: 20
        }}>
          <MetricSummaryCard label="Current Capital" value={fmtINR(stats.currentCapital)} icon={<Wallet size={16} />} />
          <MetricSummaryCard label="Today's P&L" value={fmtSigned(stats.todayPnl)} isPnl val={stats.todayPnl} icon={stats.todayPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} />
          <MetricSummaryCard label="Overall Net P&L" value={fmtSigned(stats.totalNet)} isPnl val={stats.totalNet} icon={<IndianRupee size={16} />} />
          <MetricSummaryCard label="Overall ROI" value={fmtPct(stats.overallROI)} isPnl val={stats.overallROI} icon={<Target size={16} />} />
          <MetricSummaryCard label="Discipline Adherence" value={`${stats.discipline.toFixed(0)}%`} icon={<ShieldCheck size={16} />} customColor={stats.discipline >= 80 ? "var(--color-win-text)" : "var(--color-gold)"} />
          <MetricSummaryCard label="Current Streak" value={`${stats.streak || 0} ${stats.streakType === "loss" ? "loss" : "win"} day${stats.streak === 1 ? "" : "s"}`} icon={<Flame size={16} />} customColor={stats.streakType === "loss" ? "var(--color-loss-text)" : "var(--color-win-text)"} />
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="tab-pills-container" style={{ marginBottom: 20 }}>
          {[
            ["overview", "Overview", <TrendingUp size={14} />],
            ["trades", `Trades (${trades.length})`, <Briefcase size={14} />],
            ["budget", "Budget Planner", <PiggyBank size={14} />],
            ["capital", "Capital Ledger", <Wallet size={14} />],
            ["investments", `Investments (${holdings.length})`, <Briefcase size={14} />],
            ["habits", "Habits & SOP", <CheckCircle2 size={14} />],
            ["discipline", "Discipline", <ShieldCheck size={14} />],
            ["plan20cr", "🎯 ₹20 Cr Plan", <Target size={14} />],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`tab-pill ${tab === key ? "active" : ""} ${key === "plan20cr" ? "tab-pill-plan20cr" : ""}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {tab === "overview" && (
          <OverviewTab stats={stats} targetPct={targetPct} setTargetPct={setTargetPct} trades={tradesSorted} startingCapital={startingCapital} />
        )}

        {tab === "trades" && (
          <TradesTab
            trades={filteredTrades}
            totalTrades={trades.length}
            search={tradeSearch}
            setSearch={setTradeSearch}
            indexFilter={indexFilter}
            setIndexFilter={setIndexFilter}
            openNewTradeForm={openNewTradeForm}
            startEditTrade={startEditTrade}
            deleteTrade={deleteTrade}
            setShowWithdrawForm={setShowWithdrawForm}
          />
        )}

        {tab === "budget" && (
          <BudgetPlannerTab
            trades={trades}
            todayPnl={stats.todayPnl}
            currentCapital={stats.currentCapital}
            holdings={holdings}
            holdingsInvested={stats.holdingsInvested}
            holdingsCurrentValue={stats.holdingsCurrentValue}
            holdingsReturnPct={stats.holdingsReturnPct}
            equityXIRR={stats.equityXIRR}
          />
        )}

        {tab === "capital" && (
          <CapitalTab
            startingCapital={startingCapital}
            setStartingCapital={setStartingCapital}
            ledger={ledger}
            stats={stats}
            openNewDepositModal={openNewDepositModal}
            openNewWithdrawModal={openNewWithdrawModal}
            startEditLedger={startEditLedger}
            deleteLedger={deleteLedger}
          />
        )}

        {tab === "investments" && (
          <InvestmentsTab
            holdings={holdings}
            stats={stats}
            openNewHoldingForm={() => { setHoldingDraft(emptyHolding()); setEditingHoldingId(null); setShowHoldingForm(true); }}
            startEditHolding={startEditHolding}
            deleteHolding={deleteHolding}
            updateHoldingField={updateHoldingField}
            openQuickPartModal={openQuickPartModal}
            deleteHoldingTranche={deleteHoldingTranche}
            fetchHoldingLiveCMP={fetchHoldingLiveCMP}
            fetchAllLiveCMPs={fetchAllLiveCMPs}
            fetchingQuotes={fetchingQuotes}
            quoteFetchStatus={quoteFetchStatus}
          />
        )}

        {tab === "habits" && (
          <DailyHabitsTab todayPnl={stats.todayPnl} discipline={stats.discipline} />
        )}

        {tab === "discipline" && (
          <DisciplineTab trades={tradesSorted} stats={stats} />
        )}

        {tab === "plan20cr" && (
          <Plan20CrTab
            stats={stats}
            trades={trades}
            ledger={ledger}
            fmtINR={fmtINR}
            fmtSigned={fmtSigned}
            fmtPct={fmtPct}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) on Mobile */}
      <div className="mobile-only" style={{ position: "fixed", bottom: 20, right: 20, zIndex: 90 }}>
        <button
          onClick={() => {
            if (tab === "capital") {
              setLedgerDraft(emptyLedger());
              setEditingLedgerId(null);
              setShowLedgerForm(true);
            } else if (tab === "investments") {
              setHoldingDraft(emptyHolding());
              setEditingHoldingId(null);
              setShowHoldingForm(true);
            } else {
              openNewTradeForm();
            }
          }}
          style={{
            width: 54, height: 54, borderRadius: "50%",
            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            color: "#0F172A", border: "none",
            boxShadow: "0 6px 20px rgba(245, 158, 11, 0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
          }}
          aria-label={
            tab === "capital" ? "Add Ledger Entry" :
            tab === "investments" ? "Add Investment Holding" :
            "Log New Trade"
          }
          title={
            tab === "capital" ? "Add Ledger Entry" :
            tab === "investments" ? "Add Investment Holding" :
            "Log New Trade"
          }
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* Modal: Log / Edit Trade */}
      {showTradeForm && (
        <ModalWrapper onClose={cancelTradeForm} title={editingTradeId ? "Edit Trade" : "Log New Trade"}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div>
              <label>Date</label>
              <input type="date" value={tradeDraft.date} onChange={e => setTradeDraft({ ...tradeDraft, date: e.target.value })} />
            </div>
            <div>
              <label>Index / Asset</label>
              <select value={tradeDraft.index} onChange={e => setTradeDraft({ ...tradeDraft, index: e.target.value })}>
                {INDEX_OPTIONS.filter(o => o !== "ALL").map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label>Strategy</label>
              <select value={tradeDraft.strategy} onChange={e => setTradeDraft({ ...tradeDraft, strategy: e.target.value })}>
                {STRATEGY_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label>Market Bias</label>
              <select value={tradeDraft.bias} onChange={e => setTradeDraft({ ...tradeDraft, bias: e.target.value })}>
                {BIAS_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label>Gross P&L (₹)</label>
              <input type="number" placeholder="0" value={tradeDraft.gross} onChange={e => setTradeDraft({ ...tradeDraft, gross: e.target.value })} />
            </div>
            <div>
              <label>Charges & Taxes (₹)</label>
              <input type="number" placeholder="0" value={tradeDraft.charges} onChange={e => setTradeDraft({ ...tradeDraft, charges: e.target.value })} />
            </div>
            <div>
              <label>Net P&L Preview</label>
              <div className="mono" style={{
                padding: "10px 14px", borderRadius: 8, background: "var(--bg-elevated)",
                fontWeight: 700, fontSize: 16,
                color: ((Number(tradeDraft.gross) || 0) - (Number(tradeDraft.charges) || 0)) >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)"
              }}>
                {fmtSigned((Number(tradeDraft.gross) || 0) - (Number(tradeDraft.charges) || 0))}
              </div>
            </div>
            <div>
              <label>Notes / Journal</label>
              <input placeholder="Trade rationale, setup, learnings..." value={tradeDraft.notes} onChange={e => setTradeDraft({ ...tradeDraft, notes: e.target.value })} />
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <label>Discipline Checklist</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 6 }}>
              {RULE_DEFS.map(r => (
                <label key={r.key} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  background: "var(--bg-elevated)", borderRadius: 8, cursor: "pointer",
                  border: tradeDraft.rules[r.key] ? "1px solid var(--color-win-border)" : "1px solid var(--border-subtle)",
                  textTransform: "none", fontSize: 12.5, color: "var(--text-main)", margin: 0
                }}>
                  <input
                    type="checkbox"
                    style={{ width: 16, height: 16, accentColor: "var(--color-win)", minHeight: "auto" }}
                    checked={tradeDraft.rules[r.key]}
                    onChange={e => setTradeDraft({ ...tradeDraft, rules: { ...tradeDraft.rules, [r.key]: e.target.checked } })}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
            <button onClick={cancelTradeForm} style={{
              background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)",
              borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}>Cancel</button>
            <button onClick={addTrade} style={{
              background: "var(--color-win)", border: "none", color: "#FFFFFF",
              borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}>
              {editingTradeId ? "Update Trade" : "Save Trade Entry"}
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* Modal: Quick Withdrawal */}
      {showWithdrawForm && (
        <ModalWrapper onClose={() => setShowWithdrawForm(false)} title="Log Profit Withdrawal">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label>Date</label>
              <input type="date" value={withdrawDraft.date} onChange={e => setWithdrawDraft({ ...withdrawDraft, date: e.target.value })} />
            </div>
            <div>
              <label>Amount (₹)</label>
              <input type="number" placeholder="0" value={withdrawDraft.amount} onChange={e => setWithdrawDraft({ ...withdrawDraft, amount: e.target.value })} />
            </div>
            <div>
              <label>Note / Purpose</label>
              <input placeholder="e.g. Daily profit payout" value={withdrawDraft.note} onChange={e => setWithdrawDraft({ ...withdrawDraft, note: e.target.value })} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
            Withdrawals are immediately recorded into your Capital Ledger and deducted from your Current Trading Capital.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button onClick={() => setShowWithdrawForm(false)} style={{
              background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)",
              borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}>Cancel</button>
            <button onClick={quickWithdraw} style={{
              background: "var(--color-loss)", border: "none", color: "#FFFFFF",
              borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}>Record Withdrawal</button>
          </div>
        </ModalWrapper>
      )}

      {/* Modal: Bharat's Full-Body Companion */}
      {showAvatarModal && (
        <ModalWrapper onClose={() => { setShowAvatarModal(false); setAvatarPreviewMode(null); }} title="Bharat's Life & Mindset Companion">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "10px 0" }}>
            {/* Full-Body Avatar Artwork Frame with Kinetic Motion */}
            <div style={{
              width: 250,
              height: 330,
              borderRadius: 16,
              overflow: "hidden",
              border: `3px solid ${currentBharatActivity.accentColor}`,
              boxShadow: `0 0 30px ${currentBharatActivity.glowColor}, 0 10px 24px rgba(0,0,0,0.25)`,
              marginBottom: 14,
              background: "var(--bg-card)",
              position: "relative",
            }}>
              {/* Kinetic Motion Animated Character */}
              <div style={{
                width: "100%",
                height: "100%",
                animation: currentBharatActivity.id === "workout"
                  ? "avatarPushupMotion 2.4s ease-in-out infinite"
                  : currentBharatActivity.id === "meditation"
                  ? "avatarLevitate 3.8s ease-in-out infinite"
                  : currentBharatActivity.id === "cricket"
                  ? "avatarCricketTap 3.4s ease-in-out infinite"
                  : "avatarLevitate 4.5s ease-in-out infinite",
                transformOrigin: "center center",
              }}>
                <img
                  src={currentBharatActivity.image}
                  alt={`Bharat - ${currentBharatActivity.name}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                />
              </div>

              {/* Pulsing Live Action Indicator Badge */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(8px)",
                  border: `1px solid ${currentBharatActivity.accentColor}60`,
                  padding: "3px 9px",
                  borderRadius: 20,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontWeight: 650,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: currentBharatActivity.accentColor,
                    display: "inline-block",
                    animation: "avatarLiveDotPulse 1.4s ease-in-out infinite",
                  }}
                />
                Live Action
              </div>
            </div>

            {/* Persona Badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 14px",
              borderRadius: 20,
              background: "var(--bg-elevated)",
              border: `1px solid ${currentBharatActivity.accentColor}`,
              color: currentBharatActivity.accentColor,
              fontSize: 12,
              fontWeight: 650,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}>
              <span>{currentBharatActivity.emoji}</span>
              <span>{currentBharatActivity.name}</span>
            </div>

            {/* Live Interactive Action Trigger Button */}
            <button
              onClick={() => {
                if (currentBharatActivity.id === "workout") playPushupRepSound(1);
                else if (currentBharatActivity.id === "meditation") playMeditationChime();
                else if (currentBharatActivity.id === "cricket") playCricketShotSound();
                else if (currentBharatActivity.id === "romance") playGlassClinkSound();
                else if (currentBharatActivity.id === "profit") playProfitFanfare();
                else playPushupRepSound(2);
              }}
              style={{
                width: "100%",
                maxWidth: 480,
                padding: "8px 16px",
                borderRadius: 8,
                border: `1px solid ${currentBharatActivity.accentColor}`,
                background: `linear-gradient(135deg, ${currentBharatActivity.accentColor}25 0%, var(--bg-elevated) 100%)`,
                color: "var(--text-main)",
                fontSize: 12.5,
                fontWeight: 650,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 12,
                boxShadow: `0 2px 10px ${currentBharatActivity.glowColor}`,
              }}
            >
              <Sparkles size={14} color={currentBharatActivity.accentColor} />
              {currentBharatActivity.id === "workout"
                ? "⚡ Count Pushup Rep (+ Audio FX)"
                : currentBharatActivity.id === "meditation"
                ? "🔔 Strike 528 Hz Singing Bowl Chime"
                : currentBharatActivity.id === "cricket"
                ? "🏏 Strike Cover Drive (Wood Crack FX)"
                : currentBharatActivity.id === "romance"
                ? "🥂 Toast & Clink Wine Glasses"
                : currentBharatActivity.id === "profit"
                ? "🎉 Play ₹20Cr Victory Fanfare"
                : "⚡ Focus & Poise Mind"}
            </button>

            {/* Avatar Quote */}
            <div style={{
              maxWidth: 480,
              fontSize: 13.5,
              fontWeight: 600,
              lineHeight: 1.5,
              color: "var(--text-main)",
              fontStyle: "italic",
              marginBottom: 14,
              background: "var(--bg-elevated)",
              padding: "12px 18px",
              borderRadius: 12,
              border: "1px solid var(--border-subtle)",
            }}>
              "{currentBharatActivity.quote}"
              <div style={{ fontSize: 10.5, fontStyle: "normal", color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
                Context: {currentBharatActivity.routineReason}
              </div>
            </div>

            {/* State KPIs */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              width: "100%",
              maxWidth: 480,
              marginBottom: 16,
            }}>
              <div style={{ background: "var(--bg-elevated)", padding: 10, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 650 }}>Today's P&L</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: stats.todayPnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                  {fmtSigned(stats.todayPnl)}
                </div>
              </div>
              <div style={{ background: "var(--bg-elevated)", padding: 10, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 650 }}>Discipline</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: stats.discipline >= 80 ? "var(--color-win-text)" : "var(--color-gold)" }}>
                  {stats.discipline.toFixed(0)}%
                </div>
              </div>
              <div style={{ background: "var(--bg-elevated)", padding: 10, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 650 }}>Streak</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-gold)" }}>
                  {stats.streak || 0}d
                </div>
              </div>
            </div>

            {/* 7 Activity Selectors */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 480 }}>
              <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 650, textTransform: "uppercase" }}>
                Switch Bharat's Activity / Pose:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
                {BHARAT_ACTIVITIES.map((act) => {
                  const isSelected = currentBharatActivity.id === act.id;
                  return (
                    <button
                      key={act.id}
                      onClick={() => setAvatarPreviewMode(act.id)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: isSelected ? 700 : 500,
                        cursor: "pointer",
                        background: isSelected ? act.accentColor : "var(--bg-elevated)",
                        color: isSelected ? "#0F172A" : "var(--text-secondary)",
                        border: isSelected ? `1px solid ${act.accentColor}` : "1px solid var(--border-subtle)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {act.emoji} {act.short}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Modal: Record Capital Movement */}
      {showLedgerForm && (
        <ModalWrapper
          onClose={cancelLedgerForm}
          title={editingLedgerId ? "Edit Capital Movement" : (ledgerDraft.type === "Deposit" ? "Add Capital (Deposit)" : "Record Capital Withdrawal")}
          subtitle="Keep deposits and withdrawals strictly tracked for accurate trading capital and ROI"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Movement Selection Buttons */}
            <div>
              <label>Movement Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, height: 44 }}>
                <button
                  type="button"
                  onClick={() => setLedgerDraft(prev => ({ ...prev, type: "Deposit" }))}
                  style={{
                    borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                    background: ledgerDraft.type === "Deposit" ? "var(--color-win-soft)" : "var(--bg-elevated)",
                    border: ledgerDraft.type === "Deposit" ? "2px solid var(--color-win)" : "1px solid var(--border-subtle)",
                    color: ledgerDraft.type === "Deposit" ? "var(--color-win-text)" : "var(--text-secondary)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <ArrowDownLeft size={16} /> + Deposit (Add Capital)
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerDraft(prev => ({ ...prev, type: "Withdrawal" }))}
                  style={{
                    borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                    background: ledgerDraft.type === "Withdrawal" ? "var(--color-loss-soft)" : "var(--bg-elevated)",
                    border: ledgerDraft.type === "Withdrawal" ? "2px solid var(--color-loss)" : "1px solid var(--border-subtle)",
                    color: ledgerDraft.type === "Withdrawal" ? "var(--color-loss-text)" : "var(--text-secondary)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <ArrowUpRight size={16} /> - Withdrawal (Withdraw Capital)
                </button>
              </div>
            </div>

            {/* Date & Amount */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={ledgerDraft.date}
                  onChange={e => setLedgerDraft(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <label>{ledgerDraft.type === "Deposit" ? "Amount Deposited (₹)" : "Amount Withdrawn (₹)"}</label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  className="mono"
                  value={ledgerDraft.amount}
                  onChange={e => setLedgerDraft(prev => ({ ...prev, amount: e.target.value }))}
                  style={{ fontSize: 16, fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Notes / Purpose */}
            <div>
              <label>Note / Purpose</label>
              <input
                placeholder={ledgerDraft.type === "Deposit" ? "e.g. Bank transfer, fresh trading capital" : "e.g. Profit payout, personal expense"}
                value={ledgerDraft.note}
                onChange={e => setLedgerDraft(prev => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <button
              onClick={cancelLedgerForm}
              style={{
                background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)",
                borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              onClick={addLedger}
              style={{
                background: ledgerDraft.type === "Deposit" ? "linear-gradient(135deg, #10B981 0%, #059669 100%)" : "linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)",
                border: "none", color: "#FFFFFF",
                borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: ledgerDraft.type === "Deposit" ? "0 2px 8px rgba(16, 185, 129, 0.3)" : "0 2px 8px rgba(244, 63, 94, 0.3)"
              }}
            >
              {editingLedgerId ? "Update Entry" : (ledgerDraft.type === "Deposit" ? "Add Capital" : "Record Withdrawal")}
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* Modal: Holding Form (Multi-Part Accumulation) */}
      {showHoldingForm && (
        <ModalWrapper
          onClose={cancelHoldingForm}
          title={editingHoldingId ? "Edit Stock Position" : "New Equity Investment"}
          subtitle="Record accumulation purchases with multiple dates and prices to track true XIRR & average cost"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 1. Basic Company Details */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label>Stock Symbol</label>
                <input
                  placeholder="e.g. BSE"
                  className="mono"
                  value={holdingDraft.stock}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, stock: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label>Company Name</label>
                <input
                  placeholder="e.g. Bombay Stock Exchange"
                  value={holdingDraft.companyName}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div>
                <label>Exchange</label>
                <select
                  value={holdingDraft.exchange}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, exchange: e.target.value }))}
                >
                  <option>NSE</option>
                  <option>BSE</option>
                  <option>UNLISTED</option>
                </select>
              </div>
              <div>
                <label>Company Size</label>
                <select
                  value={holdingDraft.companySize}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, companySize: e.target.value }))}
                >
                  <option>Large cap</option>
                  <option>Mid cap</option>
                  <option>Small cap</option>
                  <option>Micro cap</option>
                </select>
              </div>
              <div>
                <label>Valuation View</label>
                <select
                  value={holdingDraft.valuationView}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, valuationView: e.target.value }))}
                >
                  <option>Needs review</option>
                  <option>Undervalued</option>
                  <option>Fair</option>
                  <option>Overvalued</option>
                </select>
              </div>
            </div>

            {/* 2. Purchase Parts / Tranches Accumulation Section */}
            <div style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Purchase Parts / Tranches ({holdingDraft.tranches?.length || 1})
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    Buying in parts? Add each purchase date, quantity, and buy price
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHoldingDraft(prev => ({
                      ...prev,
                      tranches: [
                        ...(prev.tranches || []),
                        emptyTranche(todayLocalISO())
                      ]
                    }));
                  }}
                  style={{
                    background: "rgba(229, 184, 105, 0.15)",
                    border: "1px solid var(--color-gold-border)",
                    color: "var(--color-gold)",
                    borderRadius: 6,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  <Plus size={13} /> + Add Another Part
                </button>
              </div>

              {/* List of Tranches */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(holdingDraft.tranches || []).map((tranche, idx) => {
                  const partCost = (Number(tranche.qty) || 0) * (Number(tranche.buyPrice) || 0);
                  return (
                    <div
                      key={tranche.id || idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr)) 34px",
                        gap: 10,
                        alignItems: "center",
                        background: "var(--bg-input)",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border-input)"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 3 }}>
                          Part #{idx + 1} Date
                        </div>
                        <input
                          type="date"
                          value={tranche.date}
                          onChange={e => {
                            const val = e.target.value;
                            setHoldingDraft(prev => ({
                              ...prev,
                              tranches: prev.tranches.map((t, i) => i === idx ? { ...t, date: val } : t)
                            }));
                          }}
                          style={{ padding: "6px 8px", fontSize: 12, minHeight: 34 }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 3 }}>
                          Shares (Qty)
                        </div>
                        <input
                          type="number"
                          placeholder="e.g. 50"
                          className="mono"
                          value={tranche.qty}
                          onChange={e => {
                            const val = e.target.value;
                            setHoldingDraft(prev => ({
                              ...prev,
                              tranches: prev.tranches.map((t, i) => i === idx ? { ...t, qty: val } : t)
                            }));
                          }}
                          style={{ padding: "6px 8px", fontSize: 12, minHeight: 34 }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 3 }}>
                          Buy Price (₹)
                        </div>
                        <input
                          type="number"
                          step="0.05"
                          placeholder="e.g. 4200"
                          className="mono"
                          value={tranche.buyPrice}
                          onChange={e => {
                            const val = e.target.value;
                            setHoldingDraft(prev => ({
                              ...prev,
                              tranches: prev.tranches.map((t, i) => i === idx ? { ...t, buyPrice: val } : t)
                            }));
                          }}
                          style={{ padding: "6px 8px", fontSize: 12, minHeight: 34 }}
                        />
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 3 }}>
                          <span>Note</span>
                          {partCost > 0 && <span className="mono" style={{ color: "var(--color-gold)", fontWeight: 700 }}>₹{partCost.toLocaleString('en-IN')}</span>}
                        </div>
                        <input
                          placeholder="e.g. Initial buy, averaged on dip"
                          value={tranche.note || ""}
                          onChange={e => {
                            const val = e.target.value;
                            setHoldingDraft(prev => ({
                              ...prev,
                              tranches: prev.tranches.map((t, i) => i === idx ? { ...t, note: val } : t)
                            }));
                          }}
                          style={{ padding: "6px 8px", fontSize: 12, minHeight: 34 }}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        {(holdingDraft.tranches || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setHoldingDraft(prev => ({
                                ...prev,
                                tranches: prev.tranches.filter((_, i) => i !== idx)
                              }));
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--color-loss-text)",
                              cursor: "pointer",
                              padding: 6,
                              marginTop: 14
                            }}
                            title="Remove this purchase part"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Accumulated Preview */}
              {(() => {
                let totalQ = 0;
                let totalInv = 0;
                (holdingDraft.tranches || []).forEach(t => {
                  const q = Number(t.qty) || 0;
                  const p = Number(t.buyPrice) || 0;
                  totalQ += q;
                  totalInv += (q * p);
                });
                const avgP = totalQ > 0 ? totalInv / totalQ : 0;
                return (
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                    padding: "8px 12px",
                    background: "rgba(229, 184, 105, 0.08)",
                    border: "1px dashed var(--color-gold-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    flexWrap: "wrap",
                    gap: 8
                  }}>
                    <span style={{ color: "var(--text-secondary)" }}>Accumulation Summary:</span>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <span>Total Shares: <strong className="mono" style={{ color: "var(--text-main)" }}>{totalQ}</strong></span>
                      <span>Avg Buy Price: <strong className="mono" style={{ color: "var(--text-main)" }}>₹{avgP.toFixed(2)}</strong></span>
                      <span>Total Invested: <strong className="mono" style={{ color: "var(--color-gold)" }}>{fmtINR(totalInv)}</strong></span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 3. Current Market Price (CMP) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Current Price / Share (₹)</label>
                  <button
                    type="button"
                    onClick={async () => {
                      const sym = holdingDraft.stock || holdingDraft.companyName;
                      if (!sym) return;
                      try {
                        const q = await fetchStockQuote(sym);
                        if (q && q.price != null) {
                          setHoldingDraft(prev => ({
                            ...prev,
                            currentPrice: String(q.price),
                            priceUpdatedOn: todayLocalISO(),
                          }));
                        }
                      } catch (e) {
                        console.warn("Quote fetch error:", e);
                      }
                    }}
                    style={{
                      background: "rgba(229, 184, 105, 0.15)",
                      border: "1px solid var(--color-gold-border)",
                      color: "var(--color-gold)",
                      borderRadius: 4,
                      padding: "2px 7px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                    title="Fetch live market price"
                  >
                    ⚡ Fetch Price
                  </button>
                </div>
                <input
                  type="number"
                  step="0.05"
                  placeholder="Defaults to average buy price"
                  className="mono"
                  value={holdingDraft.currentPrice}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, currentPrice: e.target.value }))}
                />
              </div>

              <div>
                <label>Price Updated On</label>
                <input
                  type="date"
                  value={holdingDraft.priceUpdatedOn}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, priceUpdatedOn: e.target.value }))}
                />
              </div>
            </div>

            {/* 4. Fundamentals & Thesis */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div>
                <label>P/E Ratio</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 22.5"
                  className="mono"
                  value={holdingDraft.peRatio}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, peRatio: e.target.value }))}
                />
              </div>
              <div>
                <label>Beta</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1.25"
                  className="mono"
                  value={holdingDraft.beta}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, beta: e.target.value }))}
                />
              </div>
              <div>
                <label>Next Dividend / Ex-Date</label>
                <input
                  type="date"
                  value={holdingDraft.dividendDate}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, dividendDate: e.target.value }))}
                />
              </div>
              <div>
                <label>Dividend Per Share (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 15"
                  className="mono"
                  value={holdingDraft.dividendPerShare}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, dividendPerShare: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label>Latest News / Investment Thesis Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Key growth catalysts, quarterly earnings, order wins, management updates..."
                value={holdingDraft.investmentNote}
                onChange={e => setHoldingDraft(prev => ({ ...prev, investmentNote: e.target.value }))}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, flexWrap: "wrap", gap: 10 }}>
            <div>
              {editingHoldingId && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this entire stock investment position?")) {
                      deleteHolding(editingHoldingId);
                    }
                  }}
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "var(--color-loss-text)",
                    borderRadius: 8,
                    padding: "9px 14px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Trash2 size={13} /> Delete Position
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
              <button
                type="button"
                onClick={cancelHoldingForm}
                style={{
                  background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)",
                  borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addHolding}
                style={{
                  background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                  border: "none", color: "#0F172A",
                  borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
                }}
              >
                {editingHoldingId ? "Update Position" : "Save Investment"}
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Modal: Quick Add Purchase Part / Tranche */}
      {showQuickPartModal && (
        <ModalWrapper
          onClose={() => {
            setShowQuickPartModal(false);
            setQuickPartHoldingId(null);
          }}
          title={`Add Purchase Part — ${holdings.find(h => h.id === quickPartHoldingId)?.stock || "Stock"}`}
          subtitle="Record another accumulation tranche with its date and buy price"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Purchase Date</label>
                <input
                  type="date"
                  value={quickPartDraft.date}
                  onChange={e => setQuickPartDraft(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label>Shares (Quantity)</label>
                <input
                  type="number"
                  placeholder="e.g. 25"
                  className="mono"
                  value={quickPartDraft.qty}
                  onChange={e => setQuickPartDraft(prev => ({ ...prev, qty: e.target.value }))}
                  style={{ fontSize: 16, fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Buy Price / Share (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="e.g. 4350"
                  className="mono"
                  value={quickPartDraft.buyPrice}
                  onChange={e => setQuickPartDraft(prev => ({ ...prev, buyPrice: e.target.value }))}
                  style={{ fontSize: 16, fontWeight: 700 }}
                />
              </div>
              <div>
                <label>Tranche Note (Optional)</label>
                <input
                  placeholder="e.g. Dip buy, quarterly SIP"
                  value={quickPartDraft.note}
                  onChange={e => setQuickPartDraft(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>
            </div>

            {/* Tranche Preview */}
            {(() => {
              const q = Number(quickPartDraft.qty) || 0;
              const p = Number(quickPartDraft.buyPrice) || 0;
              const cost = q * p;
              return (
                <div style={{
                  padding: "12px 14px",
                  background: "var(--bg-elevated)",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Capital Deployed for this Part:</span>
                  <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--color-gold)" }}>
                    {fmtINR(cost)}
                  </span>
                </div>
              );
            })()}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <button
              onClick={() => {
                setShowQuickPartModal(false);
                setQuickPartHoldingId(null);
              }}
              style={{
                background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)",
                borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!quickPartDraft.qty || !quickPartDraft.buyPrice) {
                  alert("Please enter both Quantity and Buy Price for this purchase part.");
                  return;
                }
                await saveQuickPart(quickPartHoldingId, quickPartDraft);
                setShowQuickPartModal(false);
                setQuickPartHoldingId(null);
              }}
              style={{
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                border: "none", color: "#0F172A",
                borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
              }}
            >
              Add Purchase Part
            </button>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
}

// Top Metric Card Component - Luxury Horology Finishes
function MetricSummaryCard({ label, value, icon, isPnl, val, customColor, subtext }) {
  let color = customColor || "var(--text-main)";
  let pnlClass = "";
  let medallionVariant = "";

  if (isPnl) {
    if (val > 0) {
      color = "var(--color-win-text)";
      pnlClass = "pnl-win";
      medallionVariant = "win";
    } else if (val < 0) {
      color = "var(--color-loss-text)";
      pnlClass = "pnl-loss";
      medallionVariant = "loss";
    }
  } else if (customColor) {
    if (customColor.includes("win")) medallionVariant = "win";
    else if (customColor.includes("loss")) medallionVariant = "loss";
  }

  return (
    <div className={`glass-card luxury-metric-card ${pnlClass}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {label}
          </span>
          {subtext && (
            <span style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.8 }}>
              {subtext}
            </span>
          )}
        </div>
        <div className={`luxury-icon-medallion ${medallionVariant}`}>
          {icon}
        </div>
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: "0.01em" }}>
        {value}
      </div>
    </div>
  );
}

// Modal Wrapper Component
function ModalWrapper({ children, onClose, title, subtitle }) {
  return (
    <div className="modal-backdrop" style={{
      position: "fixed", inset: 0, zIndex: 1000,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }}>
      <div className="glass-card mobile-modal" style={{
        maxWidth: 780, width: "100%", maxHeight: "90vh", overflowY: "auto",
        padding: 24, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Weekly Profit & Loss Review (Monday to Friday) Component
function WeeklyPnLReview({ trades }) {
  const [viewMode, setViewMode] = useState("week"); // "week" | "allTime"

  const getMondayIso = (dateOrIso) => {
    const d = typeof dateOrIso === "string" ? new Date(dateOrIso + "T00:00:00") : new Date(dateOrIso);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return toLocalISODate(d);
  };

  const shiftIsoDate = (isoMonday, dayOffset) => {
    const d = new Date(isoMonday + "T00:00:00");
    d.setDate(d.getDate() + dayOffset);
    return toLocalISODate(d);
  };

  const fmtDayMonth = (iso) => {
    if (!iso) return "—";
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)} ${months[mIdx] || parts[1]}`;
  };

  const latestTradeDate = useMemo(() => {
    if (!trades || trades.length === 0) return todayLocalISO();
    return trades[trades.length - 1].date;
  }, [trades]);

  const defaultMonday = useMemo(() => getMondayIso(latestTradeDate), [latestTradeDate]);
  const prevMonday = useMemo(() => shiftIsoDate(defaultMonday, -7), [defaultMonday]);
  const [selectedMonday, setSelectedMonday] = useState(defaultMonday);

  useEffect(() => {
    setSelectedMonday(defaultMonday);
  }, [defaultMonday]);

  // Compute 5 Monday to Friday days for selectedMonday
  const weekData = useMemo(() => {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const shortNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];

    const days = [];
    let weekNet = 0;
    let weekGross = 0;
    let weekCharges = 0;
    let weekTradeCount = 0;
    let winDays = 0;
    let lossDays = 0;
    let bestDayNet = -Infinity;
    let bestDayName = null;

    for (let i = 0; i < 5; i++) {
      const dayDate = shiftIsoDate(selectedMonday, i);
      const dayTrades = (trades || []).filter(t => t.date === dayDate);
      
      const count = dayTrades.length;
      const gross = dayTrades.reduce((sum, t) => sum + (Number(t.gross) || 0), 0);
      const charges = dayTrades.reduce((sum, t) => sum + (Number(t.charges) || 0), 0);
      const net = gross - charges;
      const indices = Array.from(new Set(dayTrades.map(t => t.index).filter(Boolean)));
      const hasTrades = count > 0;
      const isWin = hasTrades && net > 0;
      const isLoss = hasTrades && net < 0;

      if (hasTrades) {
        weekNet += net;
        weekGross += gross;
        weekCharges += charges;
        weekTradeCount += count;
        if (net > 0) winDays++;
        else if (net < 0) lossDays++;

        if (net > bestDayNet) {
          bestDayNet = net;
          bestDayName = shortNames[i];
        }
      }

      days.push({
        dayIndex: i,
        name: dayNames[i],
        shortName: shortNames[i],
        date: dayDate,
        displayDate: fmtDayMonth(dayDate),
        hasTrades,
        count,
        gross,
        charges,
        net,
        isWin,
        isLoss,
        indices,
        isToday: dayDate === todayLocalISO()
      });
    }

    const tradedDaysCount = winDays + lossDays;
    const winRate = tradedDaysCount > 0 ? (winDays / tradedDaysCount) * 100 : 0;

    return {
      mondayIso: selectedMonday,
      fridayIso: shiftIsoDate(selectedMonday, 4),
      days,
      weekNet,
      weekGross,
      weekCharges,
      weekTradeCount,
      winDays,
      lossDays,
      tradedDaysCount,
      winRate,
      bestDayName: bestDayNet > -Infinity ? bestDayName : null,
      bestDayNet: bestDayNet > -Infinity ? bestDayNet : 0
    };
  }, [selectedMonday, trades]);

  const goPrev = () => setSelectedMonday(prev => shiftIsoDate(prev, -7));
  const goNext = () => setSelectedMonday(prev => shiftIsoDate(prev, 7));
  const goLatest = () => setSelectedMonday(defaultMonday);

  // All-time weekday edge statistics (Mon to Fri)
  const allTimeWeekdayStats = useMemo(() => {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const shortNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const expiryLabels = ["Midcap Expiry", "FinNifty Expiry", "BankNifty Expiry", "Nifty Expiry", "Sensex Expiry"];

    const buckets = [0, 1, 2, 3, 4].map(idx => ({
      dayIndex: idx,
      name: dayNames[idx],
      shortName: shortNames[idx],
      expiryTag: expiryLabels[idx],
      totalNet: 0,
      totalGross: 0,
      totalCharges: 0,
      tradeCount: 0,
      sessions: new Map(),
    }));

    (trades || []).forEach(t => {
      const d = new Date(t.date + "T00:00:00");
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) {
        const bucket = buckets[dow - 1];
        const gross = Number(t.gross) || 0;
        const charges = Number(t.charges) || 0;
        const net = gross - charges;

        bucket.totalGross += gross;
        bucket.totalCharges += charges;
        bucket.totalNet += net;
        bucket.tradeCount += 1;

        const prevSessionNet = bucket.sessions.get(t.date) || 0;
        bucket.sessions.set(t.date, prevSessionNet + net);
      }
    });

    return buckets.map(b => {
      const sessionCount = b.sessions.size;
      let winSessions = 0;
      let lossSessions = 0;
      b.sessions.forEach(net => {
        if (net > 0) winSessions++;
        else if (net < 0) lossSessions++;
      });
      const winRate = sessionCount > 0 ? (winSessions / sessionCount) * 100 : 0;
      const avgNet = sessionCount > 0 ? b.totalNet / sessionCount : 0;

      return {
        ...b,
        sessionCount,
        winSessions,
        lossSessions,
        winRate,
        avgNet,
      };
    });
  }, [trades]);

  return (
    <div className="glass-card" style={{ padding: 22 }}>
      {/* Header Bar: Title, Week Navigator, Mode Selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 18, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-main)" }}>
              Weekly Profit & Loss Review
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
              background: "var(--color-gold-soft)", color: "var(--color-gold)", border: "1px solid var(--color-gold-border)",
              textTransform: "uppercase", letterSpacing: "0.05em"
            }}>
              Mon – Fri Sessions
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
            {viewMode === "week"
              ? `Trading window: ${fmtDayMonth(weekData.mondayIso)} – ${fmtDayMonth(weekData.fridayIso)}, ${weekData.mondayIso.slice(0, 4)}`
              : "All-time weekday edge & statistical distribution"}
          </div>
        </div>

        {/* View Mode Switcher & Navigation Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Mode Switcher */}
          <div style={{ display: "flex", background: "var(--bg-elevated)", padding: 3, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
            <button
              onClick={() => setViewMode("week")}
              style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 600, border: "none", cursor: "pointer",
                background: viewMode === "week" ? "var(--bg-card)" : "transparent",
                color: viewMode === "week" ? "var(--text-main)" : "var(--text-muted)",
                boxShadow: viewMode === "week" ? "0 1px 4px rgba(0,0,0,0.15)" : "none"
              }}
            >
              Selected Week
            </button>
            <button
              onClick={() => setViewMode("allTime")}
              style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 600, border: "none", cursor: "pointer",
                background: viewMode === "allTime" ? "var(--bg-card)" : "transparent",
                color: viewMode === "allTime" ? "var(--text-main)" : "var(--text-muted)",
                boxShadow: viewMode === "allTime" ? "0 1px 4px rgba(0,0,0,0.15)" : "none"
              }}
            >
              All-Time Weekdays
            </button>
          </div>

          {/* Week Stepper (Only active in "week" mode) */}
          {viewMode === "week" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedMonday(prevMonday)}
                className="btn-secondary"
                style={{
                  padding: "5px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  color: selectedMonday === prevMonday ? "var(--color-gold)" : "var(--text-muted)",
                  borderColor: selectedMonday === prevMonday ? "var(--color-gold-border)" : "var(--border-subtle)",
                  background: selectedMonday === prevMonday ? "var(--color-gold-soft)" : "transparent"
                }}
              >
                ◀ Prev Week
              </button>

              <button
                onClick={() => setSelectedMonday(defaultMonday)}
                className="btn-secondary"
                style={{
                  padding: "5px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  color: selectedMonday === defaultMonday ? "var(--color-gold)" : "var(--text-muted)",
                  borderColor: selectedMonday === defaultMonday ? "var(--color-gold-border)" : "var(--border-subtle)",
                  background: selectedMonday === defaultMonday ? "var(--color-gold-soft)" : "transparent"
                }}
              >
                This Week ★
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={goPrev}
                  title="Step 1 Week Back"
                  className="btn-secondary"
                  style={{ padding: "5px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={goNext}
                  title="Step 1 Week Forward"
                  className="btn-secondary"
                  style={{ padding: "5px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewMode === "week" ? (
        <>
          {/* Week KPI Ribbons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
            <div style={{ background: "var(--bg-elevated)", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
                Week Net P&L
              </div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: weekData.weekNet >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                {fmtSigned(weekData.weekNet)}
              </div>
            </div>

            <div style={{ background: "var(--bg-elevated)", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
                Day Win Rate
              </div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: weekData.winRate >= 50 ? "var(--color-win-text)" : (weekData.tradedDaysCount === 0 ? "var(--text-muted)" : "var(--color-loss-text)") }}>
                {weekData.tradedDaysCount > 0 ? `${weekData.winRate.toFixed(0)}% (${weekData.winDays}W / ${weekData.lossDays}L)` : "No trades"}
              </div>
            </div>

            <div style={{ background: "var(--bg-elevated)", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
                Trades Logged
              </div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>
                {weekData.weekTradeCount} trade{weekData.weekTradeCount === 1 ? "" : "s"}
              </div>
            </div>

            <div style={{ background: "var(--bg-elevated)", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
                Best Day
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: weekData.bestDayNet > 0 ? "var(--color-win-text)" : "var(--text-muted)" }}>
                {weekData.bestDayName ? `${weekData.bestDayName} (${fmtSigned(weekData.bestDayNet)})` : "—"}
              </div>
            </div>

            <div style={{ background: "var(--bg-elevated)", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
                Gross / Brokerage
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                {fmtINR(weekData.weekGross)} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>/ -{fmtINR(weekData.weekCharges)}</span>
              </div>
            </div>
          </div>

          {/* Monday to Friday Bar Chart */}
          <div style={{ width: "100%", height: 210, marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData.days} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortName"
                  tick={{ fill: "var(--chart-axis)", fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={false}
                  tickFormatter={(val, i) => `${val} (${weekData.days[i]?.displayDate || ""})`}
                />
                <YAxis
                  tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                  width={50}
                />
                <ReferenceLine y={0} stroke="var(--border-subtle)" strokeWidth={1.5} />
                <Tooltip
                  cursor={{ fill: "rgba(229, 184, 105, 0.05)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{
                        background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)",
                        borderRadius: 10, padding: "10px 14px", fontSize: 12, minWidth: 170,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
                      }}>
                        <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
                          {d.name}, {d.displayDate}
                        </div>
                        {d.hasTrades ? (
                          <>
                            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: d.net >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)", marginBottom: 6 }}>
                              Net: {fmtSigned(d.net)}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                              <span>Gross:</span>
                              <span className="mono" style={{ color: "var(--text-main)" }}>{fmtINR(d.gross)}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                              <span>Brokerage:</span>
                              <span className="mono" style={{ color: "var(--color-loss-text)" }}>-{fmtINR(d.charges)}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                              <span>Trades:</span>
                              <span className="mono" style={{ color: "var(--text-main)" }}>{d.count} ({d.indices.join(", ")})</span>
                            </div>
                          </>
                        ) : (
                          <div style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: 11.5 }}>
                            No trades logged on this session
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="net" radius={[6, 6, 6, 6]}>
                  {weekData.days.map((d, idx) => (
                    <Cell
                      key={idx}
                      fill={!d.hasTrades ? "rgba(148, 163, 184, 0.15)" : d.net >= 0 ? "var(--color-win)" : "var(--color-loss)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 5 Monday to Friday Session Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {weekData.days.map((d) => (
              <div
                key={d.dayIndex}
                className={`weekday-card ${d.isToday ? "is-today" : ""} ${d.isWin ? "is-win" : ""} ${d.isLoss ? "is-loss" : ""}`}
              >
                {/* Day Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", letterSpacing: "0.04em" }}>
                      {d.shortName}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                      {d.displayDate}
                    </div>
                  </div>

                  {/* Status Pill */}
                  {d.hasTrades ? (
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: d.net >= 0 ? "var(--color-win-soft)" : "var(--color-loss-soft)",
                      color: d.net >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)",
                      border: `1px solid ${d.net >= 0 ? "var(--color-win-border)" : "var(--color-loss-border)"}`
                    }}>
                      {d.net >= 0 ? "PROFIT" : "DRAWDOWN"}
                    </span>
                  ) : (
                    <span style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "rgba(148, 163, 184, 0.1)", color: "var(--text-muted)" }}>
                      OFF
                    </span>
                  )}
                </div>

                {/* Day P&L */}
                <div>
                  <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: !d.hasTrades ? "var(--text-muted)" : d.net >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                    {d.hasTrades ? fmtSigned(d.net) : "—"}
                  </div>
                  {d.hasTrades && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {d.count} trade{d.count === 1 ? "" : "s"} · charges: {fmtINR(d.charges)}
                    </div>
                  )}
                </div>

                {/* Indices traded tag */}
                {d.hasTrades && d.indices.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {d.indices.map(idx => (
                      <span key={idx} style={{
                        fontSize: 9, padding: "1px 5px", borderRadius: 3,
                        background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)",
                        border: "1px solid var(--border-subtle)"
                      }}>
                        {idx}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        /* All-Time Weekdays View */
        <>
          <div style={{ width: "100%", height: 210, marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allTimeWeekdayStats} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="shortName" tick={{ fill: "var(--chart-axis)", fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} width={50} />
                <ReferenceLine y={0} stroke="var(--border-subtle)" strokeWidth={1.5} />
                <Tooltip
                  cursor={{ fill: "rgba(229, 184, 105, 0.05)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{
                        background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)",
                        borderRadius: 10, padding: "10px 14px", fontSize: 12, minWidth: 180,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
                      }}>
                        <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
                          All-Time {d.name}s
                        </div>
                        <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: d.totalNet >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)", marginBottom: 6 }}>
                          Total Net: {fmtSigned(d.totalNet)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                          <span>Win Rate:</span>
                          <span className="mono" style={{ color: "var(--text-main)", fontWeight: 600 }}>{d.winRate.toFixed(1)}%</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                          <span>Avg P&L / Session:</span>
                          <span className="mono" style={{ color: d.avgNet >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>{fmtSigned(d.avgNet)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                          <span>Sessions Traded:</span>
                          <span className="mono" style={{ color: "var(--text-main)" }}>{d.sessionCount} ({d.winSessions}W / {d.lossSessions}L)</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--color-gold)", marginTop: 6, fontStyle: "italic" }}>
                          Key: {d.expiryTag}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="totalNet" radius={[6, 6, 6, 6]}>
                  {allTimeWeekdayStats.map((d, idx) => (
                    <Cell
                      key={idx}
                      fill={d.totalNet >= 0 ? "var(--color-win)" : "var(--color-loss)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 5 All-Time Weekday Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {allTimeWeekdayStats.map((d) => (
              <div
                key={d.dayIndex}
                className="weekday-card"
                style={{
                  borderLeft: `3px solid ${d.totalNet >= 0 ? "var(--color-win)" : "var(--color-loss)"}`
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main)" }}>
                      {d.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-gold)", fontWeight: 600 }}>
                      {d.expiryTag}
                    </div>
                  </div>
                  <span className="mono" style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    background: d.winRate >= 50 ? "var(--color-win-soft)" : "var(--color-loss-soft)",
                    color: d.winRate >= 50 ? "var(--color-win-text)" : "var(--color-loss-text)"
                  }}>
                    {d.winRate.toFixed(0)}% WIN
                  </span>
                </div>

                <div>
                  <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: d.totalNet >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                    {fmtSigned(d.totalNet)}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                    Avg: {fmtSigned(d.avgNet)} · {d.sessionCount} sessions
                  </div>
                </div>

                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                  {d.winSessions} wins · {d.lossSessions} losses ({d.tradeCount} trades)
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Weekly P&L Bar Chart Component (Consolidated Week-by-Week Performance)
function WeeklyPnLCard({ trades }) {
  const [range, setRange] = useState("8"); // "8" | "12" | "all"

  const getMondayIso = (dateOrIso) => {
    const d = typeof dateOrIso === "string" ? new Date(dateOrIso + "T00:00:00") : new Date(dateOrIso);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return toLocalISODate(d);
  };

  const shiftIsoDate = (isoMonday, dayOffset) => {
    const d = new Date(isoMonday + "T00:00:00");
    d.setDate(d.getDate() + dayOffset);
    return toLocalISODate(d);
  };

  const allWeeks = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    const weeksMap = {};

    trades.forEach(t => {
      const mon = getMondayIso(t.date);
      if (!weeksMap[mon]) {
        const fri = shiftIsoDate(mon, 4);
        weeksMap[mon] = {
          monday: mon,
          friday: fri,
          gross: 0,
          charges: 0,
          net: 0,
          tradesCount: 0,
          dayNets: {}
        };
      }
      const gross = Number(t.gross) || 0;
      const charges = Number(t.charges) || 0;
      const net = gross - charges;
      weeksMap[mon].gross += gross;
      weeksMap[mon].charges += charges;
      weeksMap[mon].net += net;
      weeksMap[mon].tradesCount += 1;
      weeksMap[mon].dayNets[t.date] = (weeksMap[mon].dayNets[t.date] || 0) + net;
    });

    const sortedKeys = Object.keys(weeksMap).sort();
    if (sortedKeys.length === 0) return [];

    const thisWeekKey = sortedKeys[sortedKeys.length - 1];
    const prevWeekKey = sortedKeys.length > 1 ? sortedKeys[sortedKeys.length - 2] : null;

    return sortedKeys.map(k => {
      const w = weeksMap[k];
      const isThisWeek = k === thisWeekKey;
      const isPrevWeek = k === prevWeekKey;

      const mParts = w.monday.split("-");
      const fParts = w.friday.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const fMonth = months[parseInt(fParts[1], 10) - 1];

      let label = `${parseInt(mParts[2], 10)}–${parseInt(fParts[2], 10)} ${fMonth}`;
      let shortLabel = label;
      if (isThisWeek) shortLabel += " (This Wk)";
      else if (isPrevWeek) shortLabel += " (Prev Wk)";

      let winDays = 0;
      let lossDays = 0;
      Object.values(w.dayNets).forEach(dn => {
        if (dn > 0) winDays++;
        else if (dn < 0) lossDays++;
      });
      const daysTraded = Object.keys(w.dayNets).length;

      return {
        key: k,
        monday: w.monday,
        friday: w.friday,
        label,
        shortLabel,
        pnl: Math.round(w.net),
        gross: Math.round(w.gross),
        charges: Math.round(w.charges),
        tradesCount: w.tradesCount,
        daysTraded,
        winDays,
        lossDays,
        winRate: daysTraded > 0 ? (winDays / daysTraded) * 100 : 0,
        isThisWeek,
        isPrevWeek,
      };
    });
  }, [trades]);

  const displayedWeeks = useMemo(() => {
    if (range === "8") return allWeeks.slice(-8);
    if (range === "12") return allWeeks.slice(-12);
    return allWeeks;
  }, [allWeeks, range]);

  const thisWeekData = allWeeks.find(w => w.isThisWeek);
  const prevWeekData = allWeeks.find(w => w.isPrevWeek);

  return (
    <div className="glass-card" style={{ padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        {/* Header with Title and Range Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)" }}>
              Weekly P&L
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Week-by-week consolidated trading performance
            </div>
          </div>

          {/* Range Pills */}
          <div style={{ display: "flex", background: "var(--bg-elevated)", padding: 2, borderRadius: 6, border: "1px solid var(--border-subtle)" }}>
            {[
              ["8", "Last 8"],
              ["12", "Last 12"],
              ["all", "All"],
            ].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setRange(val)}
                style={{
                  padding: "3px 9px", borderRadius: 5, fontSize: 10.5, fontWeight: 600, border: "none", cursor: "pointer",
                  background: range === val ? "var(--bg-card)" : "transparent",
                  color: range === val ? "var(--text-main)" : "var(--text-muted)",
                  boxShadow: range === val ? "0 1px 3px rgba(0,0,0,0.12)" : "none"
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Highlights: This Week vs Previous Week in Total */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {/* This Week Total */}
          <div style={{
            background: "var(--bg-elevated)", padding: "10px 12px", borderRadius: 8,
            border: thisWeekData ? (thisWeekData.pnl >= 0 ? "1px solid var(--color-win-border)" : "1px solid var(--color-loss-border)") : "1px solid var(--border-subtle)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                This Week
              </span>
              {thisWeekData && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                  background: thisWeekData.pnl >= 0 ? "var(--color-win-soft)" : "var(--color-loss-soft)",
                  color: thisWeekData.pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)"
                }}>
                  {thisWeekData.pnl >= 0 ? "PROFIT" : "LOSS"}
                </span>
              )}
            </div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: thisWeekData ? (thisWeekData.pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)") : "var(--text-muted)" }}>
              {thisWeekData ? fmtSigned(thisWeekData.pnl) : "—"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              {thisWeekData ? `${thisWeekData.label} · ${thisWeekData.tradesCount} trades` : "No trades"}
            </div>
          </div>

          {/* Previous Week Total */}
          <div style={{
            background: "var(--bg-elevated)", padding: "10px 12px", borderRadius: 8,
            border: prevWeekData ? (prevWeekData.pnl >= 0 ? "1px solid var(--color-win-border)" : "1px solid var(--color-loss-border)") : "1px solid var(--border-subtle)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 650, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                Previous Week
              </span>
              {prevWeekData && (
                <span style={{
                  fontSize: 9, fontWeight: 650, padding: "1px 5px", borderRadius: 3,
                  background: prevWeekData.pnl >= 0 ? "var(--color-win-soft)" : "var(--color-loss-soft)",
                  color: prevWeekData.pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)"
                }}>
                  {prevWeekData.pnl >= 0 ? "PROFIT" : "LOSS"}
                </span>
              )}
            </div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: prevWeekData ? (prevWeekData.pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)") : "var(--text-muted)" }}>
              {prevWeekData ? fmtSigned(prevWeekData.pnl) : "—"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              {prevWeekData ? `${prevWeekData.label} · ${prevWeekData.tradesCount} trades` : "No trades"}
            </div>
          </div>
        </div>

        {/* Weekly Bar Chart */}
        {displayedWeeks.length === 0 ? (
          <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 30 }}>No weekly trades logged yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={displayedWeeks} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--chart-axis)", fontSize: 9.5 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--chart-axis)", fontSize: 9.5 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                width={45}
              />
              <ReferenceLine y={0} stroke="var(--border-subtle)" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{
                      background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)",
                      borderRadius: 8, padding: "8px 12px", fontSize: 11.5, minWidth: 170,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
                    }}>
                      <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: 3 }}>
                        {d.label} {d.isThisWeek ? "(This Week)" : d.isPrevWeek ? "(Previous Week)" : ""}
                      </div>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: d.pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)", marginBottom: 4 }}>
                        Net P&L: {fmtSigned(d.pnl)}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                        <span>Gross:</span>
                        <span className="mono" style={{ color: "var(--text-main)" }}>{fmtINR(d.gross)}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                        <span>Brokerage:</span>
                        <span className="mono" style={{ color: "var(--color-loss-text)" }}>-{fmtINR(d.charges)}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                        <span>Trades:</span>
                        <span className="mono" style={{ color: "var(--text-main)" }}>{d.tradesCount} ({d.winDays}W / {d.lossDays}L)</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="pnl" radius={[4, 4, 4, 4]}>
                {displayedWeeks.map((w, idx) => (
                  <Cell
                    key={idx}
                    fill={w.pnl >= 0 ? "var(--color-win)" : "var(--color-loss)"}
                    stroke={w.isThisWeek ? "var(--color-gold)" : (w.isPrevWeek ? "var(--border-card-hover)" : "none")}
                    strokeWidth={w.isThisWeek || w.isPrevWeek ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ stats, targetPct, setTargetPct, trades, startingCapital }) {
  const dailyTarget = stats.currentCapital * (targetPct / 100);
  const stopLossLow = dailyTarget * 1;
  const stopLossHigh = dailyTarget * 1.5;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 1. Panoramic Feature: Bharat's Live P&L Mountain Ascent */}
      <PnLMountainClimber
        curve={stats.curve}
        totalNet={stats.totalNet}
        peakProfit={stats.peakProfit || 0}
        startingCapital={startingCapital}
      />

      {/* Top Row: Equity Growth Curve & Profit Curve */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        <div className="glass-card equity-chart-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)" }}>
                Equity Growth Curve
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Running capital trajectory across trading sessions</div>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Avg Daily P&L</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: stats.avgDailyPnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                  {fmtSigned(stats.avgDailyPnl)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Avg Daily ROI</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: stats.avgDailyROI >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                  {fmtPct(stats.avgDailyROI)}
                </div>
              </div>
            </div>
          </div>

          {stats.curve.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Log trades to generate your equity curve.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.curve}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} tickFormatter={fmtDate} />
                <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={50} />
                <Tooltip
                  contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={fmtDate}
                  formatter={(v) => [fmtINR(v), "Equity"]}
                />
                <Area type="monotone" dataKey="equity" stroke="var(--color-gold)" strokeWidth={2.5} fill="url(#equityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Profit Curve (Cumulative Realized Net P&L) */}
        <div className="glass-card profit-chart-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)" }}>
                Profit Curve
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Cumulative realized net profit trajectory</div>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Realized P&L</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: stats.totalNet >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                  {fmtSigned(stats.totalNet)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Peak Profit</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--color-win-text)" }}>
                  {fmtINR(stats.peakProfit || 0)}
                </div>
              </div>
            </div>
          </div>

          {stats.curve.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Log trades to generate your profit curve.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.curve}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-win)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-win)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} tickFormatter={fmtDate} />
                <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={50} />
                <ReferenceLine y={0} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={fmtDate}
                  formatter={(v) => [fmtINR(v), "Cumulative Profit"]}
                />
                <Area type="monotone" dataKey="profit" stroke="var(--color-win)" strokeWidth={2.5} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Weekly Profit & Loss Review (Monday to Friday) */}
      <WeeklyPnLReview trades={trades} />

      {/* Row 2: Target/Stoploss & Capital Health */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* Daily Target Calculator */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)" }}>
              Daily Target & Risk Stop-Loss
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Target %:</span>
              <input
                type="number" step="0.05" value={targetPct}
                onChange={e => setTargetPct(Number(e.target.value) || 0)}
                style={{ width: 60, padding: "4px 8px", fontSize: 12, minHeight: 32, textAlign: "right" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "var(--bg-elevated)", padding: 14, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Daily Target ({targetPct}%)</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--color-win-text)" }}>{fmtINR(dailyTarget)}</div>
            </div>
            <div style={{ background: "var(--bg-elevated)", padding: 14, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Suggested Stop-Loss</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--color-loss-text)" }}>
                {fmtINR(stopLossLow)} – {fmtINR(stopLossHigh)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Heuristic guideline (1x–1.5x of target) designed to protect capital and eliminate oversized drawdowns.
          </div>
        </div>

        {/* Capital Appreciation & Withdrawal Health */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)", marginBottom: 14 }}>
            Capital Retention & Inception Stats
          </div>
          <MetricRow label="Starting Capital" value={fmtINR(stats.currentCapital - stats.capitalAppreciation)} />
          <MetricRow label="Net Capital Appreciation" value={`${fmtSigned(stats.capitalAppreciation)} (${fmtPct(stats.capitalAppreciationPct)})`} color={stats.capitalAppreciation >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)"} />
          <MetricRow label="Max Drawdown from Start" value={stats.downsideFromStart < 0 ? `${fmtSigned(stats.downsideFromStart)} (${fmtPct(stats.downsideFromStartPct)})` : "None"} color={stats.downsideFromStart < 0 ? "var(--color-loss-text)" : "var(--color-win-text)"} />
          <MetricRow label="Profit vs Withdrawal Retained" value={fmtSigned(stats.profitWithdrawalDeficit)} color={stats.profitWithdrawalDeficit >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)"} />
        </div>
      </div>

      {/* Row 3: Periodic Consolidated Reviews: Weekly P&L & Monthly P&L */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {/* Weekly P&L (Consolidated Week-by-Week Bar Chart) */}
        <WeeklyPnLCard trades={trades} />

        {/* Monthly P&L (Total by Month) */}
        <div className="glass-card" style={{ padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)" }}>
                  Monthly P&L
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  Month-by-month consolidated trading performance
                </div>
              </div>
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)",
                textTransform: "uppercase"
              }}>
                Monthly
              </span>
            </div>

            {stats.monthly.length === 0 ? (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 30 }}>No trades yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.monthly} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={m => m.slice(5)} />
                  <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} width={45} />
                  <ReferenceLine y={0} stroke="var(--border-subtle)" />
                  <Tooltip contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", borderRadius: 8, fontSize: 12 }} formatter={v => [fmtINR(v), "P&L"]} />
                  <Bar dataKey="pnl" radius={[4, 4, 4, 4]}>
                    {stats.monthly.map((m, i) => (
                      <Cell key={i} fill={m.pnl >= 0 ? "var(--color-win)" : "var(--color-loss)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Win/Loss Distribution and Execution Quality */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* Win / Loss Donut */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)", marginBottom: 12 }}>
            Win / Loss Distribution
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, height: 180 }}>
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={[{ name: "Wins", value: stats.winCount }, { name: "Losses", value: stats.lossCount }]} dataKey="value" innerRadius={36} outerRadius={54} startAngle={90} endAngle={-270}>
                  <Cell fill="var(--color-win)" />
                  <Cell fill="var(--color-loss)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="mono" style={{ fontSize: 13, flex: 1 }}>
              <div style={{ color: "var(--color-win-text)", marginBottom: 6, fontWeight: 600 }}>{stats.winCount} Wins</div>
              <div style={{ color: "var(--color-loss-text)", marginBottom: 6, fontWeight: 600 }}>{stats.lossCount} Losses</div>
              <div style={{ color: "var(--text-main)", fontWeight: 700 }}>{stats.winRate.toFixed(1)}% Win Rate</div>
            </div>
          </div>
        </div>

        {/* Performance Statistics */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)", marginBottom: 12 }}>
            Execution Quality
          </div>
          <MetricRow label="Profitable Days Consistency" value={`${stats.consistency.toFixed(0)}%`} />
          <MetricRow label="Average Win" value={fmtINR(stats.avgWin)} color="var(--color-win-text)" />
          <MetricRow label="Average Loss" value={fmtINR(stats.avgLoss)} color="var(--color-loss-text)" />
          <MetricRow label="Profit Factor" value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)} color="var(--color-gold)" />
          <MetricRow label="Trading Capital XIRR" value={fmtPct(stats.tradingXIRR)} color={stats.tradingXIRR >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)"} />
        </div>
      </div>

      {/* Row 4: Strategy Performance */}
      <div className="glass-card" style={{ padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)", marginBottom: 14 }}>
          Strategy Breakdown
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {stats.strategyPerf.map((s, i) => {
            const maxAbs = Math.max(1, ...stats.strategyPerf.map(x => Math.abs(x.net)));
            const barPct = (Math.abs(s.net) / maxAbs) * 100;
            return (
              <div key={s.strategy}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                    {i === 0 && s.net > 0 && <span style={{ color: "var(--color-gold)", marginRight: 6 }}>★</span>}
                    {s.strategy}
                  </span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {s.count} trades · {s.winRate.toFixed(0)}% win rate
                  </span>
                  <span className="mono" style={{ fontWeight: 700, color: s.net >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                    {fmtSigned(s.net)}
                  </span>
                </div>
                <div style={{ height: 6, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    width: `${barPct}%`, height: "100%",
                    background: s.net >= 0 ? "var(--color-win)" : "var(--color-loss)",
                    borderRadius: 3
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Trade Log Tab Component with Mobile Card Support
function TradesTab({ trades, totalTrades, search, setSearch, indexFilter, setIndexFilter, openNewTradeForm, startEditTrade, deleteTrade, setShowWithdrawForm }) {
  return (
    <div>
      {/* Controls bar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        {/* Search & Index Filter */}
        <div style={{ display: "flex", flex: 1, minWidth: 260, maxWidth: 480, gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              placeholder="Search trades, index, notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, minHeight: 38, fontSize: 13 }}
            />
          </div>
          <select
            value={indexFilter}
            onChange={e => setIndexFilter(e.target.value)}
            style={{ width: 110, minHeight: 38, fontSize: 13 }}
          >
            {INDEX_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowWithdrawForm(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "var(--color-loss-soft)", border: "1px solid var(--color-loss-border)",
              color: "var(--color-loss-text)", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}
          >
            <ArrowDownToLine size={14} />
            <span className="desktop-only">Log Withdrawal</span>
          </button>
          <button
            onClick={openNewTradeForm}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              border: "none", color: "#0F172A",
              borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Log Trade</span>
          </button>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="glass-card" style={{ padding: 50, textAlign: "center", color: "var(--text-muted)" }}>
          No trades found matching your filters.
        </div>
      ) : (
        <>
          {/* Mobile View: High-End Trade Cards */}
          <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {trades.map(t => {
              const net = (Number(t.gross) || 0) - (Number(t.charges) || 0);
              const checked = RULE_DEFS.filter(r => t.rules?.[r.key]).length;
              return (
                <div key={t.id} className="glass-card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtDate(t.date)}</span>
                      <span style={{
                        background: "var(--bg-elevated)", padding: "2px 8px", borderRadius: 6,
                        fontSize: 11, fontWeight: 700, color: "var(--color-gold)"
                      }}>{t.index}</span>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.strategy}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => startEditTrade(t)} style={{ background: "none", border: "none", color: "var(--text-muted)", padding: 4 }}><Pencil size={14} /></button>
                      <button onClick={() => deleteTrade(t.id)} style={{ background: "none", border: "none", color: "var(--color-loss-text)", padding: 4 }}><Trash2 size={14} /></button>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: net >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                      {fmtSigned(net)}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Gross: {fmtSigned(t.gross)} · Charges: {fmtINR(t.charges)}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border-subtle)", fontSize: 11.5 }}>
                    <span style={{ color: checked === 4 ? "var(--color-win-text)" : "var(--color-gold)", fontWeight: 600 }}>
                      Discipline: {checked}/4 passed
                    </span>
                    {t.notes && <span style={{ color: "var(--text-muted)", fontStyle: "italic", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.notes}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View: Clean Financial Table */}
          <div className="desktop-only glass-card" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", textAlign: "left" }}>
                  {["Date", "Index", "Strategy", "Bias", "Gross P&L", "Charges", "Net P&L", "Discipline", "Notes", ""].map(h => (
                    <th key={h} style={{ padding: "12px 14px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map(t => {
                  const net = (Number(t.gross) || 0) - (Number(t.charges) || 0);
                  const checked = RULE_DEFS.filter(r => t.rules?.[r.key]).length;
                  return (
                    <tr key={t.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <td className="mono" style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>{fmtDate(t.date)}</td>
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--text-main)" }}>{t.index}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text-secondary)" }}>{t.strategy}</td>
                      <td style={{ padding: "11px 14px", color: t.bias === "Bullish" ? "var(--color-win-text)" : t.bias === "Bearish" ? "var(--color-loss-text)" : "var(--text-muted)" }}>{t.bias || "—"}</td>
                      <td className="mono" style={{ padding: "11px 14px" }}>{fmtSigned(t.gross)}</td>
                      <td className="mono" style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{fmtINR(t.charges)}</td>
                      <td className="mono" style={{ padding: "11px 14px", fontWeight: 700, color: net >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>{fmtSigned(net)}</td>
                      <td style={{ padding: "11px 14px", fontWeight: 600, color: checked === 4 ? "var(--color-win-text)" : "var(--color-gold)" }}>{checked}/4</td>
                      <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.notes || "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => startEditTrade(t)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }} title="Edit"><Pencil size={14} /></button>
                          <button onClick={() => deleteTrade(t.id)} style={{ background: "none", border: "none", color: "var(--color-loss-text)", cursor: "pointer" }} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// Capital & Ledger Tab Component (Strictly Cash Movements: Deposits & Withdrawals)
function CapitalTab({
  startingCapital,
  setStartingCapital,
  ledger,
  stats,
  openNewDepositModal,
  openNewWithdrawModal,
  startEditLedger,
  deleteLedger,
}) {
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 1. Top Capital Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        <div className="glass-card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
            Starting Capital
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-muted)" }}>₹</span>
            <input
              type="number"
              className="mono"
              value={startingCapital}
              onChange={e => setStartingCapital(Number(e.target.value) || 0)}
              style={{
                fontSize: 19,
                fontWeight: 700,
                background: "transparent",
                border: "none",
                borderBottom: "1.5px dashed var(--border-subtle)",
                color: "var(--text-main)",
                width: "100%",
                outline: "none",
                padding: "2px 0",
              }}
              title="Click to edit initial account capital"
            />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Base trading balance
          </div>
        </div>

        <MetricSummaryCard
          label="Total Deposits (Added)"
          value={fmtINR(stats.deposits)}
          icon={<ArrowDownLeft size={16} />}
          customColor="var(--color-win-text)"
        />

        <MetricSummaryCard
          label="Total Withdrawals (Out)"
          value={fmtINR(stats.withdrawals)}
          icon={<ArrowUpRight size={16} />}
          customColor="var(--color-loss-text)"
        />

        <MetricSummaryCard
          label="Net Capital Movement"
          value={fmtSigned(stats.netCapitalAdded)}
          icon={<Target size={16} />}
          customColor={stats.netCapitalAdded >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)"}
        />

        <MetricSummaryCard
          label="Current Trading Capital"
          value={fmtINR(stats.currentCapital)}
          icon={<Briefcase size={16} />}
          customColor="var(--color-gold)"
        />
      </div>

      {/* 2. Header Bar with Pure Action Buttons */}
      <div
        className="glass-card"
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
            Trading Capital Ledger ({ledger.length})
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
            Dedicated cash ledger tracking capital injections and account withdrawals
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={openNewDepositModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.25)",
            }}
          >
            <ArrowDownLeft size={16} strokeWidth={2.5} />
            + Add Capital (Deposit)
          </button>

          <button
            onClick={openNewWithdrawModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(239, 68, 68, 0.25)",
            }}
          >
            <ArrowUpRight size={16} strokeWidth={2.5} />
            - Withdraw Capital
          </button>
        </div>
      </div>

      {/* 3. Mobile View: Ledger Cards */}
      <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ledger.length === 0 ? (
          <div className="glass-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
            No capital movements recorded yet.
          </div>
        ) : (
          [...ledger].reverse().map(l => {
            const isDeposit = l.type === "Deposit";
            const amountSign = isDeposit ? "+" : "-";
            const amountColor = isDeposit ? "var(--color-win-text)" : "var(--color-loss-text)";
            const badgeBg = isDeposit ? "var(--color-win-soft)" : "var(--color-loss-soft)";
            const badgeBorder = isDeposit ? "var(--color-win-border)" : "var(--color-loss-border)";
            const badgeColor = isDeposit ? "var(--color-win-text)" : "var(--color-loss-text)";

            return (
              <div key={l.id} className="glass-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtDate(l.date)}</span>
                    <span style={{
                      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor
                    }}>
                      {isDeposit ? "Deposit" : "Withdrawal"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => startEditLedger(l)} style={{ background: "none", border: "none", color: "var(--text-muted)", padding: 4, cursor: "pointer" }}><Pencil size={14} /></button>
                    {deleteConfirmId === l.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => { deleteLedger(l.id); setDeleteConfirmId(null); }}
                          style={{ background: "var(--color-loss)", color: "#fff", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          style={{ background: "transparent", border: "none", color: "var(--text-muted)", padding: "2px 4px", cursor: "pointer" }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(l.id)} style={{ background: "none", border: "none", color: "var(--color-loss-text)", padding: 4, cursor: "pointer" }}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: amountColor }}>
                    {amountSign}{fmtINR(l.amount)}
                  </div>
                </div>

                {l.note && (
                  <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 6, borderTop: "1px solid var(--border-subtle)", paddingTop: 6 }}>
                    {l.note}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Desktop View: Pure Cash Ledger Table */}
      <div className="desktop-only glass-card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", textAlign: "left" }}>
              {["Date", "Movement Type", "Amount", "Note / Purpose", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>
                  No capital movements recorded yet. Click "+ Add Capital" or "- Withdraw Capital" above to begin.
                </td>
              </tr>
            ) : (
              [...ledger].reverse().map(l => {
                const isDeposit = l.type === "Deposit";
                const amountSign = isDeposit ? "+" : "-";
                const amountColor = isDeposit ? "var(--color-win-text)" : "var(--color-loss-text)";
                const badgeBg = isDeposit ? "var(--color-win-soft)" : "var(--color-loss-soft)";
                const badgeBorder = isDeposit ? "var(--color-win-border)" : "var(--color-loss-border)";
                const badgeColor = isDeposit ? "var(--color-win-text)" : "var(--color-loss-text)";

                return (
                  <tr key={l.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <td className="mono" style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{fmtDate(l.date)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor
                      }}>
                        {isDeposit ? "Deposit (Add Capital)" : "Withdrawal (Capital Out)"}
                      </span>
                    </td>
                    <td className="mono" style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14, color: amountColor, whiteSpace: "nowrap" }}>
                      {amountSign}{fmtINR(l.amount)}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-main)" }}>
                      {l.note || <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button
                          onClick={() => startEditLedger(l)}
                          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
                          title="Edit Capital Entry"
                        >
                          <Pencil size={14} />
                        </button>
                        {deleteConfirmId === l.id ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button
                              onClick={() => { deleteLedger(l.id); setDeleteConfirmId(null); }}
                              style={{ background: "var(--color-loss)", color: "#fff", border: "none", borderRadius: 4, padding: "3px 7px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              style={{ background: "transparent", border: "none", color: "var(--text-muted)", padding: 4, cursor: "pointer" }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(l.id)}
                            style={{ background: "none", border: "none", color: "var(--color-loss-text)", cursor: "pointer", padding: 4 }}
                            title="Delete Entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inline input for editable holding metrics (with debounced / blur save and visual feedback)
function InlineHoldingInput({ initialValue, onSave, prefix, placeholder, min, step, width = 65, title }) {
  const [val, setVal] = useState(initialValue != null ? String(initialValue) : "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setVal(initialValue != null ? String(initialValue) : "");
  }, [initialValue]);

  const commitSave = (newVal) => {
    const trimmed = String(newVal).trim();
    if (trimmed !== String(initialValue ?? "").trim()) {
      onSave(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, position: "relative" }}>
      {prefix && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{prefix}</span>}
      <input
        type="number"
        min={min}
        step={step}
        placeholder={placeholder}
        value={val}
        title={title}
        onChange={e => setVal(e.target.value)}
        onBlur={e => commitSave(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        style={{
          width,
          padding: "3px 6px",
          fontSize: 13,
          minHeight: 28,
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          color: "var(--text-main)",
          background: "var(--bg-elevated)",
          border: `1px solid ${saved ? "var(--color-win-border)" : "var(--border-subtle)"}`,
          borderRadius: 6,
          textAlign: "right",
          outline: "none",
          transition: "border-color 0.2s",
        }}
      />
      {saved && (
        <span style={{ fontSize: 11, color: "var(--color-win-text)", fontWeight: 700, marginLeft: 2 }} title="Saved to cloud!">
          ✓
        </span>
      )}
    </div>
  );
}

// Equity Investments Tab Component with Multi-Part Accumulation, Absolute Cost & Live XIRR
function InvestmentsTab({
  holdings,
  stats,
  openNewHoldingForm,
  startEditHolding,
  deleteHolding,
  updateHoldingField,
  openQuickPartModal,
  deleteHoldingTranche,
  fetchHoldingLiveCMP,
  fetchAllLiveCMPs,
  fetchingQuotes,
  quoteFetchStatus,
}) {
  const [search, setSearch] = useState("");
  const [capFilter, setCapFilter] = useState("ALL");
  const [valFilter, setValFilter] = useState("ALL");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [fetchingId, setFetchingId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFetchOne = async (id) => {
    setFetchingId(id);
    await fetchHoldingLiveCMP(id);
    setFetchingId(null);
  };

  const totalInvested = stats?.holdingsInvested || 0;
  const totalCurVal = stats?.holdingsCurrentValue || 0;
  const totalUnrealized = stats?.holdingsUnrealized || 0;
  const totalReturnPct = stats?.holdingsReturnPct || 0;
  const portfolioXIRR = stats?.equityXIRR ?? null;

  // Filtered holdings
  const filteredHoldings = useMemo(() => {
    return holdings.filter(h => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        (h.stock && h.stock.toLowerCase().includes(q)) ||
        (h.companyName && h.companyName.toLowerCase().includes(q)) ||
        (h.investmentNote && h.investmentNote.toLowerCase().includes(q));

      const matchesCap = capFilter === "ALL" || h.companySize === capFilter;
      const matchesVal = valFilter === "ALL" || h.valuationView === valFilter;
      return matchesSearch && matchesCap && matchesVal;
    });
  }, [holdings, search, capFilter, valFilter]);

  // Market cap allocation
  const capAllocation = useMemo(() => {
    if (totalInvested <= 0) return { large: 0, mid: 0, small: 0, other: 0 };
    let large = 0, mid = 0, small = 0, other = 0;
    holdings.forEach(h => {
      const m = getHoldingMetrics(h);
      const cost = m.totalInvested;
      const cap = h.companySize || "Large cap";
      if (cap.toLowerCase().includes("large")) large += cost;
      else if (cap.toLowerCase().includes("mid")) mid += cost;
      else if (cap.toLowerCase().includes("small")) small += cost;
      else other += cost;
    });
    return {
      large: Math.round((large / totalInvested) * 100),
      mid: Math.round((mid / totalInvested) * 100),
      small: Math.round((small / totalInvested) * 100),
      other: Math.round((other / totalInvested) * 100),
    };
  }, [holdings, totalInvested]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 1. Top Portfolio Metric Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <MetricSummaryCard
          label="Total Absolute Invested"
          value={fmtINR(totalInvested)}
          icon={<Briefcase size={16} />}
          customColor="var(--color-gold)"
        />
        <MetricSummaryCard
          label="Current Portfolio Value"
          value={fmtINR(totalCurVal)}
          icon={<Wallet size={16} />}
        />
        <MetricSummaryCard
          label="Total Unrealized P&L"
          value={fmtSigned(totalUnrealized)}
          isPnl
          val={totalUnrealized}
          icon={totalUnrealized >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        />
        <MetricSummaryCard
          label="Portfolio Equity XIRR %"
          value={portfolioXIRR !== null ? `${fmtPct(portfolioXIRR)} p.a.` : "—"}
          isPnl
          val={portfolioXIRR}
          icon={<Percent size={16} />}
          customColor={portfolioXIRR >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)"}
        />
        <MetricSummaryCard
          label="Active Holdings & Parts"
          value={`${holdings.length} stocks · ${stats.totalTranchesCount || holdings.length} parts`}
          icon={<Layers size={16} />}
        />
      </div>

      {/* 2. Executive Overview & Allocation Banner */}
      <div
        className="glass-card"
        style={{
          padding: "18px 22px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>
                Equity Portfolio Strategy & Multi-Part Accumulation
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-gold)",
                  background: "var(--color-gold-soft)",
                  border: "1px solid var(--color-gold-border)",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                100% FUNDED BY PROFITS
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 680 }}>
              Independent equity portfolio tracking multi-part accumulations on separate dates. Holding-level <strong>XIRR %</strong> tracks exact money-weighted compounding across all purchase dates up to today's live market value.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ textAlign: "right", marginRight: 6 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Overall Return</div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-mono)", color: totalUnrealized >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                {fmtPct(totalReturnPct)}
              </div>
            </div>
            <button
              onClick={fetchAllLiveCMPs}
              disabled={fetchingQuotes}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(229, 184, 105, 0.12)",
                color: "var(--color-gold)",
                border: "1px solid var(--color-gold-border)",
                borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700,
                cursor: fetchingQuotes ? "wait" : "pointer",
                whiteSpace: "nowrap"
              }}
              title="Automatically fetch real-time market prices for all portfolio holdings"
            >
              <RefreshCw size={14} className={fetchingQuotes ? "spin" : ""} />
              {fetchingQuotes ? "Fetching..." : "⚡ Live CMPs"}
            </button>
            <button
              onClick={openNewHoldingForm}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                color: "#0F172A", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 2px 10px rgba(245, 158, 11, 0.3)",
                whiteSpace: "nowrap"
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              Add Stock Investment
            </button>
          </div>
          {quoteFetchStatus && (
            <div style={{ width: "100%", fontSize: 12, color: "var(--color-win-text)", fontWeight: 600, textAlign: "right" }}>
              {quoteFetchStatus}
            </div>
          )}
        </div>

        {/* Market Cap Allocation Bar */}
        {totalInvested > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-secondary)", marginBottom: 6 }}>
              <span>Market Cap Allocation: Large Cap ({capAllocation.large}%) · Mid Cap ({capAllocation.mid}%) · Small Cap ({capAllocation.small}%)</span>
              <span className="mono" style={{ color: "var(--color-gold)", fontWeight: 600 }}>{holdings.length} Active Positions</span>
            </div>
            <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "var(--bg-elevated)" }}>
              <div style={{ width: `${capAllocation.large}%`, background: "var(--color-gold)" }} title={`Large Cap: ${capAllocation.large}%`} />
              <div style={{ width: `${capAllocation.mid}%`, background: "var(--color-win-text)" }} title={`Mid Cap: ${capAllocation.mid}%`} />
              <div style={{ width: `${capAllocation.small}%`, background: "#818CF8" }} title={`Small Cap: ${capAllocation.small}%`} />
              <div style={{ width: `${capAllocation.other}%`, background: "var(--text-muted)" }} title={`Other: ${capAllocation.other}%`} />
            </div>
          </div>
        )}
      </div>

      {/* 3. Search & Filter Bar */}
      <div
        className="glass-card"
        style={{
          padding: "12px 16px",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 240px", minWidth: 200, background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "0 10px" }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search symbol, company name, or investment thesis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              padding: "8px 0",
              fontSize: 13,
              color: "var(--text-main)",
              outline: "none",
              minHeight: 36,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Market Cap:</span>
          <select
            value={capFilter}
            onChange={(e) => setCapFilter(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, minHeight: 36, width: "auto" }}
          >
            <option value="ALL">All Market Caps</option>
            <option value="Large cap">Large cap</option>
            <option value="Mid cap">Mid cap</option>
            <option value="Small cap">Small cap</option>
            <option value="Micro cap">Micro cap</option>
          </select>

          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>Valuation:</span>
          <select
            value={valFilter}
            onChange={(e) => setValFilter(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, minHeight: 36, width: "auto" }}
          >
            <option value="ALL">All Valuations</option>
            <option value="Undervalued">Undervalued</option>
            <option value="Fair">Fair</option>
            <option value="Overvalued">Overvalued</option>
            <option value="Needs review">Needs review</option>
          </select>

          {(search || capFilter !== "ALL" || valFilter !== "ALL") && (
            <button
              onClick={() => { setSearch(""); setCapFilter("ALL"); setValFilter("ALL"); }}
              style={{
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Mobile View: Descriptive Holding Cards */}
      <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredHoldings.length === 0 ? (
          <div className="glass-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
            No equity investments match your filter criteria.
          </div>
        ) : (
          filteredHoldings.map(h => {
            const m = getHoldingMetrics(h);
            const isExpanded = expandedIds.has(h.id);
            const daysHeld = h.date ? Math.max(0, Math.round((new Date() - new Date(h.date)) / (1000 * 60 * 60 * 24))) : 0;

            return (
              <div key={h.id} className="glass-card" style={{ padding: 16 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontSize: 16.5, fontWeight: 700, color: "var(--color-gold)" }}>{h.stock}</span>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--bg-elevated)", color: "var(--color-gold)", fontWeight: 700 }}>
                        {h.exchange || "NSE"}
                      </span>
                      {h.valuationView && (
                        <span style={{
                          fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                          background: h.valuationView === "Undervalued" ? "var(--color-win-soft)" : h.valuationView === "Overvalued" ? "var(--color-loss-soft)" : "rgba(245, 158, 11, 0.12)",
                          color: h.valuationView === "Undervalued" ? "var(--color-win-text)" : h.valuationView === "Overvalued" ? "var(--color-loss-text)" : "var(--color-gold)",
                          border: `1px solid ${h.valuationView === "Undervalued" ? "var(--color-win-border)" : h.valuationView === "Overvalued" ? "var(--color-loss-border)" : "var(--color-gold-border)"}`,
                        }}>
                          {h.valuationView}
                        </span>
                      )}
                    </div>
                    {h.companyName && h.companyName !== h.stock && (
                      <div style={{ fontSize: 13, color: "var(--text-main)", fontWeight: 600, marginTop: 3 }}>
                        {h.companyName}
                      </div>
                    )}
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      Purchased {fmtDate(h.date)} · {daysHeld}d held · {m.tranches.length} {m.tranches.length === 1 ? "part" : "parts"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      onClick={() => openQuickPartModal(h.id)}
                      style={{
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "var(--color-win-text)",
                        padding: "5px 9px",
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                      title="Add another accumulation tranche / part"
                    >
                      + Part
                    </button>
                    <button
                      onClick={() => startEditHolding(h)}
                      style={{
                        background: "var(--color-gold-soft)",
                        border: "1px solid var(--color-gold-border)",
                        color: "var(--color-gold)",
                        padding: "5px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                      title="Edit Full Investment Details"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    {deleteConfirmId === h.id ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button
                          onClick={() => {
                            deleteHolding(h.id);
                            setDeleteConfirmId(null);
                          }}
                          style={{
                            background: "var(--color-loss)",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 6,
                            padding: "5px 8px",
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            padding: 4,
                            cursor: "pointer"
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(h.id)}
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          color: "var(--color-loss-text)",
                          padding: "5px 7px",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                        title="Delete Position"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "var(--bg-elevated)", padding: 12, borderRadius: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Total Shares</div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)", marginTop: 2 }}>
                      {m.totalQty}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Avg Buy Price</div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)", marginTop: 2 }}>
                      {fmtINR(m.avgBuyPrice)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Absolute Invested</div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: "var(--color-gold)", marginTop: 2 }}>
                      {fmtINR(m.totalInvested)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Current Value</div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginTop: 2 }}>
                      {fmtINR(m.currentValue)}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2", paddingTop: 4, borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Unrealized P&L</span>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 13.5, color: m.pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                      {fmtSigned(m.pnl)} ({fmtPct(m.returnPct)})
                    </span>
                  </div>
                </div>

                {/* CMP Quick Updater + Holding XIRR Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(229, 184, 105, 0.05)", borderRadius: 10, border: "1px solid var(--border-subtle)", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 180px" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Live CMP:</span>
                    <InlineHoldingInput
                      initialValue={h.currentPrice !== "" && h.currentPrice != null ? h.currentPrice : m.avgBuyPrice}
                      onSave={val => updateHoldingField(h.id, "currentPrice", val)}
                      prefix="₹"
                      step="0.05"
                      width={85}
                      placeholder={String(m.avgBuyPrice)}
                      title="Edit CMP directly (auto-saves)"
                    />
                    <button
                      onClick={() => handleFetchOne(h.id)}
                      disabled={fetchingId === h.id}
                      style={{
                        background: "rgba(229, 184, 105, 0.15)",
                        border: "1px solid var(--color-gold-border)",
                        color: "var(--color-gold)",
                        borderRadius: 6,
                        padding: "5px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: fetchingId === h.id ? "wait" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        whiteSpace: "nowrap",
                      }}
                      title="Fetch live market price"
                    >
                      ⚡ {fetchingId === h.id ? "..." : "Live"}
                    </button>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Holding XIRR</div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: (m.holdingXIRR || 0) >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)",
                      }}
                    >
                      {m.holdingXIRR !== null ? `${fmtPct(m.holdingXIRR)} p.a.` : "—"}
                    </div>
                  </div>
                </div>

                {/* Purchase Parts Toggle & Drawer */}
                <div style={{ marginBottom: 10 }}>
                  <button
                    onClick={() => toggleExpand(h.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--color-gold)",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? "Hide Purchase Parts" : `View ${m.tranches.length} Purchase ${m.tranches.length === 1 ? "Part" : "Parts"}`}
                  </button>

                  {isExpanded && (
                    <div style={{ marginTop: 8, background: "var(--bg-elevated)", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                          Accumulation Breakdown
                        </span>
                        <button
                          onClick={() => openQuickPartModal(h.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-win-text)",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          + Add Part
                        </button>
                      </div>

                      {m.tranches.map((t, idx) => (
                        <div key={t.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, padding: "4px 0", borderBottom: "1px dashed var(--border-subtle)" }}>
                          <div>
                            <span style={{ fontWeight: 700, color: "var(--text-main)", marginRight: 6 }}>Part {idx + 1}:</span>
                            <span className="mono" style={{ color: "var(--text-secondary)" }}>{fmtDate(t.date)}</span>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {t.qty} shares @ ₹{t.buyPrice} {t.note ? `· ${t.note}` : ""}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="mono" style={{ fontWeight: 700, color: "var(--text-main)" }}>
                              {fmtINR((Number(t.qty) || 0) * (Number(t.buyPrice) || 0))}
                            </span>
                            {m.tranches.length > 1 && (
                              <button
                                onClick={() => deleteHoldingTranche(h.id, t.id)}
                                style={{ background: "none", border: "none", color: "var(--color-loss-text)", cursor: "pointer", padding: 2 }}
                                title="Delete this part"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Investment Thesis Note */}
                {h.investmentNote && (
                  <div style={{ background: "var(--bg-elevated)", padding: "10px 12px", borderRadius: 8, borderLeft: "3px solid var(--color-gold)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-gold)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                      Investment Thesis & Notes {h.newsDate ? `(${fmtDate(h.newsDate)})` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-main)", lineHeight: 1.5, fontStyle: "italic" }}>
                      "{h.investmentNote}"
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Desktop View: Comprehensive Descriptive Holdings Table with Multi-Part Accumulation */}
      <div className="desktop-only glass-card" style={{ overflowX: "auto", border: "1px solid var(--border-card)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", textAlign: "left" }}>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Stock & Company</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Valuation</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Accumulation</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Total Shares</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Avg Buy Price</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", color: "var(--color-gold)" }}>Absolute Invested</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Live Price (CMP)</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Current Value</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Unrealized P&L</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Return %</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", color: "var(--color-gold)" }}>Holding XIRR</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHoldings.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>
                  No equity investments match your filter criteria. Click "+ Add Stock Investment" above to record one.
                </td>
              </tr>
            ) : (
              filteredHoldings.map(h => {
                const m = getHoldingMetrics(h);
                const isExpanded = expandedIds.has(h.id);
                const daysHeld = h.date ? Math.max(0, Math.round((new Date() - new Date(h.date)) / (1000 * 60 * 60 * 24))) : 0;

                return (
                  <React.Fragment key={h.id}>
                    <tr style={{ borderTop: "1px solid var(--border-subtle)", background: isExpanded ? "rgba(229, 184, 105, 0.03)" : "transparent" }}>
                      {/* Stock & Company */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <button
                            onClick={() => toggleExpand(h.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: isExpanded ? "var(--color-gold)" : "var(--text-muted)",
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                            }}
                            title={isExpanded ? "Collapse parts breakdown" : "Expand parts breakdown"}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <span className="mono" style={{ fontWeight: 700, fontSize: 14, color: "var(--color-gold)" }}>{h.stock}</span>
                          <span style={{
                            padding: "2px 5px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: "var(--bg-elevated)", color: "var(--color-gold)"
                          }}>{h.exchange || "NSE"}</span>
                        </div>
                        {h.companyName && h.companyName !== h.stock && (
                          <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2, paddingLeft: 22, maxWidth: 170, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {h.companyName}
                          </div>
                        )}
                      </td>

                      {/* Valuation View */}
                      <td style={{ padding: "12px 14px" }}>
                        {h.valuationView ? (
                          <span style={{
                            padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: h.valuationView === "Undervalued" ? "var(--color-win-soft)" : h.valuationView === "Overvalued" ? "var(--color-loss-soft)" : "rgba(245, 158, 11, 0.12)",
                            color: h.valuationView === "Undervalued" ? "var(--color-win-text)" : h.valuationView === "Overvalued" ? "var(--color-loss-text)" : "var(--color-gold)",
                            border: `1px solid ${h.valuationView === "Undervalued" ? "var(--color-win-border)" : h.valuationView === "Overvalued" ? "var(--color-loss-border)" : "var(--color-gold-border)"}`,
                          }}>
                            {h.valuationView}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                        )}
                      </td>

                      {/* Accumulation Tranches Badge */}
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          onClick={() => toggleExpand(h.id)}
                          style={{
                            background: isExpanded ? "var(--color-gold-soft)" : "var(--bg-elevated)",
                            border: `1px solid ${isExpanded ? "var(--color-gold-border)" : "var(--border-subtle)"}`,
                            color: isExpanded ? "var(--color-gold)" : "var(--text-main)",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          title="Click to view all purchase dates and quantities"
                        >
                          <Layers size={12} />
                          {m.tranches.length} {m.tranches.length === 1 ? "Part" : "Parts"}
                        </button>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 3 }}>
                          {daysHeld}d held
                        </div>
                      </td>

                      {/* Total Shares */}
                      <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>
                        {m.totalQty}
                      </td>

                      {/* Weighted Avg Buy Price */}
                      <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>
                        {fmtINR(m.avgBuyPrice)}
                      </td>

                      {/* Total Absolute Invested */}
                      <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "var(--color-gold)" }}>
                        {fmtINR(m.totalInvested)}
                      </td>

                      {/* Live CMP with Direct Inline Editor and Live Refresh */}
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <InlineHoldingInput
                            initialValue={h.currentPrice !== "" && h.currentPrice != null ? h.currentPrice : m.avgBuyPrice}
                            onSave={val => updateHoldingField(h.id, "currentPrice", val)}
                            prefix="₹"
                            step="0.05"
                            width={75}
                            placeholder={String(m.avgBuyPrice)}
                            title="Edit CMP directly (auto-saves)"
                          />
                          <button
                            onClick={() => handleFetchOne(h.id)}
                            disabled={fetchingId === h.id}
                            style={{
                              background: "rgba(229, 184, 105, 0.15)",
                              border: "1px solid var(--color-gold-border)",
                              color: "var(--color-gold)",
                              borderRadius: 4,
                              padding: "3px 6px",
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: fetchingId === h.id ? "wait" : "pointer",
                              whiteSpace: "nowrap"
                            }}
                            title="Fetch real-time market price"
                          >
                            ⚡ {fetchingId === h.id ? "..." : "Live"}
                          </button>
                        </div>
                        {h.priceUpdatedOn && (
                          <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2 }}>
                            {fmtDate(h.priceUpdatedOn)}
                          </div>
                        )}
                      </td>

                      {/* Current Value */}
                      <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                        {fmtINR(m.currentValue)}
                      </td>

                      {/* Unrealized P&L */}
                      <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: m.pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                        {fmtSigned(m.pnl)}
                      </td>

                      {/* Return % */}
                      <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: m.pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                        {fmtPct(m.returnPct)}
                      </td>

                      {/* Holding XIRR % */}
                      <td className="mono" style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontWeight: 700,
                            fontSize: 12,
                            background: (m.holdingXIRR || 0) >= 0 ? "var(--color-win-soft)" : "var(--color-loss-soft)",
                            color: (m.holdingXIRR || 0) >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)",
                            border: `1px solid ${(m.holdingXIRR || 0) >= 0 ? "var(--color-win-border)" : "var(--color-loss-border)"}`,
                          }}
                        >
                          {m.holdingXIRR !== null ? `${fmtPct(m.holdingXIRR)}` : "—"}
                        </div>
                        <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2 }}>p.a.</div>
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <button
                            onClick={() => openQuickPartModal(h.id)}
                            style={{
                              background: "rgba(16, 185, 129, 0.12)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              color: "var(--color-win-text)",
                              padding: "4px 8px",
                              borderRadius: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title="Add another accumulation purchase part"
                          >
                            + Part
                          </button>
                          <button
                            onClick={() => startEditHolding(h)}
                            style={{
                              background: "var(--color-gold-soft)",
                              border: "1px solid var(--color-gold-border)",
                              color: "var(--color-gold)",
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              borderRadius: 5,
                              cursor: "pointer",
                            }}
                            title="Edit Full Investment Details"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                          {deleteConfirmId === h.id ? (
                            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                              <button
                                onClick={() => {
                                  deleteHolding(h.id);
                                  setDeleteConfirmId(null);
                                }}
                                style={{
                                  background: "var(--color-loss)",
                                  color: "#FFFFFF",
                                  border: "none",
                                  borderRadius: 4,
                                  padding: "3px 6px",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--text-muted)",
                                  padding: "2px",
                                  cursor: "pointer"
                                }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(h.id)}
                              style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.25)",
                                color: "var(--color-loss-text)",
                                padding: "4px 6px",
                                borderRadius: 5,
                                cursor: "pointer",
                              }}
                              title="Delete Entire Position"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Multi-Part Breakdown Drawer */}
                    {isExpanded && (
                      <tr style={{ background: "rgba(229, 184, 105, 0.03)" }}>
                        <td colSpan={12} style={{ padding: "12px 20px 16px 36px", borderTop: "1px dashed var(--border-subtle)" }}>
                          <div style={{ background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border-subtle)", padding: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-gold)" }}>
                                  Accumulation Tranches for {h.stock} ({m.tranches.length} {m.tranches.length === 1 ? "purchase" : "purchases"})
                                </span>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                  Each part has its own purchase date, shares &amp; cost contributing to holding XIRR
                                </span>
                              </div>
                              <button
                                onClick={() => openQuickPartModal(h.id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: "rgba(16, 185, 129, 0.15)",
                                  border: "1px solid rgba(16, 185, 129, 0.35)",
                                  color: "var(--color-win-text)",
                                  borderRadius: 6,
                                  padding: "5px 12px",
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                <Plus size={13} /> Add Accumulation Part
                              </button>
                            </div>

                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ color: "var(--text-muted)", textAlign: "left", borderBottom: "1px solid var(--border-subtle)" }}>
                                  <th style={{ padding: "6px 10px", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase" }}>Part #</th>
                                  <th style={{ padding: "6px 10px", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase" }}>Purchase Date</th>
                                  <th style={{ padding: "6px 10px", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", textAlign: "right" }}>Shares (Qty)</th>
                                  <th style={{ padding: "6px 10px", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", textAlign: "right" }}>Buy Price</th>
                                  <th style={{ padding: "6px 10px", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", textAlign: "right" }}>Capital Invested</th>
                                  <th style={{ padding: "6px 10px", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase" }}>Notes</th>
                                  <th style={{ padding: "6px 10px", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", textAlign: "center" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {m.tranches.map((t, idx) => {
                                  const tCost = (Number(t.qty) || 0) * (Number(t.buyPrice) || 0);
                                  return (
                                    <tr key={t.id || idx} style={{ borderBottom: "1px dashed var(--border-subtle)" }}>
                                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-main)" }}>
                                        Part {idx + 1}
                                      </td>
                                      <td className="mono" style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>
                                        {fmtDate(t.date)}
                                      </td>
                                      <td className="mono" style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>
                                        {t.qty}
                                      </td>
                                      <td className="mono" style={{ padding: "8px 10px", textAlign: "right" }}>
                                        ₹{t.buyPrice}
                                      </td>
                                      <td className="mono" style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "var(--color-gold)" }}>
                                        {fmtINR(tCost)}
                                      </td>
                                      <td style={{ padding: "8px 10px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                                        {t.note || "—"}
                                      </td>
                                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                        {m.tranches.length > 1 ? (
                                          <button
                                            onClick={() => deleteHoldingTranche(h.id, t.id)}
                                            style={{
                                              background: "none",
                                              border: "none",
                                              color: "var(--color-loss-text)",
                                              cursor: "pointer",
                                              padding: 3,
                                            }}
                                            title="Delete this purchase tranche"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        ) : (
                                          <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Primary</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>

                            {h.investmentNote && (
                              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-secondary)", fontStyle: "italic", borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
                                <strong>Thesis Note:</strong> "{h.investmentNote}"
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Discipline Tab Component
function DisciplineTab({ trades, stats }) {
  const perRule = RULE_DEFS.map(r => {
    const total = trades.length;
    const checked = trades.filter(t => t.rules?.[r.key]).length;
    return { ...r, pct: total ? (checked / total) * 100 : 100, checked, total };
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
      <div className="glass-card" style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)", marginBottom: 16 }}>
          Overall Discipline Score
        </div>
        <DisciplineRing value={stats.discipline} />
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)", marginBottom: 18 }}>
          Rule-by-Rule Adherence
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {perRule.map(r => (
            <div key={r.key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "var(--text-main)", fontWeight: 500 }}>{r.label}</span>
                <span className="mono" style={{ color: r.pct >= 80 ? "var(--color-win-text)" : "var(--color-gold)", fontWeight: 700 }}>
                  {r.checked}/{r.total} · {r.pct.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 8, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  width: `${r.pct}%`, height: "100%",
                  background: r.pct >= 80 ? "var(--color-win)" : "var(--color-gold)",
                  borderRadius: 4
                }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 22, paddingTop: 14, borderTop: "1px solid var(--border-subtle)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Discipline is the single most predictive metric of long-term trader profitability. Honoring stops, right-sizing positions, avoiding revenge trades, and trading only the verified plan are tracked with every logged entry.
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)", fontSize: 13 }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="mono" style={{ color: color || "var(--text-main)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function DisciplineRing({ value }) {
  const r = 52, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const strokeColor = pct >= 80 ? "var(--color-win)" : "var(--color-gold)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0" }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={10} />
        <circle
          cx={70} cy={70} r={r} fill="none" stroke={strokeColor} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} transform="rotate(-90 70 70)"
        />
        <text x={70} y={66} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="26" fontWeight="700" fill="var(--text-main)">
          {pct.toFixed(0)}%
        </text>
        <text x={70} y={84} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fill="var(--text-muted)" letterSpacing="0.08em" fontWeight="600">
          RULES FOLLOWED
        </text>
      </svg>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8, textAlign: "center" }}>
        Across stop-loss, position sizing, no-revenge &amp; entry plan
      </div>
    </div>
  );
}
