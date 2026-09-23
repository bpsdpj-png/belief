import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, Cell, PieChart, Pie, ReferenceLine
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, IndianRupee, Target, ShieldCheck, X, Trash2,
  Wallet, PiggyBank, ArrowDownToLine, Flame, Briefcase, Percent, Download, Pencil
} from "lucide-react";
import * as XLSX from "xlsx";

const STORAGE_KEY = "fo-dashboard-state-v1";

const RULE_DEFS = [
  { key: "sl", label: "Stop-loss respected" },
  { key: "sizing", label: "Position sizing followed" },
  { key: "noRevenge", label: "No revenge trade" },
  { key: "plan", label: "Entry/exit per plan" },
];

const INDEX_OPTIONS = ["NIFTY", "BANKNIFTY", "SENSEX", "BANKEX", "MIDCAP", "STOCKS"];
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
  "Every stop-loss you honor today is a account you get to trade tomorrow.",
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

const emptyTrade = () => ({
  id: crypto.randomUUID(),
  date: todayLocalISO(),
  index: "NIFTY",
  strategy: "Straddle",
  bias: "Sideways",
  gross: "",
  charges: "",
  rules: { sl: true, sizing: true, noRevenge: true, plan: true },
  notes: "",
});

const emptyLedger = () => ({
  id: crypto.randomUUID(),
  date: todayLocalISO(),
  type: "Deposit",
  amount: "",
  note: "",
});

const emptyHolding = () => ({
  id: crypto.randomUUID(),
  date: todayLocalISO(),
  stock: "",
  qty: "",
  buyPrice: "",
  currentPrice: "",
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

const toLocalISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayLocalISO = () => toLocalISODate(new Date());

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
  const [startingCapital, setStartingCapital] = useState(500000);
  const [trades, setTrades] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [tab, setTab] = useState("overview");
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [tradeDraft, setTradeDraft] = useState(emptyTrade());
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [ledgerDraft, setLedgerDraft] = useState(emptyLedger());
  const [editingLedgerId, setEditingLedgerId] = useState(null);
  const [holdingDraft, setHoldingDraft] = useState(emptyHolding());
  const [editingHoldingId, setEditingHoldingId] = useState(null);
  const [targetPct, setTargetPct] = useState(0.75);
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setStartingCapital(parsed.startingCapital ?? 500000);
          setTrades(parsed.trades ?? []);
          setLedger(parsed.ledger ?? []);
          setHoldings(parsed.holdings ?? []);
          setTargetPct(parsed.targetPct ?? 0.75);
        }
      } catch (e) {
        // no existing data yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await window.storage.set(
          STORAGE_KEY,
          JSON.stringify({ startingCapital, trades, ledger, holdings, targetPct })
        );
        setSaveState("saved");
      } catch (e) {
        setSaveState("error");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [startingCapital, trades, ledger, holdings, targetPct, loaded]);

  const tradesSorted = useMemo(
    () => [...trades].sort((a, b) => a.date.localeCompare(b.date)),
    [trades]
  );

  const stats = useMemo(() => {
    const netOf = (t) => (Number(t.gross) || 0) - (Number(t.charges) || 0);
    const totalNet = trades.reduce((s, t) => s + netOf(t), 0);
    const deposits = ledger.filter(l => l.type === "Deposit").reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const withdrawals = ledger.filter(l => l.type === "Withdrawal").reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const legacyLedgerInvestments = ledger.filter(l => l.type === "Investment").reduce((s, l) => s + (Number(l.amount) || 0), 0);

    const holdingsInvested = holdings.reduce((s, h) => s + (Number(h.qty) || 0) * (Number(h.buyPrice) || 0), 0);
    const holdingsCurrentValue = holdings.reduce((s, h) => {
      const cp = h.currentPrice !== "" && h.currentPrice != null ? Number(h.currentPrice) : Number(h.buyPrice) || 0;
      return s + (Number(h.qty) || 0) * cp;
    }, 0);
    const holdingsUnrealized = holdingsCurrentValue - holdingsInvested;
    const totalInvestedOut = legacyLedgerInvestments + holdingsInvested;

    const currentCapital = startingCapital + deposits - withdrawals - totalInvestedOut + totalNet;
    const capitalBase = startingCapital + deposits;
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

    // Capital appreciation / downside from the very start (trading equity only, not deposits/withdrawals)
    const capitalAppreciation = currentCapital - startingCapital;
    const capitalAppreciationPct = startingCapital > 0 ? (capitalAppreciation / startingCapital) * 100 : 0;
    const equityPoints = [startingCapital, ...curve.map(c => c.equity)];
    const minEquityFromStart = Math.min(...equityPoints);
    const downsideFromStart = minEquityFromStart - startingCapital;
    const downsideFromStartPct = startingCapital > 0 ? (downsideFromStart / startingCapital) * 100 : 0;

    // Profit vs withdrawal health: positive = retaining more than withdrawn, negative = withdrawing into principal
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

    // Strategy performance breakdown
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

    // Trading-capital XIRR: capital in/out flows, ending value = current capital today
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

    // Equity-holdings XIRR
    const equityFlows = holdings.map(h => ({
      date: new Date(h.date),
      amount: -((Number(h.qty) || 0) * (Number(h.buyPrice) || 0)),
    }));
    if (holdingsCurrentValue > 0) equityFlows.push({ date: new Date(), amount: holdingsCurrentValue });
    const equityXIRR = xirr(equityFlows);

    return {
      totalNet, currentCapital, overallROI, dailyROI, monthlyROI, todayPnl, monthNet,
      winRate, avgWin, avgLoss, profitFactor, discipline, curve, maxDD, consistency, avgDailyPnl, avgDailyROI, streak, streakType,
      monthly, weekly, deposits, withdrawals, capitalBase, tradeCount: trades.length,
      winCount: wins.length, lossCount: losses.length,
      holdingsInvested, holdingsCurrentValue, holdingsUnrealized, equityXIRR, tradingXIRR,
      totalInvestedOut, strategyPerf,
      capitalAppreciation, capitalAppreciationPct, downsideFromStart, downsideFromStartPct, profitWithdrawalDeficit,
    };
  }, [trades, ledger, holdings, startingCapital, tradesSorted]);

  const addTrade = () => {
    if (editingTradeId) {
      setTrades(prev => prev.map(t => (t.id === editingTradeId ? { ...tradeDraft, id: editingTradeId } : t)));
      setEditingTradeId(null);
    } else {
      setTrades(prev => [...prev, tradeDraft]);
    }
    setTradeDraft(emptyTrade());
    setShowTradeForm(false);
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
  const addLedger = () => {
    if (editingLedgerId) {
      setLedger(prev => prev.map(l => (l.id === editingLedgerId ? { ...ledgerDraft, id: editingLedgerId } : l)));
      setEditingLedgerId(null);
    } else {
      setLedger(prev => [...prev, ledgerDraft]);
    }
    setLedgerDraft(emptyLedger());
    setShowLedgerForm(false);
  };
  const startEditLedger = (entry) => {
    setLedgerDraft({ ...entry });
    setEditingLedgerId(entry.id);
    setShowLedgerForm(true);
  };
  const openNewLedgerForm = () => {
    setLedgerDraft(emptyLedger());
    setEditingLedgerId(null);
    setShowLedgerForm(true);
  };
  const cancelLedgerForm = () => {
    setShowLedgerForm(false);
    setEditingLedgerId(null);
    setLedgerDraft(emptyLedger());
  };
  const quickWithdraw = (entry) => {
    setLedger(prev => [...prev, { id: crypto.randomUUID(), type: "Withdrawal", ...entry }]);
  };
  const addHolding = () => {
    if (editingHoldingId) {
      setHoldings(prev => prev.map(h => (h.id === editingHoldingId ? { ...holdingDraft, id: editingHoldingId } : h)));
      setEditingHoldingId(null);
    } else {
      setHoldings(prev => [...prev, holdingDraft]);
    }
    setHoldingDraft(emptyHolding());
    setShowHoldingForm(false);
  };
  const startEditHolding = (holding) => {
    setHoldingDraft({ ...holding });
    setEditingHoldingId(holding.id);
    setShowHoldingForm(true);
  };
  const openNewHoldingForm = () => {
    setHoldingDraft(emptyHolding());
    setEditingHoldingId(null);
    setShowHoldingForm(true);
  };
  const cancelHoldingForm = () => {
    setShowHoldingForm(false);
    setEditingHoldingId(null);
    setHoldingDraft(emptyHolding());
  };

  const deleteTrade = (id) => {
    setTrades(prev => prev.filter(t => t.id !== id));
    if (editingTradeId === id) cancelTradeForm();
  };
  const deleteLedger = (id) => {
    setLedger(prev => prev.filter(l => l.id !== id));
    if (editingLedgerId === id) cancelLedgerForm();
  };
  const deleteHolding = (id) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
    if (editingHoldingId === id) cancelHoldingForm();
  };
  const updateHoldingPrice = (id, val) => setHoldings(prev => prev.map(h => h.id === id ? { ...h, currentPrice: val } : h));

  const pnlColor = (v) => (v >= 0 ? "#1F7A55" : "#A62639");
  const dailyThought = useMemo(() => getDailyThought(), []);

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
    downloadBlob(JSON.stringify(payload, null, 2), `fo-trading-backup-${todayLocalISO()}.json`, "application/json");
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
    downloadBlob(out, `fo-trading-backup-${todayLocalISO()}.xlsx`, "application/octet-stream");
  };

  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Futura', 'Century Gothic', 'Jost', sans-serif",
      background: `
        linear-gradient(135deg, #FBF6EA 0%, #F4E9D2 45%, #EFE0C2 100%),
        radial-gradient(60% 40% at 8% 12%, rgba(184,134,46,0.14) 0%, transparent 60%),
        radial-gradient(55% 40% at 92% 18%, rgba(14,69,54,0.09) 0%, transparent 65%),
        radial-gradient(70% 55% at 25% 95%, rgba(184,134,46,0.10) 0%, transparent 60%),
        radial-gradient(45% 35% at 100% 90%, rgba(14,69,54,0.08) 0%, transparent 60%)
      `,
      color: "#152238",
      minHeight: "100%",
      padding: "0",
      width: "100%",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=Playfair+Display:wght@700;800;900&family=Kaushan+Script&display=swap');
        * { box-sizing: border-box; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .display { font-family: 'Futura', 'Century Gothic', 'Jost', sans-serif; letter-spacing: 0.01em; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: rgba(158,118,42,0.35); border-radius: 4px; }
        input, select, textarea {
          background: rgba(255,255,255,0.6); border: 1px solid rgba(158,118,42,0.30); color: #152238;
          border-radius: 6px; padding: 8px 10px; font-family: 'IBM Plex Mono', monospace;
          font-size: 13px; outline: none; width: 100%;
        }
        input:focus, select:focus, textarea:focus { border-color: #C6A15A; }
        label { font-size: 11px; color: #152238; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; display: block; font-family: 'Futura', 'Century Gothic', 'Jost', sans-serif; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #C6A15A; outline-offset: 2px; }
        .tabbtn { transition: color .15s ease, border-color .15s ease; }
        .luxury-shimmer {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 46%, rgba(231,199,124,0.40) 50%, transparent 66%);
          background-size: 260% 260%;
          animation: shimmerMove 10s ease-in-out infinite;
          mix-blend-mode: soft-light;
        }
        .luxury-sparkle {
          position: absolute; border-radius: 50%; pointer-events: none; z-index: 0;
          background: radial-gradient(circle, rgba(255,246,214,0.95) 0%, rgba(184,134,46,0.5) 55%, transparent 75%);
          animation: twinkle 3.6s ease-in-out infinite;
        }
        @keyframes shimmerMove {
          0% { background-position: -60% -60%; }
          50% { background-position: 160% 160%; }
          100% { background-position: -60% -60%; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.7); }
          50% { opacity: 0.9; transform: scale(1); }
        }
      `}</style>
      <div className="luxury-shimmer" />
      <div className="luxury-sparkle" style={{ width: 6, height: 6, top: "8%", left: "22%", animationDelay: "0s" }} />
      <div className="luxury-sparkle" style={{ width: 4, height: 4, top: "14%", left: "68%", animationDelay: "1.2s" }} />
      <div className="luxury-sparkle" style={{ width: 5, height: 5, top: "40%", left: "92%", animationDelay: "2.1s" }} />
      <div className="luxury-sparkle" style={{ width: 4, height: 4, top: "75%", left: "6%", animationDelay: "0.6s" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "24px 28px 20px", borderBottom: "1px solid rgba(158,118,42,0.25)"
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            background: "#152238", borderRadius: 8, padding: "10px 24px",
            boxShadow: "0 2px 6px rgba(21,34,56,0.25), inset 0 1px 0 rgba(255,255,255,0.06)"
          }}>
            <svg width={34} height={34} viewBox="0 0 40 40">
              <rect x={5} y={22} width={5} height={11} rx={1} fill="#8A6220" />
              <rect x={13} y={15} width={5} height={18} rx={1} fill="#C6A15A" />
              <rect x={21} y={9} width={5} height={24} rx={1} fill="#D9BC7C" />
              <path d="M21 9 L31 4 M31 4 L26 4.5 M31 4 L30.5 9" stroke="#D9BC7C" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <div>
              <div style={{
                fontFamily: "'Kaushan Script', cursive", fontWeight: 400, fontSize: 34, letterSpacing: "0.01em",
                color: "#D9BC7C", textShadow: "0 1px 0 rgba(0,0,0,0.3)", lineHeight: 1
              }}>
                Belief
              </div>
              <div style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9.5, fontWeight: 500, letterSpacing: "0.18em",
                color: "#9C8862", marginTop: 3, textTransform: "uppercase"
              }}>
                trade with conviction
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportJSON} title="Download a full JSON backup" style={{
              display: "flex", alignItems: "center", gap: 5, background: "transparent",
              border: "1px solid rgba(158,118,42,0.4)", color: "#152238", borderRadius: 6,
              padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer"
            }}><Download size={12} /> JSON</button>
            <button onClick={exportExcel} title="Download an Excel backup" style={{
              display: "flex", alignItems: "center", gap: 5, background: "transparent",
              border: "1px solid rgba(158,118,42,0.4)", color: "#152238", borderRadius: 6,
              padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer"
            }}><Download size={12} /> Excel</button>
          </div>
          <span className="mono" style={{ fontSize: 11, color: "#152238" }}>
            {saveState === "saving" ? "saving…" : saveState === "saved" ? "saved" : ""}
          </span>
        </div>
      </div>
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #D9B45F 20%, #C6A15A 50%, #D9B45F 80%, transparent)", opacity: 0.55 }} />

      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 28px",
        borderBottom: "1px solid #E7D8B4", background: "rgba(184,134,47,0.06)"
      }}>
        <span style={{ color: "#C6A15A", fontSize: 13, flexShrink: 0 }}>✦</span>
        <span style={{ fontSize: 9.5, letterSpacing: "0.15em", color: "#152238", fontWeight: 600, flexShrink: 0 }}>THOUGHT FOR TODAY</span>
        <span className="display" style={{ fontSize: 12.5, fontStyle: "italic", color: "#152238" }}>{dailyThought}</span>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 1,
        background: "#0E1830", borderBottom: "2px solid #C6A15A"
      }}>
        <StatCell label="Current Capital" value={fmtINR(stats.currentCapital)} icon={<Wallet size={14} />} />
        <StatCell label="Today's P&L" value={fmtSigned(stats.todayPnl)} color={pnlColor(stats.todayPnl)} icon={stats.todayPnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} />
        <StatCell label="Overall P&L" value={fmtSigned(stats.totalNet)} color={pnlColor(stats.totalNet)} icon={<IndianRupee size={14} />} />
        <StatCell label="Overall ROI" value={fmtPct(stats.overallROI)} color={pnlColor(stats.overallROI)} icon={<Target size={14} />} />
        <StatCell label="Discipline" value={`${stats.discipline.toFixed(0)}%`} color={stats.discipline >= 80 ? "#1E7A55" : stats.discipline >= 50 ? "#C6A15A" : "#A62639"} icon={<ShieldCheck size={14} />} />
        <StatCell label="Streak" value={`${stats.streak || 0} ${stats.streakType === "loss" ? "loss" : "win"} day${stats.streak === 1 ? "" : "s"}`} color={stats.streakType === "loss" ? "#A62639" : "#1E7A55"} icon={<Flame size={14} />} />
      </div>

      <div style={{ display: "flex", gap: 4, padding: "14px 28px 0", borderBottom: "1px solid #E7D8B4" }}>
        {[
          ["overview", "Overview"],
          ["trades", "Trade Log"],
          ["capital", "Capital & Withdrawals"],
          ["investments", "Equity Investments"],
          ["discipline", "Discipline"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className="tabbtn display" style={{
            background: "transparent", border: "none", borderBottom: tab === key ? "2px solid #C6A15A" : "2px solid transparent",
            color: tab === key ? "#152238" : "#8F7A5E", padding: "8px 14px 12px", fontSize: 13.5, fontWeight: 600, cursor: "pointer"
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 28 }}>
        {tab === "overview" && <OverviewTab stats={stats} pnlColor={pnlColor} targetPct={targetPct} setTargetPct={setTargetPct} />}
        {tab === "trades" && (
          <TradesTab
            trades={tradesSorted} showForm={showTradeForm} setShowForm={setShowTradeForm}
            draft={tradeDraft} setDraft={setTradeDraft} addTrade={addTrade} deleteTrade={deleteTrade}
            pnlColor={pnlColor} quickWithdraw={quickWithdraw}
            editingTradeId={editingTradeId} startEditTrade={startEditTrade}
            openNewTradeForm={openNewTradeForm} cancelTradeForm={cancelTradeForm}
          />
        )}
        {tab === "capital" && (
          <CapitalTab
            startingCapital={startingCapital} setStartingCapital={setStartingCapital}
            ledger={ledger} showForm={showLedgerForm} setShowForm={setShowLedgerForm}
            draft={ledgerDraft} setDraft={setLedgerDraft} addLedger={addLedger} deleteLedger={deleteLedger}
            stats={stats}
            editingLedgerId={editingLedgerId} startEditLedger={startEditLedger}
            openNewLedgerForm={openNewLedgerForm} cancelLedgerForm={cancelLedgerForm}
          />
        )}
        {tab === "investments" && (
          <InvestmentsTab
            holdings={holdings} showForm={showHoldingForm} setShowForm={setShowHoldingForm}
            draft={holdingDraft} setDraft={setHoldingDraft} addHolding={addHolding} deleteHolding={deleteHolding}
            updateHoldingPrice={updateHoldingPrice} stats={stats} pnlColor={pnlColor}
            editingHoldingId={editingHoldingId} startEditHolding={startEditHolding}
            openNewHoldingForm={openNewHoldingForm} cancelHoldingForm={cancelHoldingForm}
          />
        )}
        {tab === "discipline" && <DisciplineTab trades={tradesSorted} stats={stats} />}
      </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, color = "#D9BC7C", icon }) {
  return (
    <div style={{ background: "#152238", padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9C8862", marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      </div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color, textShadow: "0 1px 0 rgba(0,0,0,0.25)" }}>{value}</div>
    </div>
  );
}

function Card({ title, children, style, right }) {
  return (
    <div style={{ background: "#FFFCF5", border: "1px solid #E7D8B4", borderRadius: 10, padding: 18, ...style }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          {title && <div className="display" style={{ fontSize: 12.5, fontWeight: 600, color: "#152238", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</div>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function OverviewTab({ stats, pnlColor, targetPct, setTargetPct }) {
  const dailyTargetAmount = stats.currentCapital * (targetPct / 100);
  const stopLossLow = dailyTargetAmount * 1;
  const stopLossHigh = dailyTargetAmount * 1.5;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        <Card title="Equity Curve" right={
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9.5, color: "#8F7A5E", textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg Daily P&L</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: pnlColor(stats.avgDailyPnl) }}>{fmtSigned(stats.avgDailyPnl)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9.5, color: "#8F7A5E", textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg Daily ROI</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: pnlColor(stats.avgDailyROI) }}>{fmtPct(stats.avgDailyROI)}</div>
            </div>
          </div>
        }>
          {stats.curve.length === 0 ? (
            <EmptyState text="Log a trade to start plotting your equity curve." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.curve}>
                <defs>
                  <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C6A15A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C6A15A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E7D8B4" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#152238", fontSize: 10 }} axisLine={{ stroke: "#E7D8B4" }} tickLine={false} tickFormatter={fmtDate} />
                <YAxis tick={{ fill: "#152238", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={55} />
                <Tooltip contentStyle={{ background: "#FBF6EC", border: "1px solid #C9B58C", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#152238" }} labelFormatter={fmtDate} formatter={(v) => [fmtINR(v), "Equity"]} />
                <Area type="monotone" dataKey="equity" stroke="#C6A15A" strokeWidth={2} fill="url(#eq)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Discipline Score">
          <DisciplineRing value={stats.discipline} />
        </Card>
      </div>

      <Card title="Daily Target & Stop-Loss" right={
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10.5, color: "#8F7A5E" }}>Target</span>
          <input
            type="number" step="0.05" value={targetPct}
            onChange={e => setTargetPct(Number(e.target.value) || 0)}
            style={{ width: 56, padding: "4px 6px", fontSize: 12, textAlign: "right" }}
          />
          <span style={{ fontSize: 10.5, color: "#8F7A5E" }}>%</span>
        </div>
      }>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, color: "#8F7A5E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Daily Target ({targetPct}% of capital)</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#1E7A55" }}>{fmtINR(dailyTargetAmount)}</div>
            <div style={{ fontSize: 11, color: "#8F7A5E", marginTop: 4 }}>Based on current capital of {fmtINR(stats.currentCapital)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "#8F7A5E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Suggested Stop-Loss</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#A62639" }}>{fmtINR(stopLossLow)} – {fmtINR(stopLossHigh)}</div>
            <div style={{ fontSize: 11, color: "#8F7A5E", marginTop: 4 }}>1x–1.5x of daily target — a common heuristic, not personalized advice</div>
          </div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #E7D8B4", fontSize: 11.5, color: "#8F7A5E", lineHeight: 1.6 }}>
          This is a simple rule-of-thumb calculator, not a recommendation. Your ideal stop-loss depends on your actual win rate, avg win, and avg loss — check the Performance card and adjust the target% above to match your own risk appetite.
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card title="Capital Appreciation & Downside (from start)">
          <Metric label="Starting Capital" value={fmtINR(stats.currentCapital - stats.capitalAppreciation)} />
          <Metric label="Capital Appreciation" value={`${fmtSigned(stats.capitalAppreciation)} (${fmtPct(stats.capitalAppreciationPct)})`} color={pnlColor(stats.capitalAppreciation)} />
          <Metric label="Max Downside from Start" value={stats.downsideFromStart < 0 ? `${fmtSigned(stats.downsideFromStart)} (${fmtPct(stats.downsideFromStartPct)})` : "None yet"} color={stats.downsideFromStart < 0 ? "#A62639" : "#1E7A55"} />
          <div style={{ marginTop: 10, fontSize: 11, color: "#8F7A5E", lineHeight: 1.5 }}>
            Downside shows how far your capital dipped below where you started, at its worst point — separate from peak-to-trough Max Drawdown in the Performance card.
          </div>
        </Card>
        <Card title="Profit vs Withdrawal Health">
          <Metric label="Total Net Profit" value={fmtSigned(stats.totalNet)} color={pnlColor(stats.totalNet)} />
          <Metric label="Total Withdrawn" value={fmtINR(stats.withdrawals)} color="#A62639" />
          <Metric
            label={stats.profitWithdrawalDeficit < 0 ? "Withdrawal Deficit (into principal)" : "Profit Retained"}
            value={fmtSigned(stats.profitWithdrawalDeficit)}
            color={pnlColor(stats.profitWithdrawalDeficit)}
          />
          <div style={{ marginTop: 10, fontSize: 11, color: "#8F7A5E", lineHeight: 1.5 }}>
            {stats.profitWithdrawalDeficit < 0
              ? "You've withdrawn more than you've earned in net profit — the difference is coming out of your original capital."
              : "You've withdrawn less than you've earned — your withdrawals are fully covered by trading profit."}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        <Card title="Monthly P&L">
          {stats.monthly.length === 0 ? <EmptyState text="No trades yet." /> : (
            <ResponsiveContainer width="100%" height={195}>
              <BarChart data={stats.monthly} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E7D8B4" vertical={false} />
                <XAxis dataKey="month" height={38} tick={(props) => <MonthTick {...props} data={stats.monthly} />} axisLine={{ stroke: "#E7D8B4" }} tickLine={false} interval={0} />
                <YAxis tick={{ fill: "#152238", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={50} />
                <ReferenceLine y={0} stroke="#C9B58C" />
                <Tooltip contentStyle={{ background: "#FBF6EC", border: "1px solid #C9B58C", borderRadius: 8, fontSize: 12 }} labelFormatter={(m) => formatMonthLabel(m)} formatter={(v) => [fmtINR(v), "P&L"]} />
                <Bar dataKey="pnl" radius={[3, 3, 3, 3]}>
                  {stats.monthly.map((m, i) => <Cell key={i} fill={m.pnl >= 0 ? "#1E7A55" : "#A62639"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Win / Loss Split">
          {stats.tradeCount === 0 ? <EmptyState text="No trades yet." /> : (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={[{ name: "Wins", value: stats.winCount }, { name: "Losses", value: stats.lossCount }]} dataKey="value" innerRadius={35} outerRadius={55} startAngle={90} endAngle={-270}>
                    <Cell fill="#1E7A55" />
                    <Cell fill="#A62639" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mono" style={{ fontSize: 13 }}>
                <div style={{ color: "#1E7A55", marginBottom: 6 }}>{stats.winCount} wins</div>
                <div style={{ color: "#A62639", marginBottom: 6 }}>{stats.lossCount} losses</div>
                <div style={{ color: "#152238" }}>{stats.winRate.toFixed(1)}% win rate</div>
              </div>
            </div>
          )}
        </Card>

        <Card title="Performance">
          <Metric label="Consistency (profitable days)" value={`${stats.consistency.toFixed(0)}%`} />
          <Metric label="Avg win" value={fmtINR(stats.avgWin)} color="#1E7A55" />
          <Metric label="Avg loss" value={fmtINR(stats.avgLoss)} color="#A62639" />
          <Metric label="Profit factor" value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)} />
          <Metric label="Max drawdown" value={`${stats.maxDD.toFixed(1)}%`} color="#A62639" />
        </Card>
      </div>

      <Card title="Weekly P&L (last 12 weeks)">
        {stats.weekly.length === 0 ? <EmptyState text="No trades yet." /> : (
          <ResponsiveContainer width="100%" height={195}>
            <BarChart data={stats.weekly} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#E7D8B4" vertical={false} />
              <XAxis dataKey="week" height={38} tick={(props) => <WeekTick {...props} data={stats.weekly} />} axisLine={{ stroke: "#E7D8B4" }} tickLine={false} interval={0} />
              <YAxis tick={{ fill: "#152238", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={50} />
              <ReferenceLine y={0} stroke="#C9B58C" />
              <Tooltip contentStyle={{ background: "#FBF6EC", border: "1px solid #C9B58C", borderRadius: 8, fontSize: 12 }} labelFormatter={(w) => `Week: ${formatWeekLabel(w)}`} formatter={(v) => [fmtINR(v), "P&L"]} />
              <Bar dataKey="pnl" radius={[3, 3, 3, 3]}>
                {stats.weekly.map((w, i) => <Cell key={i} fill={w.pnl >= 0 ? "#1E7A55" : "#A62639"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card title="ROI & Returns">
          <Metric label="Daily ROI %" value={fmtPct(stats.dailyROI)} color={pnlColor(stats.dailyROI)} />
          <Metric label="Monthly ROI %" value={fmtPct(stats.monthlyROI)} color={pnlColor(stats.monthlyROI)} />
          <Metric label="Overall ROI %" value={fmtPct(stats.overallROI)} color={pnlColor(stats.overallROI)} />
          <Metric label="Trading Capital XIRR %" value={fmtPct(stats.tradingXIRR)} color={stats.tradingXIRR == null ? "#152238" : pnlColor(stats.tradingXIRR)} />
        </Card>
        <Card title="Equity Portfolio Snapshot">
          <Metric label="Total Invested" value={fmtINR(stats.holdingsInvested)} />
          <Metric label="Current Value" value={fmtINR(stats.holdingsCurrentValue)} />
          <Metric label="Unrealized P&L" value={fmtSigned(stats.holdingsUnrealized)} color={pnlColor(stats.holdingsUnrealized)} />
          <Metric label="Equity XIRR %" value={fmtPct(stats.equityXIRR)} color={stats.equityXIRR == null ? "#152238" : pnlColor(stats.equityXIRR)} />
        </Card>
      </div>

      <Card title="Strategy Performance">
        {stats.strategyPerf.length === 0 ? <EmptyState text="Log trades to see which strategy performs best for you." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(() => {
              const maxAbs = Math.max(1, ...stats.strategyPerf.map(s => Math.abs(s.net)));
              return stats.strategyPerf.map((s, i) => {
                const barPct = (Math.abs(s.net) / maxAbs) * 100;
                const color = pnlColor(s.net);
                return (
                  <div key={s.strategy}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#152238" }}>
                        {i === 0 && s.net > 0 && <span style={{ color: "#C6A15A", marginRight: 6 }}>★</span>}
                        {s.strategy}
                      </span>
                      <span className="mono" style={{ fontSize: 12.5, color: "#152238" }}>
                        {s.count} trade{s.count === 1 ? "" : "s"} · {s.winRate.toFixed(0)}% win rate
                      </span>
                      <span className="mono" style={{ fontSize: 13.5, fontWeight: 700, color }}>{fmtSigned(s.net)}</span>
                    </div>
                    <div style={{ height: 7, background: "#F0E6CC", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${barPct}%`, height: "100%", background: color, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value, color = "#152238" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #E7D8B4" }}>
      <span style={{ fontSize: 12, color: "#152238" }}>{label}</span>
      <span className="mono" style={{ fontSize: 13, color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function DisciplineRing({ value }) {
  const r = 52, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 80 ? "#1E7A55" : pct >= 50 ? "#C6A15A" : "#A62639";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 220 }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="#E7D8B4" strokeWidth={10} />
        <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} transform="rotate(-90 70 70)" />
        <text x={70} y={65} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="26" fontWeight="700" fill="#152238">{pct.toFixed(0)}%</text>
        <text x={70} y={84} textAnchor="middle" fontFamily="Futura, 'Century Gothic', Jost, sans-serif" fontSize="9" fill="#152238" letterSpacing="0.05em">RULES FOLLOWED</text>
      </svg>
      <div style={{ fontSize: 11, color: "#152238", marginTop: 8, textAlign: "center" }}>
        Across stop-loss, sizing, no-revenge &amp; plan adherence
      </div>
    </div>
  );
}

function formatMonthLabel(m) {
  const d = new Date(`${m}-01T00:00:00`);
  return d.toLocaleString("en-US", { month: "short" });
}

function MonthTick({ x, y, payload, data }) {
  const item = data.find(d => d.month === payload.value);
  const roi = item ? item.roi : 0;
  const roiColor = roi >= 0 ? "#1E7A55" : "#A62639";
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#152238" fontSize={10.5} fontFamily="Futura, 'Century Gothic', Jost, sans-serif">
        {formatMonthLabel(payload.value)}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fill={roiColor} fontSize={9.5} fontFamily="'IBM Plex Mono', monospace" fontWeight={600}>
        {`${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`}
      </text>
    </g>
  );
}

function formatWeekLabel(w) {
  const start = new Date(`${w}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 4); // Friday
  const startDay = start.toLocaleString("en-US", { day: "2-digit" });
  const endDay = end.toLocaleString("en-US", { day: "2-digit" });
  const endMonth = end.toLocaleString("en-US", { month: "short" });
  const startMonth = start.toLocaleString("en-US", { month: "short" });
  return startMonth === endMonth
    ? `${startDay}-${endDay} ${endMonth}`
    : `${startDay} ${startMonth}-${endDay} ${endMonth}`;
}

function WeekTick({ x, y, payload, data }) {
  const item = data.find(d => d.week === payload.value);
  const roi = item ? item.roi : 0;
  const roiColor = roi >= 0 ? "#1E7A55" : "#A62639";
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#152238" fontSize={9.5} fontFamily="Futura, 'Century Gothic', Jost, sans-serif">
        {formatWeekLabel(payload.value)}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fill={roiColor} fontSize={9.5} fontFamily="'IBM Plex Mono', monospace" fontWeight={600}>
        {`${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`}
      </text>
    </g>
  );
}

function EmptyState({ text }) {
  return <div style={{ color: "#152238", fontSize: 12.5, padding: "40px 0", textAlign: "center" }}>{text}</div>;
}

function TradesTab({ trades, showForm, setShowForm, draft, setDraft, addTrade, deleteTrade, pnlColor, quickWithdraw, editingTradeId, startEditTrade, openNewTradeForm, cancelTradeForm }) {
  const net = (Number(draft.gross) || 0) - (Number(draft.charges) || 0);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [wDraft, setWDraft] = useState({ date: todayLocalISO(), amount: "", note: "" });

  const submitWithdraw = () => {
    if (!wDraft.amount) return;
    quickWithdraw(wDraft);
    setWDraft({ date: todayLocalISO(), amount: "", note: "" });
    setShowWithdraw(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="display" style={{ fontSize: 15, fontWeight: 600 }}>Trade Log</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowWithdraw(true)} style={{
            display: "flex", alignItems: "center", gap: 6, background: "transparent", color: "#A62639",
            border: "1px solid #A62639", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}><ArrowDownToLine size={14} /> Log withdrawal</button>
          <button onClick={openNewTradeForm} style={{
            display: "flex", alignItems: "center", gap: 6, background: "#C6A15A", color: "#152238",
            border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}><Plus size={14} /> Log trade</button>
        </div>
      </div>

      {showWithdraw && (
        <Card style={{ marginBottom: 18, borderColor: "#A62639" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="display" style={{ fontSize: 13, fontWeight: 600, color: "#A62639" }}>Log a withdrawal</div>
            <button onClick={() => setShowWithdraw(false)} style={{ background: "none", border: "none", color: "#152238", cursor: "pointer" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div><label>Date</label><input type="date" value={wDraft.date} onChange={e => setWDraft({ ...wDraft, date: e.target.value })} /></div>
            <div><label>Amount (₹)</label><input type="number" value={wDraft.amount} onChange={e => setWDraft({ ...wDraft, amount: e.target.value })} placeholder="0" /></div>
            <div><label>Note</label><input value={wDraft.note} onChange={e => setWDraft({ ...wDraft, note: e.target.value })} placeholder="optional" /></div>
          </div>
          <button onClick={submitWithdraw} style={{ marginTop: 16, background: "#A62639", color: "#FFFCF5", border: "none", borderRadius: 6, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Save withdrawal</button>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "#152238" }}>This goes straight into your Capital Ledger and is deducted from Current Capital — no need to switch tabs.</div>
        </Card>
      )}

      {showForm && (
        <Card style={{ marginBottom: 18, borderColor: editingTradeId ? "#C6A15A" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="display" style={{ fontSize: 13, fontWeight: 600, color: editingTradeId ? "#C6A15A" : "#152238" }}>
              {editingTradeId ? "Edit trade entry" : "New trade entry"}
            </div>
            <button onClick={cancelTradeForm} style={{ background: "none", border: "none", color: "#152238", cursor: "pointer" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div><label>Date</label><input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></div>
            <div><label>Index</label>
              <select value={draft.index} onChange={e => setDraft({ ...draft, index: e.target.value })}>
                {INDEX_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>
            <div><label>Strategy</label>
              <select value={draft.strategy} onChange={e => setDraft({ ...draft, strategy: e.target.value })}>
                {STRATEGY_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>
            <div><label>Market Bias</label>
              <select value={draft.bias} onChange={e => setDraft({ ...draft, bias: e.target.value })}>
                {BIAS_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>
            <div><label>Gross P&L (₹)</label><input type="number" placeholder="0" value={draft.gross} onChange={e => setDraft({ ...draft, gross: e.target.value })} /></div>
            <div><label>Charges (₹)</label><input type="number" placeholder="0" value={draft.charges} onChange={e => setDraft({ ...draft, charges: e.target.value })} /></div>
            <div><label>Net P&L</label><div className="mono" style={{ padding: "8px 10px", color: pnlColor(net), fontWeight: 700 }}>{fmtSigned(net)}</div></div>
            <div><label>Notes</label><input value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="optional" /></div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label>Discipline checklist</label>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {RULE_DEFS.map(r => (
                <label key={r.key} style={{ display: "flex", alignItems: "center", gap: 6, textTransform: "none", fontSize: 12.5, color: "#152238", cursor: "pointer" }}>
                  <input type="checkbox" style={{ width: "auto" }} checked={draft.rules[r.key]} onChange={e => setDraft({ ...draft, rules: { ...draft.rules, [r.key]: e.target.checked } })} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <button onClick={addTrade} style={{ marginTop: 16, background: "#1E7A55", color: "#152238", border: "none", borderRadius: 6, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {editingTradeId ? "Update trade" : "Save trade"}
          </button>
        </Card>
      )}

      {trades.length === 0 ? <EmptyState text="No trades logged yet." /> : (
        <div style={{ overflowX: "auto", border: "1px solid #E7D8B4", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#FFFCF5", color: "#152238", textAlign: "left" }}>
                {["Date", "Index", "Strategy", "Bias", "Gross", "Charges", "Net", "Discipline", ""].map(h => (
                  <th key={h} className="display" style={{ padding: "10px 14px", fontWeight: 600, textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...trades].reverse().map(t => {
                const n = (Number(t.gross) || 0) - (Number(t.charges) || 0);
                const checked = RULE_DEFS.filter(r => t.rules?.[r.key]).length;
                const biasColor = t.bias === "Bullish" ? "#1E7A55" : t.bias === "Bearish" ? "#A62639" : "#152238";
                return (
                  <tr key={t.id} style={{ borderTop: "1px solid #E7D8B4" }}>
                    <td className="mono" style={{ padding: "9px 14px" }}>{fmtDate(t.date)}</td>
                    <td style={{ padding: "9px 14px" }}>{t.index}</td>
                    <td style={{ padding: "9px 14px" }}>{t.strategy}</td>
                    <td style={{ padding: "9px 14px", color: biasColor }}>{t.bias || "—"}</td>
                    <td className="mono" style={{ padding: "9px 14px" }}>{fmtSigned(t.gross)}</td>
                    <td className="mono" style={{ padding: "9px 14px", color: "#152238" }}>{fmtINR(t.charges)}</td>
                    <td className="mono" style={{ padding: "9px 14px", color: pnlColor(n), fontWeight: 700 }}>{fmtSigned(n)}</td>
                    <td style={{ padding: "9px 14px", color: checked === 4 ? "#1E7A55" : "#C6A15A" }}>{checked}/4</td>
                    <td style={{ padding: "9px 14px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => startEditTrade(t)} style={{ background: "none", border: "none", color: "#152238", cursor: "pointer" }}><Pencil size={13} /></button>
                        <button onClick={() => deleteTrade(t.id)} style={{ background: "none", border: "none", color: "#152238", cursor: "pointer" }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CapitalTab({ startingCapital, setStartingCapital, ledger, showForm, setShowForm, draft, setDraft, addLedger, deleteLedger, stats, editingLedgerId, startEditLedger, openNewLedgerForm, cancelLedgerForm }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <Card title="Starting Capital">
          <input type="number" className="mono" value={startingCapital} onChange={e => setStartingCapital(Number(e.target.value) || 0)} style={{ fontSize: 16, fontWeight: 700 }} />
        </Card>
        <StatMini label="Total Deposits" value={fmtINR(stats.deposits)} icon={<Wallet size={14} />} color="#1E7A55" />
        <StatMini label="Total Withdrawals" value={fmtINR(stats.withdrawals)} icon={<ArrowDownToLine size={14} />} color="#A62639" />
        <StatMini label="Equity Invested (auto)" value={fmtINR(stats.totalInvestedOut)} icon={<PiggyBank size={14} />} color="#C6A15A" />
      </div>
      <div style={{ fontSize: 11.5, color: "#152238", marginBottom: 20, marginTop: -8 }}>
        Equity Invested pulls automatically from the <b>Equity Investments</b> tab and is already subtracted from Current Capital above.
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="display" style={{ fontSize: 15, fontWeight: 600 }}>Capital Ledger</div>
        <button onClick={openNewLedgerForm} style={{
          display: "flex", alignItems: "center", gap: 6, background: "#C6A15A", color: "#152238",
          border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}><Plus size={14} /> Add entry</button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18, borderColor: editingLedgerId ? "#C6A15A" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="display" style={{ fontSize: 13, fontWeight: 600, color: editingLedgerId ? "#C6A15A" : "#152238" }}>
              {editingLedgerId ? "Edit ledger entry" : "New ledger entry"}
            </div>
            <button onClick={cancelLedgerForm} style={{ background: "none", border: "none", color: "#152238", cursor: "pointer" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div><label>Date</label><input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></div>
            <div><label>Type</label>
              <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}>
                <option>Deposit</option><option>Withdrawal</option>
              </select>
            </div>
            <div><label>Amount (₹)</label><input type="number" value={draft.amount} onChange={e => setDraft({ ...draft, amount: e.target.value })} /></div>
            <div><label>Note</label><input value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="optional" /></div>
          </div>
          <button onClick={addLedger} style={{ marginTop: 16, background: "#1E7A55", color: "#152238", border: "none", borderRadius: 6, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {editingLedgerId ? "Update entry" : "Save entry"}
          </button>
        </Card>
      )}

      {ledger.length === 0 ? <EmptyState text="No deposits or withdrawals logged yet." /> : (
        <div style={{ overflowX: "auto", border: "1px solid #E7D8B4", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#FFFCF5", color: "#152238", textAlign: "left" }}>
                {["Date", "Type", "Amount", "Note", ""].map(h => (
                  <th key={h} className="display" style={{ padding: "10px 14px", fontWeight: 600, textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...ledger].reverse().map(l => (
                <tr key={l.id} style={{ borderTop: "1px solid #E7D8B4" }}>
                  <td className="mono" style={{ padding: "9px 14px" }}>{fmtDate(l.date)}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <span style={{
                      color: l.type === "Deposit" ? "#1E7A55" : l.type === "Withdrawal" ? "#A62639" : "#C6A15A",
                      fontSize: 11.5, fontWeight: 600
                    }}>{l.type}</span>
                  </td>
                  <td className="mono" style={{ padding: "9px 14px" }}>{fmtINR(l.amount)}</td>
                  <td style={{ padding: "9px 14px", color: "#152238" }}>{l.note}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => startEditLedger(l)} style={{ background: "none", border: "none", color: "#152238", cursor: "pointer" }}><Pencil size={13} /></button>
                      <button onClick={() => deleteLedger(l.id)} style={{ background: "none", border: "none", color: "#152238", cursor: "pointer" }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InvestmentsTab({ holdings, showForm, setShowForm, draft, setDraft, addHolding, deleteHolding, updateHoldingPrice, stats, pnlColor, editingHoldingId, startEditHolding, openNewHoldingForm, cancelHoldingForm }) {
  const draftAmount = (Number(draft.qty) || 0) * (Number(draft.buyPrice) || 0);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatMini label="Total Invested" value={fmtINR(stats.holdingsInvested)} icon={<Briefcase size={14} />} color="#C6A15A" />
        <StatMini label="Current Value" value={fmtINR(stats.holdingsCurrentValue)} icon={<Wallet size={14} />} color="#152238" />
        <StatMini label="Unrealized P&L" value={fmtSigned(stats.holdingsUnrealized)} icon={stats.holdingsUnrealized >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} color={pnlColor(stats.holdingsUnrealized)} />
        <StatMini label="Equity XIRR" value={fmtPct(stats.equityXIRR)} icon={<Percent size={14} />} color={stats.equityXIRR == null ? "#152238" : pnlColor(stats.equityXIRR)} />
      </div>
      <div style={{ fontSize: 11.5, color: "#152238", marginBottom: 20, marginTop: -8 }}>
        Money invested here is automatically deducted from your trading Current Capital. Update "Current Price" on each holding whenever you check the market — XIRR recalculates from your buy dates and current value.
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="display" style={{ fontSize: 15, fontWeight: 600 }}>Equity Holdings</div>
        <button onClick={openNewHoldingForm} style={{
          display: "flex", alignItems: "center", gap: 6, background: "#C6A15A", color: "#152238",
          border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}><Plus size={14} /> Add holding</button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18, borderColor: editingHoldingId ? "#C6A15A" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="display" style={{ fontSize: 13, fontWeight: 600, color: editingHoldingId ? "#C6A15A" : "#152238" }}>
              {editingHoldingId ? "Edit equity investment" : "New equity investment"}
            </div>
            <button onClick={cancelHoldingForm} style={{ background: "none", border: "none", color: "#152238", cursor: "pointer" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div><label>Buy Date</label><input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></div>
            <div><label>Stock Name</label><input value={draft.stock} onChange={e => setDraft({ ...draft, stock: e.target.value })} placeholder="e.g. HDFC Bank" /></div>
            <div><label>Quantity</label><input type="number" value={draft.qty} onChange={e => setDraft({ ...draft, qty: e.target.value })} placeholder="0" /></div>
            <div><label>Buy Price (₹)</label><input type="number" value={draft.buyPrice} onChange={e => setDraft({ ...draft, buyPrice: e.target.value })} placeholder="0" /></div>
            <div><label>Current Price (₹, optional)</label><input type="number" value={draft.currentPrice} onChange={e => setDraft({ ...draft, currentPrice: e.target.value })} placeholder="defaults to buy price" /></div>
            <div><label>Total Invested</label><div className="mono" style={{ padding: "8px 10px", fontWeight: 700 }}>{fmtINR(draftAmount)}</div></div>
          </div>
          <button onClick={addHolding} style={{ marginTop: 16, background: "#1E7A55", color: "#152238", border: "none", borderRadius: 6, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {editingHoldingId ? "Update holding" : "Save holding"}
          </button>
        </Card>
      )}

      {holdings.length === 0 ? <EmptyState text="No equity investments logged yet." /> : (
        <div style={{ overflowX: "auto", border: "1px solid #E7D8B4", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#FFFCF5", color: "#152238", textAlign: "left" }}>
                {["Date", "Stock", "Qty", "Buy Price", "Invested", "Current Price", "Current Value", "P&L", "P&L %", ""].map(h => (
                  <th key={h} className="display" style={{ padding: "10px 14px", fontWeight: 600, textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...holdings].reverse().map(h => {
                const qty = Number(h.qty) || 0;
                const buy = Number(h.buyPrice) || 0;
                const cp = h.currentPrice !== "" && h.currentPrice != null ? Number(h.currentPrice) : buy;
                const invested = qty * buy;
                const curVal = qty * cp;
                const pnl = curVal - invested;
                const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                return (
                  <tr key={h.id} style={{ borderTop: "1px solid #E7D8B4" }}>
                    <td className="mono" style={{ padding: "9px 14px" }}>{fmtDate(h.date)}</td>
                    <td style={{ padding: "9px 14px", fontWeight: 600 }}>{h.stock || "—"}</td>
                    <td className="mono" style={{ padding: "9px 14px" }}>{qty}</td>
                    <td className="mono" style={{ padding: "9px 14px", color: "#152238" }}>{fmtINR(buy)}</td>
                    <td className="mono" style={{ padding: "9px 14px" }}>{fmtINR(invested)}</td>
                    <td style={{ padding: "9px 14px" }}>
                      <input type="number" value={h.currentPrice} placeholder={String(buy)} onChange={e => updateHoldingPrice(h.id, e.target.value)} style={{ width: 90, padding: "5px 8px", fontSize: 12 }} />
                    </td>
                    <td className="mono" style={{ padding: "9px 14px" }}>{fmtINR(curVal)}</td>
                    <td className="mono" style={{ padding: "9px 14px", color: pnlColor(pnl), fontWeight: 700 }}>{fmtSigned(pnl)}</td>
                    <td className="mono" style={{ padding: "9px 14px", color: pnlColor(pnlPct) }}>{fmtPct(pnlPct)}</td>
                    <td style={{ padding: "9px 14px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => startEditHolding(h)} style={{ background: "none", border: "none", color: "#152238", cursor: "pointer" }}><Pencil size={13} /></button>
                        <button onClick={() => deleteHolding(h.id)} style={{ background: "none", border: "none", color: "#152238", cursor: "pointer" }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value, icon, color }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#152238", marginBottom: 8 }}>
        {icon}<span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
    </Card>
  );
}

function DisciplineTab({ trades, stats }) {
  const perRule = RULE_DEFS.map(r => {
    const total = trades.length;
    const checked = trades.filter(t => t.rules?.[r.key]).length;
    return { ...r, pct: total ? (checked / total) * 100 : 100, checked, total };
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18 }}>
      <Card title="Overall Discipline">
        <DisciplineRing value={stats.discipline} />
      </Card>
      <Card title="Rule-by-rule adherence">
        {trades.length === 0 ? <EmptyState text="Log trades with the discipline checklist to see a breakdown here." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {perRule.map(r => (
              <div key={r.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
                  <span style={{ color: "#152238" }}>{r.label}</span>
                  <span className="mono" style={{ color: r.pct >= 80 ? "#1E7A55" : r.pct >= 50 ? "#C6A15A" : "#A62639" }}>{r.checked}/{r.total} · {r.pct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: "#E7D8B4", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${r.pct}%`, height: "100%", background: r.pct >= 80 ? "#1E7A55" : r.pct >= 50 ? "#C6A15A" : "#A62639" }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #E7D8B4", fontSize: 12, color: "#152238", lineHeight: 1.6 }}>
          Discipline is measured per trade against four checks — stop-loss respected, position sizing followed, no revenge trading, and entry/exit per plan. Consistency (on the Overview tab) tracks the share of trading days that closed profitable, a separate measure of steadiness over time.
        </div>
      </Card>
    </div>
  );
}
