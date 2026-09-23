import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, Cell, PieChart, Pie, ReferenceLine
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, IndianRupee, Target, ShieldCheck, X, Trash2,
  Wallet, PiggyBank, ArrowDownToLine, Flame, Briefcase, Percent, Download, Pencil,
  Database, RefreshCw, Sun, Moon, Search, Filter, CheckCircle2, ChevronRight
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
  syncAllToSupabase
} from "../services/dashboardService";
import Plan20CrTab from "./Plan20CrTab";
import DailyHabitsTab from "./DailyHabitsTab";
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

const emptyStockDetails = () => ({
  companyName: "",
  stock: "",
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
});

const emptyLedger = () => ({
  id: generateId(),
  date: todayLocalISO(),
  type: "Deposit",
  withdrawalUse: "cash", // "cash" or "stock"
  amount: "",
  note: "",
  stockSymbol: "",
  holdingId: null,
  stockDetails: emptyStockDetails(),
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
  deductFromTradingCapital: true,
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

  // Sync theme to document body
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
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
    const cashWithdrawn = ledger.filter(l => l.type === "Withdrawal" && (l.withdrawalUse === "cash" || !l.withdrawalUse)).reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const movedIntoStocks = ledger.filter(l => l.type === "Investment" || (l.type === "Withdrawal" && l.withdrawalUse === "stock")).reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const totalWithdrawals = cashWithdrawn + movedIntoStocks;

    const holdingsInvested = holdings.reduce((s, h) => s + (Number(h.qty) || 0) * (Number(h.buyPrice) || 0), 0);
    const holdingsCurrentValue = holdings.reduce((s, h) => {
      const cp = h.currentPrice !== "" && h.currentPrice != null ? Number(h.currentPrice) : Number(h.buyPrice) || 0;
      return s + (Number(h.qty) || 0) * cp;
    }, 0);
    const holdingsUnrealized = holdingsCurrentValue - holdingsInvested;
    const totalInvestedOut = Math.max(movedIntoStocks, holdingsInvested);

    const currentCapital = startingCapital + deposits - cashWithdrawn - totalInvestedOut + totalNet;
    const capitalBase = startingCapital + deposits;
    const netCapitalAdded = deposits - cashWithdrawn - movedIntoStocks;
    const overallROI = capitalBase > 0 ? (totalNet / capitalBase) * 100 : 0;

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
    const days = Object.keys(dayMap).sort();
    const curve = [];
    days.forEach(d => {
      running += dayMap[d];
      curve.push({ date: d, equity: Math.round(running), pnl: Math.round(dayMap[d]) });
    });

    let peak = startingCapital, maxDD = 0;
    curve.forEach(pt => {
      if (pt.equity > peak) peak = pt.equity;
      const dd = peak > 0 ? ((peak - pt.equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    });

    const capitalAppreciation = currentCapital - startingCapital;
    const capitalAppreciationPct = startingCapital > 0 ? (capitalAppreciation / startingCapital) * 100 : 0;
    const equityPoints = [startingCapital, ...curve.map(c => c.equity)];
    const minEquityFromStart = Math.min(...equityPoints);
    const downsideFromStart = minEquityFromStart - startingCapital;
    const downsideFromStartPct = startingCapital > 0 ? (downsideFromStart / startingCapital) * 100 : 0;

    const profitWithdrawalDeficit = totalNet - totalWithdrawals;

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

    const allDates = [
      ...trades.map(t => t.date), ...ledger.map(l => l.date), ...holdings.map(h => h.date),
    ].filter(Boolean).sort();
    const firstDate = allDates.length ? new Date(allDates[0]) : new Date();
    const tradingFlows = [{ date: firstDate, amount: -startingCapital }];
    ledger.forEach(l => {
      const amt = Number(l.amount) || 0;
      if (l.type === "Deposit") tradingFlows.push({ date: new Date(l.date), amount: -amt });
      if (l.type === "Withdrawal") tradingFlows.push({ date: new Date(l.date), amount: amt });
      if (l.type === "Investment") tradingFlows.push({ date: new Date(l.date), amount: -amt });
    });
    holdings.forEach(h => {
      tradingFlows.push({ date: new Date(h.date), amount: -((Number(h.qty) || 0) * (Number(h.buyPrice) || 0)) });
    });
    tradingFlows.push({ date: new Date(), amount: currentCapital });
    const tradingXIRR = xirr(tradingFlows);

    const equityFlows = holdings.map(h => ({
      date: new Date(h.date),
      amount: -((Number(h.qty) || 0) * (Number(h.buyPrice) || 0)),
    }));
    if (holdingsCurrentValue > 0) equityFlows.push({ date: new Date(), amount: holdingsCurrentValue });
    const equityXIRR = xirr(equityFlows);

    return {
      totalNet, currentCapital, overallROI, dailyROI, monthlyROI, todayPnl, monthNet,
      winRate, avgWin, avgLoss, profitFactor, discipline, curve, maxDD, consistency, avgDailyPnl, avgDailyROI, streak, streakType,
      monthly, weekly, deposits, withdrawals: totalWithdrawals, cashWithdrawn, movedIntoStocks, netCapitalAdded, capitalBase, tradeCount: trades.length,
      winCount: wins.length, lossCount: losses.length,
      holdingsInvested, holdingsCurrentValue, holdingsUnrealized, equityXIRR, tradingXIRR,
      totalInvestedOut, strategyPerf,
      capitalAppreciation, capitalAppreciationPct, downsideFromStart, downsideFromStartPct, profitWithdrawalDeficit,
    };
  }, [trades, ledger, holdings, startingCapital, tradesSorted]);

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

  // Ledger actions
  // Helper to update stock detail in ledgerDraft
  const updateLedgerStockDetail = (field, val) => {
    setLedgerDraft(prev => {
      const nextStock = { ...(prev.stockDetails || emptyStockDetails()), [field]: val };
      let newAmount = prev.amount;
      if (field === "qty" || field === "buyPrice") {
        const q = field === "qty" ? Number(val) : Number(nextStock.qty);
        const p = field === "buyPrice" ? Number(val) : Number(nextStock.buyPrice);
        if (q > 0 && p > 0) {
          newAmount = String(q * p);
        }
      }
      return {
        ...prev,
        stockDetails: nextStock,
        amount: newAmount,
      };
    });
  };

  // Ledger actions
  const startEditLedger = (l) => {
    let stockDetails = emptyStockDetails();
    const isStock = l.type === "Investment" || l.withdrawalUse === "stock" || Boolean(l.stockSymbol);
    if (isStock) {
      const linked = holdings.find(h => (l.holdingId && h.id === l.holdingId) || (l.stockSymbol && h.stock === l.stockSymbol));
      if (linked) {
        stockDetails = {
          companyName: linked.companyName || linked.stock || "",
          stock: linked.stock || "",
          exchange: linked.exchange || "NSE",
          qty: linked.qty || "",
          buyPrice: linked.buyPrice || "",
          currentPrice: linked.currentPrice || "",
          priceUpdatedOn: linked.priceUpdatedOn || linked.date,
          peRatio: linked.peRatio || "",
          beta: linked.beta || "",
          companySize: linked.companySize || "Large cap",
          valuationView: linked.valuationView || "Needs review",
          dividendDate: linked.dividendDate || "",
          dividendPerShare: linked.dividendPerShare || "",
          investmentNote: linked.investmentNote || "",
          newsDate: linked.newsDate || "",
        };
      } else if (l.stockSymbol) {
        stockDetails.stock = l.stockSymbol;
      }
    }

    setLedgerDraft({
      id: l.id,
      date: l.date,
      type: l.type === "Investment" ? "Withdrawal" : l.type,
      withdrawalUse: l.type === "Investment" ? "stock" : (l.withdrawalUse || "cash"),
      amount: l.amount || "",
      note: l.note || "",
      stockSymbol: l.stockSymbol || "",
      holdingId: l.holdingId || null,
      stockDetails,
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
      const isStockInvestment = ledgerDraft.type === "Withdrawal" && ledgerDraft.withdrawalUse === "stock";
      let amountNum = Number(ledgerDraft.amount) || 0;

      if (isStockInvestment && ledgerDraft.stockDetails?.qty && ledgerDraft.stockDetails?.buyPrice) {
        const computed = (Number(ledgerDraft.stockDetails.qty) || 0) * (Number(ledgerDraft.stockDetails.buyPrice) || 0);
        if (!amountNum && computed > 0) {
          amountNum = computed;
        }
      }

      const ledgerId = editingLedgerId || ledgerDraft.id || generateId();
      let holdingId = ledgerDraft.holdingId || null;

      // If stock investment, sync to holdings
      if (isStockInvestment && (ledgerDraft.stockDetails?.stock || ledgerDraft.stockDetails?.companyName)) {
        const stockSymbol = (ledgerDraft.stockDetails.stock || ledgerDraft.stockDetails.companyName).toUpperCase().trim();
        const existingHolding = holdings.find(h => (holdingId && h.id === holdingId) || h.ledgerId === ledgerId || h.stock === stockSymbol);
        const resolvedHoldingId = existingHolding ? existingHolding.id : (holdingId || generateId());
        holdingId = resolvedHoldingId;

        const holdingObj = {
          id: resolvedHoldingId,
          date: ledgerDraft.date,
          stock: stockSymbol,
          companyName: ledgerDraft.stockDetails.companyName || stockSymbol,
          exchange: ledgerDraft.stockDetails.exchange || "NSE",
          qty: ledgerDraft.stockDetails.qty || "",
          buyPrice: ledgerDraft.stockDetails.buyPrice || "",
          currentPrice: ledgerDraft.stockDetails.currentPrice !== "" ? ledgerDraft.stockDetails.currentPrice : ledgerDraft.stockDetails.buyPrice,
          priceUpdatedOn: ledgerDraft.stockDetails.priceUpdatedOn || ledgerDraft.date,
          peRatio: ledgerDraft.stockDetails.peRatio || "",
          beta: ledgerDraft.stockDetails.beta || "",
          companySize: ledgerDraft.stockDetails.companySize || "Large cap",
          valuationView: ledgerDraft.stockDetails.valuationView || "Needs review",
          dividendDate: ledgerDraft.stockDetails.dividendDate || "",
          dividendPerShare: ledgerDraft.stockDetails.dividendPerShare || "",
          investmentNote: ledgerDraft.stockDetails.investmentNote || "",
          newsDate: ledgerDraft.stockDetails.newsDate || "",
          ledgerId: ledgerId,
        };

        setHoldings(prev => {
          const idx = prev.findIndex(h => h.id === resolvedHoldingId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = holdingObj;
            return next;
          }
          return [...prev, holdingObj];
        });

        if (dbStatus.tablesReady) {
          await persistHolding(holdingObj);
        }
      }

      const ledgerObj = {
        id: ledgerId,
        date: ledgerDraft.date,
        type: ledgerDraft.type,
        withdrawalUse: ledgerDraft.type === "Withdrawal" ? (ledgerDraft.withdrawalUse || "cash") : "cash",
        amount: String(amountNum),
        note: ledgerDraft.note || "",
        stockSymbol: isStockInvestment ? (ledgerDraft.stockDetails?.stock || "") : "",
        holdingId: isStockInvestment ? holdingId : null,
      };

      if (editingLedgerId) {
        setLedger(prev => prev.map(l => (l.id === editingLedgerId ? ledgerObj : l)));
        if (dbStatus.tablesReady) await persistLedger(ledgerObj);
        setEditingLedgerId(null);
      } else {
        setLedger(prev => [...prev, ledgerObj]);
        if (dbStatus.tablesReady) await persistLedger(ledgerObj);
      }

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
      const created = { id: generateId(), type: "Withdrawal", withdrawalUse: "cash", ...withdrawDraft };
      setLedger(prev => [...prev, created]);
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
    const entry = ledger.find(l => l.id === id);
    if (!confirm("Are you sure you want to delete this capital entry?")) return;
    setSaveState("saving");
    try {
      setLedger(prev => prev.filter(l => l.id !== id));
      if (dbStatus.tablesReady) await removeLedgerFromDb(id);

      if (entry && (entry.holdingId || entry.withdrawalUse === "stock")) {
        const linkedId = entry.holdingId;
        if (linkedId) {
          setHoldings(prev => prev.filter(h => h.id !== linkedId && h.ledgerId !== id));
          if (dbStatus.tablesReady) await removeHoldingFromDb(linkedId);
        }
      }

      if (editingLedgerId === id) cancelLedgerForm();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed to delete ledger entry:", e);
      setSaveState("error");
    }
  };

  // Holdings actions
  const startEditHolding = (h) => {
    setHoldingDraft({
      id: h.id,
      date: h.date,
      stock: h.stock || "",
      companyName: h.companyName || "",
      exchange: h.exchange || "NSE",
      qty: h.qty || "",
      buyPrice: h.buyPrice || "",
      currentPrice: h.currentPrice || "",
      priceUpdatedOn: h.priceUpdatedOn || h.date,
      peRatio: h.peRatio || "",
      beta: h.beta || "",
      companySize: h.companySize || "Large cap",
      valuationView: h.valuationView || "Needs review",
      dividendDate: h.dividendDate || "",
      dividendPerShare: h.dividendPerShare || "",
      investmentNote: h.investmentNote || "",
      newsDate: h.newsDate || "",
      deductFromTradingCapital: false,
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
      const buyPriceNum = Number(holdingDraft.buyPrice) || 0;
      const qtyNum = Number(holdingDraft.qty) || 0;
      const totalCost = buyPriceNum * qtyNum;

      const holdingObj = {
        ...holdingDraft,
        id: holdingId,
        stock: (holdingDraft.stock || holdingDraft.companyName || "STOCK").toUpperCase().trim(),
        companyName: holdingDraft.companyName || holdingDraft.stock || "",
        currentPrice: holdingDraft.currentPrice !== "" ? holdingDraft.currentPrice : holdingDraft.buyPrice,
      };

      if (editingHoldingId) {
        setHoldings(prev => prev.map(h => (h.id === editingHoldingId ? holdingObj : h)));
        if (dbStatus.tablesReady) await persistHolding(holdingObj);

        // Keep linked ledger entry in sync if it exists
        const linkedLedger = ledger.find(l => l.holdingId === editingHoldingId || l.id === holdingObj.ledgerId);
        if (linkedLedger) {
          const updatedLedger = {
            ...linkedLedger,
            amount: totalCost > 0 ? String(totalCost) : linkedLedger.amount,
            stockSymbol: holdingObj.stock,
            note: `Stock purchase: ${holdingObj.stock} (${holdingObj.companyName || holdingObj.stock})`,
          };
          setLedger(prev => prev.map(l => (l.id === linkedLedger.id ? updatedLedger : l)));
          if (dbStatus.tablesReady) await persistLedger(updatedLedger);
        }
        setEditingHoldingId(null);
      } else {
        setHoldings(prev => [...prev, holdingObj]);
        if (dbStatus.tablesReady) await persistHolding(holdingObj);

        // If deductFromTradingCapital is checked, record matching capital movement
        if (holdingDraft.deductFromTradingCapital && totalCost > 0) {
          const ledgerEntry = {
            id: generateId(),
            date: holdingDraft.date,
            type: "Withdrawal",
            withdrawalUse: "stock",
            amount: String(totalCost),
            note: `Stock purchase: ${holdingObj.stock} (${holdingDraft.companyName || holdingObj.stock})`,
            stockSymbol: holdingObj.stock,
            holdingId: holdingId,
          };
          setLedger(prev => [...prev, ledgerEntry]);
          if (dbStatus.tablesReady) await persistLedger(ledgerEntry);
        }
      }

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
    if (!confirm("Are you sure you want to delete this equity holding?")) return;
    setSaveState("saving");
    try {
      setHoldings(prev => prev.filter(h => h.id !== id));
      if (dbStatus.tablesReady) await removeHoldingFromDb(id);
      if (editingHoldingId === id) cancelHoldingForm();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("Failed to delete holding:", e);
      setSaveState("error");
    }
  };

  const updateHoldingPrice = async (id, val) => {
    setHoldings(prev => prev.map(h => (h.id === id ? { ...h, currentPrice: val } : h)));
    const target = holdings.find(h => h.id === id);
    if (target && dbStatus.tablesReady) {
      try {
        await persistHolding({ ...target, currentPrice: val });
      } catch (e) {
        console.warn("Failed to update holding price in Supabase:", e);
      }
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
    <div style={{ minHeight: "100vh", position: "relative", paddingBottom: 60 }}>
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
            ["trades", `Trade Log (${trades.length})`, <Briefcase size={14} />],
            ["capital", "Capital & Ledger", <Wallet size={14} />],
            ["investments", `Equity Investments (${holdings.length})`, <Briefcase size={14} />],
            ["habits", "Daily Habits", <CheckCircle2 size={14} />],
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
          <OverviewTab stats={stats} targetPct={targetPct} setTargetPct={setTargetPct} />
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

        {tab === "capital" && (
          <CapitalTab
            startingCapital={startingCapital}
            setStartingCapital={setStartingCapital}
            ledger={ledger}
            stats={stats}
            openNewLedgerForm={() => { setLedgerDraft(emptyLedger()); setEditingLedgerId(null); setShowLedgerForm(true); }}
            startEditLedger={(l) => { setLedgerDraft({ ...l }); setEditingLedgerId(l.id); setShowLedgerForm(true); }}
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
            updateHoldingPrice={updateHoldingPrice}
          />
        )}

        {tab === "habits" && (
          <DailyHabitsTab />
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

      {/* Modal: Record Capital Movement */}
      {showLedgerForm && (
        <ModalWrapper
          onClose={cancelLedgerForm}
          title={editingLedgerId ? "Edit Capital Movement" : "Record capital movement"}
          subtitle="Keep deposits and withdrawals separate from trading profits"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Date & Movement Selection */}
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
                <label>Movement</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, height: 44 }}>
                  <button
                    type="button"
                    onClick={() => setLedgerDraft(prev => ({ ...prev, type: "Deposit" }))}
                    style={{
                      borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      background: ledgerDraft.type === "Deposit" ? "var(--color-win-soft)" : "var(--bg-elevated)",
                      border: ledgerDraft.type === "Deposit" ? "2px solid var(--color-win)" : "1px solid var(--border-subtle)",
                      color: ledgerDraft.type === "Deposit" ? "var(--color-win-text)" : "var(--text-secondary)",
                    }}
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerDraft(prev => ({ ...prev, type: "Withdrawal" }))}
                    style={{
                      borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      background: ledgerDraft.type === "Withdrawal" ? "var(--color-loss-soft)" : "var(--bg-elevated)",
                      border: ledgerDraft.type === "Withdrawal" ? "2px solid var(--color-loss)" : "1px solid var(--border-subtle)",
                      color: ledgerDraft.type === "Withdrawal" ? "var(--color-loss-text)" : "var(--text-secondary)",
                    }}
                  >
                    Withdrawal
                  </button>
                </div>
              </div>
            </div>

            {/* When Withdrawal is selected: "Withdrawal used for" */}
            {ledgerDraft.type === "Withdrawal" && (
              <div style={{
                background: "var(--bg-elevated)", padding: 14, borderRadius: 10,
                border: "1px solid var(--border-subtle)"
              }}>
                <label>Withdrawal used for</label>
                <select
                  value={ledgerDraft.withdrawalUse || "cash"}
                  onChange={e => setLedgerDraft(prev => ({ ...prev, withdrawalUse: e.target.value }))}
                  style={{ fontWeight: 600, fontSize: 14 }}
                >
                  <option value="cash">Cash withdrawal</option>
                  <option value="stock">Stock investment</option>
                </select>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.4 }}>
                  Each movement is reported separately in equity wealth / compound cash net profit from trading profit.
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label>
                {ledgerDraft.type === "Deposit"
                  ? "Amount deposited (₹)"
                  : ledgerDraft.withdrawalUse === "stock"
                    ? "Amount withdrawn / deposited (₹)"
                    : "Amount withdrawn (₹)"}
              </label>
              <input
                type="number"
                placeholder="e.g. 500000"
                className="mono"
                value={ledgerDraft.amount}
                onChange={e => setLedgerDraft(prev => ({ ...prev, amount: e.target.value }))}
                style={{ fontSize: 18, fontWeight: 700 }}
              />
            </div>

            {/* When Stock Investment is selected: Comprehensive Stock Details Card */}
            {ledgerDraft.type === "Withdrawal" && ledgerDraft.withdrawalUse === "stock" && (
              <div style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--color-gold-border)",
                borderRadius: 12,
                padding: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-gold)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Stock Investment Details
                  </div>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                    background: "var(--color-gold-soft)", color: "var(--color-gold)", fontWeight: 700
                  }}>AUTO-SYNCED TO HOLDINGS</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 14 }}>
                  Record and review the investment — input company name and research notes whenever you review this holding
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div>
                    <label>Company name</label>
                    <input
                      placeholder="e.g. Reliance Industries"
                      value={ledgerDraft.stockDetails?.companyName || ""}
                      onChange={e => updateLedgerStockDetail("companyName", e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Stock symbol</label>
                    <input
                      placeholder="e.g. RELIANCE"
                      className="mono"
                      value={ledgerDraft.stockDetails?.stock || ""}
                      onChange={e => updateLedgerStockDetail("stock", e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label>Exchange</label>
                    <select
                      value={ledgerDraft.stockDetails?.exchange || "NSE"}
                      onChange={e => updateLedgerStockDetail("exchange", e.target.value)}
                    >
                      <option>NSE</option>
                      <option>BSE</option>
                    </select>
                  </div>
                  <div>
                    <label>Quantity</label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      className="mono"
                      value={ledgerDraft.stockDetails?.qty || ""}
                      onChange={e => updateLedgerStockDetail("qty", e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Purchase price / share (₹)</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder="e.g. 2450.50"
                      className="mono"
                      value={ledgerDraft.stockDetails?.buyPrice || ""}
                      onChange={e => updateLedgerStockDetail("buyPrice", e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Current price / share (₹)</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder="defaults to purchase price"
                      className="mono"
                      value={ledgerDraft.stockDetails?.currentPrice || ""}
                      onChange={e => updateLedgerStockDetail("currentPrice", e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Price updated on</label>
                    <input
                      type="date"
                      value={ledgerDraft.stockDetails?.priceUpdatedOn || ""}
                      onChange={e => updateLedgerStockDetail("priceUpdatedOn", e.target.value)}
                    />
                  </div>
                  <div>
                    <label>P/E ratio</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 22.5"
                      className="mono"
                      value={ledgerDraft.stockDetails?.peRatio || ""}
                      onChange={e => updateLedgerStockDetail("peRatio", e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Beta</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1.25"
                      className="mono"
                      value={ledgerDraft.stockDetails?.beta || ""}
                      onChange={e => updateLedgerStockDetail("beta", e.target.value)}
                    />
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      1.20 or above is shown as high beta
                    </div>
                  </div>
                  <div>
                    <label>Company size</label>
                    <select
                      value={ledgerDraft.stockDetails?.companySize || "Large cap"}
                      onChange={e => updateLedgerStockDetail("companySize", e.target.value)}
                    >
                      <option>Large cap</option>
                      <option>Mid cap</option>
                      <option>Small cap</option>
                      <option>Micro cap</option>
                    </select>
                  </div>
                  <div>
                    <label>Valuation view</label>
                    <select
                      value={ledgerDraft.stockDetails?.valuationView || "Needs review"}
                      onChange={e => updateLedgerStockDetail("valuationView", e.target.value)}
                    >
                      <option>Needs review</option>
                      <option>Undervalued</option>
                      <option>Fair</option>
                      <option>Overvalued</option>
                    </select>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      Nudge P/E against the company's sector and history
                    </div>
                  </div>
                  <div>
                    <label>Next dividend / ex-date (optional)</label>
                    <input
                      type="date"
                      value={ledgerDraft.stockDetails?.dividendDate || ""}
                      onChange={e => updateLedgerStockDetail("dividendDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Dividend per share (₹) (optional)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 10"
                      className="mono"
                      value={ledgerDraft.stockDetails?.dividendPerShare || ""}
                      onChange={e => updateLedgerStockDetail("dividendPerShare", e.target.value)}
                    />
                  </div>
                  <div>
                    <label>News date (optional)</label>
                    <input
                      type="date"
                      value={ledgerDraft.stockDetails?.newsDate || ""}
                      onChange={e => updateLedgerStockDetail("newsDate", e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label>Latest news / investment note (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Earnings, order win, management change, thesis..."
                    value={ledgerDraft.stockDetails?.investmentNote || ""}
                    onChange={e => updateLedgerStockDetail("investmentNote", e.target.value)}
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label>Notes (optional)</label>
              <input
                placeholder={ledgerDraft.type === "Deposit" ? "e.g. Opening capital, fresh deposit" : "e.g. Payout, thesis"}
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
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                border: "none", color: "#0F172A",
                borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
              }}
            >
              {editingLedgerId ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* Modal: Holding Form */}
      {showHoldingForm && (
        <ModalWrapper
          onClose={cancelHoldingForm}
          title={editingHoldingId ? "Edit Stock Holding" : "New Equity Investment"}
          subtitle="Record and review the investment — input company details and research metrics"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label>Company Name</label>
                <input
                  placeholder="e.g. Reliance Industries"
                  value={holdingDraft.companyName}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div>
                <label>Stock Symbol</label>
                <input
                  placeholder="e.g. RELIANCE"
                  className="mono"
                  value={holdingDraft.stock}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, stock: e.target.value.toUpperCase() }))}
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
                </select>
              </div>
              <div>
                <label>Purchase Date</label>
                <input
                  type="date"
                  value={holdingDraft.date}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label>Quantity</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  className="mono"
                  value={holdingDraft.qty}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, qty: e.target.value }))}
                />
              </div>
              <div>
                <label>Buy Price / Share (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="e.g. 2450.50"
                  className="mono"
                  value={holdingDraft.buyPrice}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, buyPrice: e.target.value }))}
                />
              </div>
              <div>
                <label>Current Price / Share (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="defaults to buy price"
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
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                  1.20 or above is shown as high beta
                </div>
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
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                  Nudge P/E against the company's sector and history
                </div>
              </div>
              <div>
                <label>Next Dividend / Ex-Date (Optional)</label>
                <input
                  type="date"
                  value={holdingDraft.dividendDate}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, dividendDate: e.target.value }))}
                />
              </div>
              <div>
                <label>Dividend Per Share (₹) (Optional)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 10"
                  className="mono"
                  value={holdingDraft.dividendPerShare}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, dividendPerShare: e.target.value }))}
                />
              </div>
              <div>
                <label>News Date (Optional)</label>
                <input
                  type="date"
                  value={holdingDraft.newsDate}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, newsDate: e.target.value }))}
                />
              </div>
              <div>
                <label>Total Invested</label>
                <div className="mono" style={{ padding: "10px 14px", borderRadius: 8, background: "var(--bg-elevated)", fontWeight: 700, fontSize: 16, color: "var(--color-gold)" }}>
                  {fmtINR((Number(holdingDraft.qty) || 0) * (Number(holdingDraft.buyPrice) || 0))}
                </div>
              </div>
            </div>

            <div>
              <label>Latest News / Investment Note (Optional)</label>
              <textarea
                rows={2}
                placeholder="Earnings, order win, management change, thesis..."
                value={holdingDraft.investmentNote}
                onChange={e => setHoldingDraft(prev => ({ ...prev, investmentNote: e.target.value }))}
                style={{ resize: "vertical" }}
              />
            </div>

            {!editingHoldingId && (
              <label style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                background: "var(--bg-elevated)", borderRadius: 8, cursor: "pointer",
                border: "1px solid var(--border-subtle)", textTransform: "none", fontSize: 13, color: "var(--text-main)", margin: 0
              }}>
                <input
                  type="checkbox"
                  style={{ width: 16, height: 16, accentColor: "var(--color-gold)", minHeight: "auto" }}
                  checked={holdingDraft.deductFromTradingCapital}
                  onChange={e => setHoldingDraft(prev => ({ ...prev, deductFromTradingCapital: e.target.checked }))}
                />
                Deduct from trading capital (record movement in Capital Ledger)
              </label>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <button
              onClick={cancelHoldingForm}
              style={{
                background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)",
                borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              onClick={addHolding}
              style={{
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                border: "none", color: "#0F172A",
                borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
              }}
            >
              {editingHoldingId ? "Update Holding" : "Save Holding"}
            </button>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
}

// Top Metric Card Component
function MetricSummaryCard({ label, value, icon, isPnl, val, customColor }) {
  let color = customColor || "var(--text-main)";
  if (isPnl) {
    color = val >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)";
  }
  return (
    <div className="glass-card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
        <div style={{ color: "var(--color-gold)", opacity: 0.85 }}>{icon}</div>
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

// Modal Wrapper Component
function ModalWrapper({ children, onClose, title, subtitle }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
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

// Overview Tab Component
function OverviewTab({ stats, targetPct, setTargetPct }) {
  const dailyTarget = stats.currentCapital * (targetPct / 100);
  const stopLossLow = dailyTarget * 1;
  const stopLossHigh = dailyTarget * 1.5;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Top Row: Equity Curve & Discipline Gauge */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
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

        {/* Discipline Gauge */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)", marginBottom: 4 }}>
            Discipline Score
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 14 }}>
            Trading rule adherence rate
          </div>
          <DisciplineRing value={stats.discipline} />
        </div>
      </div>

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

      {/* Row 3: Monthly P&L, Win/Loss, and Performance Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Monthly P&L */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-main)", marginBottom: 12 }}>
            Monthly P&L
          </div>
          {stats.monthly.length === 0 ? <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 30 }}>No trades yet.</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.monthly}>
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

// Capital & Ledger Tab Component
function CapitalTab({ startingCapital, setStartingCapital, ledger, stats, openNewLedgerForm, startEditLedger, deleteLedger }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="glass-card" style={{ padding: 16 }}>
          <label>Starting Capital (₹)</label>
          <input
            type="number" className="mono" value={startingCapital}
            onChange={e => setStartingCapital(Number(e.target.value) || 0)}
            style={{ fontSize: 18, fontWeight: 700 }}
          />
        </div>
        <MetricSummaryCard label="Total Deposits" value={fmtINR(stats.deposits)} icon={<Wallet size={16} />} customColor="var(--color-win-text)" />
        <MetricSummaryCard label="Cash Withdrawn" value={fmtINR(stats.cashWithdrawn)} icon={<ArrowDownToLine size={16} />} customColor="var(--color-loss-text)" />
        <MetricSummaryCard label="Moved into Stocks" value={fmtINR(stats.movedIntoStocks)} icon={<PiggyBank size={16} />} customColor="var(--color-gold)" />
        <MetricSummaryCard label="Net Capital Added" value={fmtINR(stats.netCapitalAdded)} icon={<Target size={16} />} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)" }}>
            Capital Ledger History ({ledger.length})
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            Deposits, cash withdrawals, and capital allocated into equity investments
          </div>
        </div>
        <button
          onClick={openNewLedgerForm}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            color: "#0F172A", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Entry
        </button>
      </div>

      {/* Mobile View: Ledger Cards */}
      <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...ledger].reverse().map(l => {
          const isDeposit = l.type === "Deposit";
          const isStock = l.type === "Investment" || l.withdrawalUse === "stock" || Boolean(l.stockSymbol);
          const movementLabel = isDeposit ? "Deposit" : isStock ? "Stock investment" : "Cash withdrawal";
          const useLabel = isDeposit ? "Trading capital" : isStock ? (l.stockSymbol ? `Stock: ${l.stockSymbol}` : "Stock investment") : "Personal cash";
          const amountSign = isDeposit ? "+" : "-";
          const amountColor = isDeposit ? "var(--color-win-text)" : isStock ? "var(--color-gold)" : "var(--color-loss-text)";
          const badgeBg = isDeposit ? "var(--color-win-soft)" : isStock ? "var(--color-gold-soft)" : "var(--color-loss-soft)";
          const badgeColor = isDeposit ? "var(--color-win-text)" : isStock ? "var(--color-gold)" : "var(--color-loss-text)";

          return (
            <div key={l.id} className="glass-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtDate(l.date)}</span>
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: badgeBg, color: badgeColor
                  }}>{movementLabel}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEditLedger(l)} style={{ background: "none", border: "none", color: "var(--text-muted)", padding: 4 }}><Pencil size={14} /></button>
                  <button onClick={() => deleteLedger(l.id)} style={{ background: "none", border: "none", color: "var(--color-loss-text)", padding: 4 }}><Trash2 size={14} /></button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: amountColor }}>
                  {amountSign}{fmtINR(l.amount)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                  {useLabel}
                </div>
              </div>

              {l.note && (
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontStyle: "italic", marginTop: 4, borderTop: "1px solid var(--border-subtle)", paddingTop: 6 }}>
                  {l.note}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop View: Ledger Table */}
      <div className="desktop-only glass-card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", textAlign: "left" }}>
              {["Date", "Movement", "Use", "Notes", "Net Amount", ""].map(h => (
                <th key={h} style={{ padding: "12px 14px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...ledger].reverse().map(l => {
              const isDeposit = l.type === "Deposit";
              const isStock = l.type === "Investment" || l.withdrawalUse === "stock" || Boolean(l.stockSymbol);
              const movementLabel = isDeposit ? "Deposit" : isStock ? "Stock investment" : "Cash withdrawal";
              const useLabel = isDeposit ? "Trading capital" : isStock ? (l.stockSymbol ? `Stock: ${l.stockSymbol}` : "Stock investment") : "Personal cash";
              const amountSign = isDeposit ? "+" : "-";
              const amountColor = isDeposit ? "var(--color-win-text)" : isStock ? "var(--color-gold)" : "var(--color-loss-text)";
              const badgeBg = isDeposit ? "var(--color-win-soft)" : isStock ? "var(--color-gold-soft)" : "var(--color-loss-soft)";
              const badgeColor = isDeposit ? "var(--color-win-text)" : isStock ? "var(--color-gold)" : "var(--color-loss-text)";

              return (
                <tr key={l.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td className="mono" style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>{fmtDate(l.date)}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: badgeBg, color: badgeColor
                    }}>{movementLabel}</span>
                  </td>
                  <td style={{ padding: "11px 14px", fontWeight: 600, color: "var(--text-main)" }}>{useLabel}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-secondary)" }}>{l.note || "—"}</td>
                  <td className="mono" style={{ padding: "11px 14px", fontWeight: 700, color: amountColor }}>
                    {amountSign}{fmtINR(l.amount)}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => startEditLedger(l)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }} title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => deleteLedger(l.id)} style={{ background: "none", border: "none", color: "var(--color-loss-text)", cursor: "pointer" }} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
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

// Equity Investments Tab Component
function InvestmentsTab({ holdings, stats, openNewHoldingForm, startEditHolding, deleteHolding, updateHoldingPrice }) {
  const [search, setSearch] = useState("");
  const [capFilter, setCapFilter] = useState("ALL");
  const [valFilter, setValFilter] = useState("ALL");

  const totalInvested = stats?.holdingsInvested || 0;
  const totalCurVal = stats?.holdingsCurrentValue || 0;
  const totalUnrealized = stats?.holdingsUnrealized || 0;
  const totalReturnPct = totalInvested > 0 ? (totalUnrealized / totalInvested) * 100 : 0;
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
      const cost = (Number(h.qty) || 0) * (Number(h.buyPrice) || 0);
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
          label="Total Equity Invested"
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
          value={fmtPct(portfolioXIRR)}
          isPnl
          val={portfolioXIRR}
          icon={<Percent size={16} />}
          customColor={portfolioXIRR >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)"}
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
              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>
                Equity Portfolio Strategy & Allocation
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
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 640 }}>
              All holdings below are permanent equity investments created from disciplined options trading withdrawals. Holding-level <strong>XIRR %</strong> tracks your true annualized compounding velocity from trade settlement to date.
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Portfolio Return</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-mono)", color: totalUnrealized >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                {fmtPct(totalReturnPct)}
              </div>
            </div>
            <button
              onClick={openNewHoldingForm}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                color: "#0F172A", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 2px 10px rgba(245, 158, 11, 0.3)"
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              Add Stock Investment
            </button>
          </div>
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

      {/* 4. Mobile Cards: Descriptive Holding Cards */}
      <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredHoldings.length === 0 ? (
          <div className="glass-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
            No equity investments match your filter criteria.
          </div>
        ) : (
          filteredHoldings.map(h => {
            const qty = Number(h.qty) || 0;
            const buy = Number(h.buyPrice) || 0;
            const cp = h.currentPrice !== "" && h.currentPrice != null ? Number(h.currentPrice) : buy;
            const invested = qty * buy;
            const curVal = qty * cp;
            const pnl = curVal - invested;
            const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
            const holdingXIRR = calcHoldingXIRR(h.date, invested, curVal);
            const daysHeld = h.date ? Math.max(0, Math.round((new Date() - new Date(h.date)) / (1000 * 60 * 60 * 24))) : 0;

            return (
              <div key={h.id} className="glass-card" style={{ padding: 16 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontSize: 17, fontWeight: 800, color: "var(--color-gold)" }}>{h.stock}</span>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--bg-elevated)", color: "var(--color-gold)", fontWeight: 700 }}>
                        {h.exchange || "NSE"}
                      </span>
                      {h.companySize && (
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--bg-elevated)", color: "var(--text-secondary)", fontWeight: 600 }}>
                          {h.companySize}
                        </span>
                      )}
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
                      Purchased {fmtDate(h.date)} · {daysHeld} days held
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      onClick={() => startEditHolding(h)}
                      className="btn-secondary"
                      style={{
                        padding: "5px 9px",
                        fontSize: 12,
                        fontWeight: 600,
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
                    <button
                      onClick={() => deleteHolding(h.id)}
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        color: "var(--color-loss-text)",
                        padding: "5px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "var(--bg-elevated)", padding: 12, borderRadius: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Qty · Purchase Price</div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                      {qty} @ {fmtINR(buy)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Total Cost Basis</div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                      {fmtINR(invested)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Current Value</div>
                    <div className="mono" style={{ fontWeight: 800, fontSize: 14, color: "var(--text-main)", marginTop: 2 }}>
                      {fmtINR(curVal)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Unrealized P&L</div>
                    <div className="mono" style={{ fontWeight: 800, fontSize: 14, color: pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)", marginTop: 2 }}>
                      {fmtSigned(pnl)} ({fmtPct(pnlPct)})
                    </div>
                  </div>
                </div>

                {/* CMP Quick Updater + Individual Stock XIRR Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(245, 158, 11, 0.04)", borderRadius: 10, border: "1px solid var(--border-subtle)", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Current Price (CMP):</span>
                    <input
                      type="number"
                      step="0.05"
                      value={h.currentPrice}
                      placeholder={String(buy)}
                      onChange={e => updateHoldingPrice(h.id, e.target.value)}
                      style={{ width: 90, padding: "5px 8px", fontSize: 13, minHeight: 32, fontFamily: "var(--font-mono)", fontWeight: 700 }}
                    />
                  </div>

                  {/* Individual Stock XIRR */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Holding XIRR</div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: (holdingXIRR || 0) >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)",
                      }}
                    >
                      {holdingXIRR !== null ? `${fmtPct(holdingXIRR)} p.a.` : "—"}
                    </div>
                  </div>
                </div>

                {/* Fundamentals: P/E, Beta, Dividend */}
                {(h.peRatio || h.beta || h.dividendDate || h.dividendPerShare) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11.5, color: "var(--text-secondary)", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                    {h.peRatio && <span>P/E Ratio: <strong style={{ color: "var(--text-main)" }}>{h.peRatio}</strong></span>}
                    {h.beta && <span>Beta: <strong style={{ color: "var(--text-main)" }}>{h.beta}</strong></span>}
                    {h.dividendPerShare && <span>Div/Share: <strong style={{ color: "var(--color-win-text)" }}>₹{h.dividendPerShare}</strong></span>}
                    {h.dividendDate && <span>Next Div: <strong style={{ color: "var(--text-main)" }}>{fmtDate(h.dividendDate)}</strong></span>}
                  </div>
                )}

                {/* Descriptive Investment Thesis & Catalyst Note */}
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

      {/* 5. Desktop View: Comprehensive Descriptive Holdings Table */}
      <div className="desktop-only glass-card" style={{ overflowX: "auto", border: "1px solid var(--border-card)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", textAlign: "left" }}>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Stock & Company</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Valuation View</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Purchase Date</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Qty</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Buy Price</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Total Invested</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Current Price (CMP)</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Current Value</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Unrealized P&L</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Return %</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", color: "var(--color-gold)" }}>Holding XIRR</th>
              <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fundamentals & Notes</th>
              <th style={{ padding: "12px 14px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredHoldings.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>
                  No equity investments match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredHoldings.map(h => {
                const qty = Number(h.qty) || 0;
                const buy = Number(h.buyPrice) || 0;
                const cp = h.currentPrice !== "" && h.currentPrice != null ? Number(h.currentPrice) : buy;
                const invested = qty * buy;
                const curVal = qty * cp;
                const pnl = curVal - invested;
                const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                const holdingXIRR = calcHoldingXIRR(h.date, invested, curVal);
                const daysHeld = h.date ? Math.max(0, Math.round((new Date() - new Date(h.date)) / (1000 * 60 * 60 * 24))) : 0;

                return (
                  <tr key={h.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    {/* Stock & Company */}
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="mono" style={{ fontWeight: 800, fontSize: 14, color: "var(--color-gold)" }}>{h.stock}</span>
                        <span style={{
                          padding: "2px 5px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                          background: "var(--bg-elevated)", color: "var(--color-gold)"
                        }}>{h.exchange || "NSE"}</span>
                        {h.companySize && (
                          <span style={{
                            padding: "2px 5px", borderRadius: 4, fontSize: 10,
                            background: "var(--bg-elevated)", color: "var(--text-secondary)"
                          }}>{h.companySize}</span>
                        )}
                      </div>
                      {h.companyName && h.companyName !== h.stock && (
                        <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2, maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

                    {/* Purchase Date & Age */}
                    <td className="mono" style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div>{fmtDate(h.date)}</div>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{daysHeld}d held</div>
                    </td>

                    {/* Qty */}
                    <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600 }}>
                      {qty}
                    </td>

                    {/* Buy Price */}
                    <td className="mono" style={{ padding: "12px 14px", textAlign: "right" }}>
                      {fmtINR(buy)}
                    </td>

                    {/* Total Invested */}
                    <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>
                      {fmtINR(invested)}
                    </td>

                    {/* Current Market Price (CMP) Inline Quick Updater */}
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>₹</span>
                        <input
                          type="number"
                          step="0.05"
                          value={h.currentPrice}
                          placeholder={String(buy)}
                          onChange={e => updateHoldingPrice(h.id, e.target.value)}
                          style={{
                            width: 85,
                            padding: "4px 6px",
                            fontSize: 13,
                            minHeight: 28,
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            color: "var(--text-main)",
                            background: "transparent",
                            border: "none",
                            outline: "none"
                          }}
                          title="Click to edit CMP directly"
                        />
                      </div>
                      {h.priceUpdatedOn && (
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                          Updated {fmtDate(h.priceUpdatedOn)}
                        </div>
                      )}
                    </td>

                    {/* Current Value */}
                    <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                      {fmtINR(curVal)}
                    </td>

                    {/* Unrealized P&L */}
                    <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                      {fmtSigned(pnl)}
                    </td>

                    {/* Return % */}
                    <td className="mono" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: pnl >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
                      {fmtPct(pnlPct)}
                    </td>

                    {/* Individual Stock Holding XIRR % */}
                    <td className="mono" style={{ padding: "12px 14px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontWeight: 800,
                          fontSize: 12,
                          background: (holdingXIRR || 0) >= 0 ? "var(--color-win-soft)" : "var(--color-loss-soft)",
                          color: (holdingXIRR || 0) >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)",
                          border: `1px solid ${(holdingXIRR || 0) >= 0 ? "var(--color-win-border)" : "var(--color-loss-border)"}`,
                        }}
                      >
                        {holdingXIRR !== null ? `${fmtPct(holdingXIRR)}` : "—"}
                      </div>
                      <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2 }}>p.a.</div>
                    </td>

                    {/* Fundamentals & Research Thesis */}
                    <td style={{ padding: "12px 14px", maxWidth: 220 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, marginBottom: 3 }}>
                        {h.peRatio && <span>P/E: <b>{h.peRatio}</b></span>}
                        {h.beta && <span>Beta: <b>{h.beta}</b></span>}
                        {h.dividendPerShare && <span style={{ color: "var(--color-win-text)" }}>Div: <b>₹{h.dividendPerShare}</b></span>}
                      </div>
                      {h.investmentNote ? (
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-secondary)",
                            fontStyle: "italic",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={h.investmentNote}
                        >
                          "{h.investmentNote}"
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>No thesis notes</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button
                          onClick={() => startEditHolding(h)}
                          className="btn-secondary"
                          style={{
                            padding: "4px 9px",
                            fontSize: 12,
                            fontWeight: 600,
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
                        <button
                          onClick={() => deleteHolding(h.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            color: "var(--color-loss-text)",
                            padding: "4px 8px",
                            borderRadius: 6,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                          title="Delete Position"
                        >
                          <Trash2 size={12} />
                        </button>
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
