import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip
} from "recharts";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus, Pencil, Trash2,
  Download, Filter, Search, Calendar, CheckCircle2, AlertTriangle, ShieldCheck,
  Building2, Banknote, Sparkles, PieChart as PieIcon, RefreshCw, X
} from "lucide-react";
import * as XLSX from "xlsx";

const DEFAULT_ACCOUNTS = {
  bank1: { id: "bank1", name: "Primary Bank 1", openingBalance: 150000, color: "var(--color-win-text)" },
  bank2: { id: "bank2", name: "Primary Bank 2", openingBalance: 100000, color: "var(--color-gold)" },
  cash: { id: "cash", name: "Cash in Hand", openingBalance: 25000, color: "var(--color-info-text)" },
};

const DEFAULT_CATEGORIES = [
  // Expense Categories
  { id: "housing", name: "Housing & Utilities", budget: 30000, type: "expense", emoji: "🏠" },
  { id: "food", name: "Food & Groceries", budget: 18000, type: "expense", emoji: "🥗" },
  { id: "transport", name: "Transportation & Fuel", budget: 8000, type: "expense", emoji: "🚗" },
  { id: "fitness", name: "Fitness & Cricket", budget: 6000, type: "expense", emoji: "🏏" },
  { id: "trading_overheads", name: "Trading Tools & Data", budget: 5000, type: "expense", emoji: "💻" },
  { id: "lifestyle", name: "Lifestyle & Dining", budget: 12000, type: "expense", emoji: "✨" },
  { id: "health", name: "Health & Medical", budget: 5000, type: "expense", emoji: "💊" },
  { id: "shopping", name: "Shopping & Personal", budget: 10000, type: "expense", emoji: "🛍️" },

  // Income Categories
  { id: "trading_profit", name: "Trading Profits", budget: 0, type: "income", emoji: "📈" },
  { id: "salary_business", name: "Salary / Business", budget: 0, type: "income", emoji: "💼" },
  { id: "dividends", name: "Dividends & Returns", budget: 0, type: "income", emoji: "💰" },
  { id: "other_income", name: "Other Inflows", budget: 0, type: "income", emoji: "🪙" },
];

const EMOJI_GROUPS = {
  "Finance": ["📈", "💰", "💵", "🪙", "💳", "🏦", "💼", "💎", "📊", "🎯", "🚀", "🧾", "📉"],
  "Home & Food": ["🏠", "🛒", "🥗", "☕", "🍽️", "🍕", "🥦", "🍎", "💡", "🔌", "🛋️", "🧹", "🚿"],
  "Transit": ["🚗", "⛽", "🚕", "🏍️", "✈️", "🚆", "🛳️", "🚲", "🧳", "🗺️", "🏎️", "🅿️"],
  "Fitness & Health": ["🏏", "🏋️", "🧘", "💊", "🩺", "🏃", "⚽", "🎾", "🥊", "🚴", "🏥", "🥛"],
  "Tech & Tools": ["💻", "🖥️", "📱", "⚡", "🤖", "🔒", "🎧", "🎮", "📷", "📡", "🌐", "⌨️"],
  "Lifestyle": ["✨", "🛍️", "🎬", "🎵", "🎉", "🎁", "👔", "👗", "🕶️", "🍻", "🏖️", "🌴", "📚"],
};

export default function BudgetPlannerTab({ trades = [], todayPnl = 0, currentCapital = 0 }) {
  // 1. Persistent State
  const [accounts, setAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem("belief_budget_accounts_v1");
      return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("belief_budget_categories_v1");
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem("belief_budget_tx_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [allocations, setAllocations] = useState(() => {
    try {
      const saved = localStorage.getItem("belief_budget_allocations_v1");
      return saved ? JSON.parse(saved) : { warChestPct: 45, equityPct: 35, emergencyPct: 20 };
    } catch {
      return { warChestPct: 45, equityPct: 35, emergencyPct: 20 };
    }
  });

  // Filters & Controls
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [budgetViewMode, setBudgetViewMode] = useState("monthly"); // "monthly" | "annual"

  // Modals State
  const [activeModal, setActiveModal] = useState(null); // 'income' | 'expense' | 'transfer' | 'category' | 'edit_account'
  const [editAccountTarget, setEditAccountTarget] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form Fields
  const [formType, setFormType] = useState("expense");
  const [formCategory, setFormCategory] = useState("");
  const [formAccount, setFormAccount] = useState("bank1");
  const [formTargetAccount, setFormTargetAccount] = useState("cash");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formNote, setFormNote] = useState("");

  // Category Form Fields (Create & Edit)
  const [editingCategoryId, setEditingCategoryId] = useState(null); // null = new, id = edit
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState("expense");
  const [catMonthlyBudget, setCatMonthlyBudget] = useState("");
  const [catAnnualBudget, setCatAnnualBudget] = useState("");
  const [catEmoji, setCatEmoji] = useState("🏷️");
  const [selectedEmojiGroup, setSelectedEmojiGroup] = useState("Finance");

  // Account Edit Form Fields
  const [accName, setAccName] = useState("");
  const [accOpening, setAccOpening] = useState("");

  // Save to LocalStorage on updates
  useEffect(() => {
    localStorage.setItem("belief_budget_accounts_v1", JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem("belief_budget_categories_v1", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("belief_budget_tx_v1", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("belief_budget_allocations_v1", JSON.stringify(allocations));
  }, [allocations]);

  // Compute Live Account Balances across all time
  const accountBalances = useMemo(() => {
    const balances = {
      bank1: Number(accounts.bank1?.openingBalance || 0),
      bank2: Number(accounts.bank2?.openingBalance || 0),
      cash: Number(accounts.cash?.openingBalance || 0),
    };

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "income") {
        if (balances[tx.accountId] !== undefined) {
          balances[tx.accountId] += amt;
        }
      } else if (tx.type === "expense") {
        if (balances[tx.accountId] !== undefined) {
          balances[tx.accountId] -= amt;
        }
      } else if (tx.type === "transfer") {
        if (balances[tx.accountId] !== undefined) {
          balances[tx.accountId] -= amt;
        }
        if (balances[tx.targetAccountId] !== undefined) {
          balances[tx.targetAccountId] += amt;
        }
      }
    });

    const totalLiquid = balances.bank1 + balances.bank2 + balances.cash;
    return { ...balances, totalLiquid };
  }, [accounts, transactions]);

  // Filter Transactions by Selected Month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!selectedMonth) return true;
      return tx.date.startsWith(selectedMonth);
    });
  }, [transactions, selectedMonth]);

  // Compute Monthly Financial Aggregates
  const monthlyStats = useMemo(() => {
    let totalInflow = 0;
    let totalExpense = 0;
    const categorySpending = {};

    monthlyTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "income") {
        totalInflow += amt;
      } else if (tx.type === "expense") {
        totalExpense += amt;
        categorySpending[tx.categoryId] = (categorySpending[tx.categoryId] || 0) + amt;
      }
    });

    const netSurplus = totalInflow - totalExpense;
    const surplusPct = totalInflow > 0 ? (netSurplus / totalInflow) * 100 : 0;

    // Wealth Compounding Donut breakdown from surplus (or zero if deficit)
    const investableSurplus = Math.max(0, netSurplus);
    const warChest = Math.round(investableSurplus * (allocations.warChestPct / 100));
    const equityPortfolio = Math.round(investableSurplus * (allocations.equityPct / 100));
    const emergencyBuffer = Math.round(investableSurplus * (allocations.emergencyPct / 100));

    return {
      totalInflow,
      totalExpense,
      netSurplus,
      surplusPct,
      categorySpending,
      warChest,
      equityPortfolio,
      emergencyBuffer,
    };
  }, [monthlyTransactions, allocations]);

  // Filtered transactions for the ledger table
  const filteredLedger = useMemo(() => {
    return monthlyTransactions.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const noteMatch = tx.note?.toLowerCase().includes(q);
        const cat = categories.find((c) => c.id === tx.categoryId);
        const catMatch = cat?.name?.toLowerCase().includes(q);
        if (!noteMatch && !catMatch) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [monthlyTransactions, typeFilter, searchQuery, categories]);

  // Handlers for Adding Transactions
  const handleSaveTransaction = (e) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) return;

    const newTx = {
      id: "tx_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      date: formDate,
      type: formType,
      categoryId: formType === "transfer" ? "transfer" : formCategory || (formType === "income" ? "other_income" : "lifestyle"),
      amount: amt,
      accountId: formAccount,
      targetAccountId: formType === "transfer" ? formTargetAccount : null,
      note: formNote.trim(),
    };

    setTransactions((prev) => [newTx, ...prev]);
    setActiveModal(null);
    resetForm();
  };

  const resetForm = () => {
    setFormAmount("");
    setFormNote("");
    setFormCategory("");
    setFormDate(new Date().toISOString().split("T")[0]);
  };

  // Handler for Account Calibration / Renaming
  const openEditAccount = (accKey) => {
    setEditAccountTarget(accKey);
    setAccName(accounts[accKey]?.name || "");
    setAccOpening(String(accounts[accKey]?.openingBalance || 0));
    setActiveModal("edit_account");
  };

  const handleSaveAccountEdit = (e) => {
    e.preventDefault();
    if (!editAccountTarget) return;

    setAccounts((prev) => ({
      ...prev,
      [editAccountTarget]: {
        ...prev[editAccountTarget],
        name: accName.trim() || prev[editAccountTarget].name,
        openingBalance: parseFloat(accOpening) || 0,
      },
    }));
    setActiveModal(null);
  };

  // Bi-directional Auto-Division Budget Handlers
  const handleMonthlyBudgetChange = (val) => {
    setCatMonthlyBudget(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setCatAnnualBudget(String(Math.round(num * 12)));
    } else if (val === "") {
      setCatAnnualBudget("");
    }
  };

  const handleAnnualBudgetChange = (val) => {
    setCatAnnualBudget(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setCatMonthlyBudget(String(Math.round(num / 12)));
    } else if (val === "") {
      setCatMonthlyBudget("");
    }
  };

  // Open modal for Creating New Category
  const openNewCategoryModal = (type = "expense") => {
    setEditingCategoryId(null);
    setCatName("");
    setCatType(type);
    setCatMonthlyBudget("");
    setCatAnnualBudget("");
    setCatEmoji(type === "income" ? "💰" : "🏷️");
    setActiveModal("category");
  };

  // Open modal for Editing Any Category (Predefined or Custom)
  const openEditCategoryModal = (cat) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatType(cat.type || "expense");
    const monthly = cat.budget || 0;
    setCatMonthlyBudget(monthly > 0 ? String(monthly) : "");
    setCatAnnualBudget(monthly > 0 ? String(monthly * 12) : "");
    setCatEmoji(cat.emoji || "🏷️");
    setActiveModal("category");
  };

  // Save Category (Create or Edit)
  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const monthlyBudget = parseFloat(catMonthlyBudget) || 0;

    if (editingCategoryId) {
      // Update existing category (predefined or custom)
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategoryId
            ? {
                ...c,
                name: catName.trim(),
                type: catType,
                budget: monthlyBudget,
                emoji: catEmoji.trim() || "🏷️",
              }
            : c
        )
      );
    } else {
      // Create new category
      const newCat = {
        id: "cat_" + Date.now(),
        name: catName.trim(),
        type: catType,
        budget: monthlyBudget,
        emoji: catEmoji.trim() || (catType === "income" ? "💰" : "🏷️"),
      };
      setCategories((prev) => [...prev, newCat]);
    }

    setActiveModal(null);
    setEditingCategoryId(null);
    setCatName("");
    setCatMonthlyBudget("");
    setCatAnnualBudget("");
  };

  // Delete Category
  const handleDeleteCategory = (catId) => {
    const cat = categories.find((c) => c.id === catId);
    if (window.confirm(`Delete category "${cat?.name || "this category"}"? Existing ledger transactions will retain their records.`)) {
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      if (editingCategoryId === catId) {
        setActiveModal(null);
        setEditingCategoryId(null);
      }
    }
  };

  // Reset Categories to Initial Defaults
  const handleResetCategories = () => {
    if (window.confirm("Reset all expense and income categories back to default values?")) {
      setCategories(DEFAULT_CATEGORIES);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setDeleteConfirmId(null);
  };

  // 1-Click Sync from Closed Trading P&L
  const handleSyncTradingProfit = () => {
    // Calculate total net realized profit in current month from trades
    const thisMonthTrades = trades.filter((t) => t.date && t.date.startsWith(selectedMonth));
    const profitSum = thisMonthTrades.reduce((acc, t) => {
      const net = (parseFloat(t.gross) || 0) - (parseFloat(t.charges) || 0);
      return acc + net;
    }, 0);

    if (profitSum === 0) {
      alert(`No closed trades found for ${selectedMonth}. Log trades in Trade Log first.`);
      return;
    }

    setFormType("income");
    setFormCategory("trading_profit");
    setFormAccount("bank1");
    setFormAmount(String(Math.abs(Math.round(profitSum))));
    setFormNote(`Monthly Realized Trading P&L (${thisMonthTrades.length} trades)`);
    setActiveModal("income");
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = monthlyTransactions.map((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      return {
        Date: tx.date,
        Type: tx.type.toUpperCase(),
        Category: tx.type === "transfer" ? "Inter-Account Transfer" : cat?.name || tx.categoryId,
        Amount: tx.amount,
        "Source Account": accounts[tx.accountId]?.name || tx.accountId,
        "Destination Account": tx.targetAccountId ? accounts[tx.targetAccountId]?.name : "—",
        Note: tx.note || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Budget");
    XLSX.writeFile(wb, `Bharat_Budget_${selectedMonth}.xlsx`);
  };

  const fmtINR = (val) => "₹" + Math.abs(val || 0).toLocaleString("en-IN");
  const fmtSigned = (val) => (val >= 0 ? "+" : "-") + "₹" + Math.abs(val || 0).toLocaleString("en-IN");

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  const totalMonthlyBudget = useMemo(() => {
    return expenseCategories.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
  }, [expenseCategories]);
  const totalAnnualBudget = totalMonthlyBudget * 12;

  // Donut Chart Data
  const donutData = [
    { name: "Trading War Chest (45%)", value: monthlyStats.warChest || 1, color: "var(--color-gold)" },
    { name: "Equity Portfolio (35%)", value: monthlyStats.equityPortfolio || 1, color: "var(--color-win-text)" },
    { name: "Emergency Buffer (20%)", value: monthlyStats.emergencyBuffer || 1, color: "var(--color-info)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. Header & Month Navigator Bar */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🏦</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
              Budget Planner & Sovereign Capital Allocator
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 650,
                padding: "2px 8px",
                borderRadius: 20,
                background: "var(--color-gold-soft)",
                color: "var(--color-gold)",
                border: "1px solid var(--color-gold-border)",
              }}
            >
              2 BANKS + CASH LIQUID TRACKER
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            Control monthly burn, manage bank liquidity, and partition trading surplus into the ₹20 Crore wealth engine
          </div>
        </div>

        {/* Month Selector & Quick Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-elevated)", padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
            <Calendar size={13} color="var(--color-gold)" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-main)",
                fontSize: 12.5,
                fontWeight: 650,
                fontFamily: "var(--font-mono)",
                padding: 0,
                outline: "none",
                minHeight: "auto",
                width: 125,
                cursor: "pointer",
              }}
            />
          </div>

          <button
            onClick={handleSyncTradingProfit}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.14)",
              border: "1px solid var(--color-win-border)",
              color: "var(--color-win-text)",
              fontSize: 11.5,
              fontWeight: 650,
              cursor: "pointer",
            }}
            title="Import realized net trading gains for this month directly from your trade journal"
          >
            <RefreshCw size={12} /> Sync Trading P&L
          </button>

          <button
            onClick={handleExportExcel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              borderRadius: 8,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: 11.5,
              fontWeight: 650,
              cursor: "pointer",
            }}
          >
            <Download size={12} /> Export Excel
          </button>
        </div>
      </div>

      {/* 2. Top Row: 4 Master Telemetry KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        {/* Total Monthly Inflow */}
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 650, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Inflows
            </span>
            <span style={{ color: "var(--color-win-text)", background: "var(--color-win-soft)", padding: 4, borderRadius: 6 }}>
              <ArrowDownLeft size={14} />
            </span>
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--color-win-text)" }}>
            {fmtINR(monthlyStats.totalInflow)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Trading profits + external streams
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 650, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Outflows
            </span>
            <span style={{ color: "var(--color-loss-text)", background: "var(--color-loss-soft)", padding: 4, borderRadius: 6 }}>
              <ArrowUpRight size={14} />
            </span>
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--color-loss-text)" }}>
            {fmtINR(monthlyStats.totalExpense)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Living costs & trading overheads
          </div>
        </div>

        {/* Net Monthly Surplus */}
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 650, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Net Surplus Retention
            </span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 4,
                background: monthlyStats.netSurplus >= 0 ? "var(--color-win-soft)" : "var(--color-loss-soft)",
                color: monthlyStats.netSurplus >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)",
              }}
            >
              {monthlyStats.surplusPct.toFixed(1)}% Retained
            </span>
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: monthlyStats.netSurplus >= 0 ? "var(--color-gold)" : "var(--color-loss-text)" }}>
            {fmtSigned(monthlyStats.netSurplus)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Capital available for wealth allocation
          </div>
        </div>

        {/* Total Liquid Net Worth (Bank 1 + Bank 2 + Cash) */}
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 650, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Liquid Balances
            </span>
            <span style={{ color: "var(--color-gold)", background: "var(--color-gold-soft)", padding: 4, borderRadius: 6 }}>
              <Wallet size={14} />
            </span>
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>
            {fmtINR(accountBalances.totalLiquid)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Combined across 2 banks & cash
          </div>
        </div>
      </div>

      {/* 3. Account Balances Strip (Bank 1, Bank 2, Cash + Inter-Transfer) */}
      <div
        className="glass-card hero-plan-card"
        style={{
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={16} color="var(--color-gold)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Liquidity Accounts (Live Balances)
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setFormType("income");
                setFormCategory(incomeCategories[0]?.id || "trading_profit");
                setActiveModal("income");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 6,
                background: "var(--color-win-soft)",
                border: "1px solid var(--color-win-border)",
                color: "var(--color-win-text)",
                fontSize: 11.5,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              <Plus size={13} /> Log Income
            </button>

            <button
              onClick={() => {
                setFormType("expense");
                setFormCategory(expenseCategories[0]?.id || "housing");
                setActiveModal("expense");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 6,
                background: "var(--color-loss-soft)",
                border: "1px solid var(--color-loss-border)",
                color: "var(--color-loss-text)",
                fontSize: 11.5,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              <Plus size={13} /> Log Expense
            </button>

            <button
              onClick={() => {
                setFormType("transfer");
                setActiveModal("transfer");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 6,
                background: "var(--color-info-soft)",
                border: "1px solid var(--color-info-border)",
                color: "var(--color-info-text)",
                fontSize: 11.5,
                fontWeight: 650,
                cursor: "pointer",
              }}
              title="Transfer funds between Bank 1, Bank 2, or Cash (e.g. ATM withdrawal or inter-bank transfer)"
            >
              <ArrowLeftRight size={13} /> Transfer Between Accounts
            </button>

            <button
              onClick={() => openNewCategoryModal("expense")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 6,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--color-gold)",
                fontSize: 11.5,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              <Plus size={13} /> New Category
            </button>
          </div>
        </div>

        {/* 3 Account Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {/* Bank 1 Card */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--color-win-border)", borderRadius: 10, padding: 14, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={14} color="var(--color-win-text)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
                  {accounts.bank1?.name || "Primary Bank 1"}
                </span>
              </div>
              <button
                onClick={() => openEditAccount("bank1")}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
                title="Edit Account Name or Opening Balance"
              >
                <Pencil size={12} />
              </button>
            </div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--color-win-text)" }}>
              {fmtINR(accountBalances.bank1)}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4 }}>
              Opening: {fmtINR(accounts.bank1?.openingBalance || 0)}
            </div>
          </div>

          {/* Bank 2 Card */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--color-gold-border)", borderRadius: 10, padding: 14, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={14} color="var(--color-gold)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
                  {accounts.bank2?.name || "Primary Bank 2"}
                </span>
              </div>
              <button
                onClick={() => openEditAccount("bank2")}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
                title="Edit Account Name or Opening Balance"
              >
                <Pencil size={12} />
              </button>
            </div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--color-gold)" }}>
              {fmtINR(accountBalances.bank2)}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4 }}>
              Opening: {fmtINR(accounts.bank2?.openingBalance || 0)}
            </div>
          </div>

          {/* Cash Wallet Card */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--color-info-border)", borderRadius: 10, padding: 14, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Banknote size={14} color="var(--color-info-text)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
                  {accounts.cash?.name || "Cash in Hand"}
                </span>
              </div>
              <button
                onClick={() => openEditAccount("cash")}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
                title="Edit Account Name or Opening Balance"
              >
                <Pencil size={12} />
              </button>
            </div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--color-info-text)" }}>
              {fmtINR(accountBalances.cash)}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4 }}>
              Opening: {fmtINR(accounts.cash?.openingBalance || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Middle Grid: Incomes Breakdown, Wealth Donut, and Expense Categories */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* Left Card: Income Sources Breakdown */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Income Streams
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>This month's inflows by source</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => openNewCategoryModal("income")}
                style={{
                  background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                  color: "var(--color-gold)", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 650, cursor: "pointer"
                }}
                title="Add New Custom Income Stream"
              >
                + Stream
              </button>
              <button
                onClick={() => {
                  setFormType("income");
                  setFormCategory(incomeCategories[0]?.id || "trading_profit");
                  setActiveModal("income");
                }}
                style={{
                  background: "var(--color-win-soft)", border: "1px solid var(--color-win-border)",
                  color: "var(--color-win-text)", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 650, cursor: "pointer"
                }}
              >
                + Inflow
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {incomeCategories.map((cat) => {
              const catTotal = monthlyTransactions
                .filter((tx) => tx.type === "income" && tx.categoryId === cat.id)
                .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);

              return (
                <div
                  key={cat.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 650, color: "var(--text-main)" }}>
                      {cat.name}
                    </span>
                    <button
                      onClick={() => openEditCategoryModal(cat)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px 4px", display: "inline-flex", alignItems: "center" }}
                      title="Edit Category Name & Emoji"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: catTotal > 0 ? "var(--color-win-text)" : "var(--text-muted)" }}>
                      {fmtINR(catTotal)}
                    </div>
                    {incomeCategories.length > 1 && (
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, display: "inline-flex", alignItems: "center" }}
                        title="Delete Category"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Card: Wealth Compounding Donut Allocation */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Wealth Compounding
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Automatic surplus partition rule</div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
                background: "var(--color-gold-soft)",
                color: "var(--color-gold)",
              }}
            >
              ₹20 CR ENGINE
            </span>
          </div>

          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [fmtINR(val), name]}
                  contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Allocation Breakdown Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-gold)" }} />
                <span style={{ color: "var(--text-secondary)" }}>Trading War Chest ({allocations.warChestPct}%):</span>
              </div>
              <span className="mono" style={{ fontWeight: 700, color: "var(--color-gold)" }}>{fmtINR(monthlyStats.warChest)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-win-text)" }} />
                <span style={{ color: "var(--text-secondary)" }}>Equity Portfolio ({allocations.equityPct}%):</span>
              </div>
              <span className="mono" style={{ fontWeight: 700, color: "var(--color-win-text)" }}>{fmtINR(monthlyStats.equityPortfolio)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-info-text)" }} />
                <span style={{ color: "var(--text-secondary)" }}>Emergency Buffer ({allocations.emergencyPct}%):</span>
              </div>
              <span className="mono" style={{ fontWeight: 700, color: "var(--color-info-text)" }}>{fmtINR(monthlyStats.emergencyBuffer)}</span>
            </div>
          </div>
        </div>

        {/* Right Card: Expense Categories with Progress Bars & Annual Toggle */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Expense Budget vs. Actual
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Planned: <span className="mono" style={{ fontWeight: 650, color: "var(--color-gold)" }}>{fmtINR(totalMonthlyBudget)}/mo</span>
                {" "}&bull;{" "}
                <span className="mono" style={{ fontWeight: 650, color: "var(--text-main)" }}>{fmtINR(totalAnnualBudget)}/yr</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {/* Monthly vs Annual Toggle */}
              <div style={{ display: "flex", background: "var(--bg-elevated)", borderRadius: 6, padding: 2, border: "1px solid var(--border-subtle)" }}>
                <button
                  type="button"
                  onClick={() => setBudgetViewMode("monthly")}
                  style={{
                    background: budgetViewMode === "monthly" ? "var(--color-gold)" : "transparent",
                    color: budgetViewMode === "monthly" ? "#081022" : "var(--text-secondary)",
                    border: "none",
                    borderRadius: 4,
                    padding: "3px 8px",
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetViewMode("annual")}
                  style={{
                    background: budgetViewMode === "annual" ? "var(--color-gold)" : "transparent",
                    color: budgetViewMode === "annual" ? "#081022" : "var(--text-secondary)",
                    border: "none",
                    borderRadius: 4,
                    padding: "3px 8px",
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  title="View full annualized budget (divided into 12 months)"
                >
                  Annual (×12)
                </button>
              </div>

              <button
                onClick={() => openNewCategoryModal("expense")}
                style={{
                  background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                  color: "var(--color-gold)", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 650, cursor: "pointer"
                }}
              >
                + Category
              </button>

              <button
                onClick={handleResetCategories}
                style={{
                  background: "transparent", border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)", borderRadius: 6, padding: "4px 6px", fontSize: 11, cursor: "pointer"
                }}
                title="Reset Categories to Default Recommendations"
              >
                ↺
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 310, overflowY: "auto", paddingRight: 4 }}>
            {expenseCategories.map((cat) => {
              const isAnnual = budgetViewMode === "annual";
              const currentYearPrefix = selectedMonth ? selectedMonth.slice(0, 4) : new Date().getFullYear().toString();

              // Monthly values
              const monthlySpent = monthlyStats.categorySpending[cat.id] || 0;
              const monthlyBudget = cat.budget || 0;

              // Annual values
              const annualSpent = transactions
                .filter((tx) => tx.type === "expense" && tx.categoryId === cat.id && tx.date.startsWith(currentYearPrefix))
                .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
              const annualBudget = monthlyBudget * 12;

              const displaySpent = isAnnual ? annualSpent : monthlySpent;
              const displayBudget = isAnnual ? annualBudget : monthlyBudget;
              const pct = displayBudget > 0 ? Math.min(100, Math.round((displaySpent / displayBudget) * 100)) : 0;
              const isOver = displayBudget > 0 && displaySpent > displayBudget;

              return (
                <div key={cat.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 650, color: "var(--text-main)" }}>
                        {cat.name}
                      </span>
                      <button
                        onClick={() => openEditCategoryModal(cat)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px 4px", display: "inline-flex", alignItems: "center" }}
                        title="Edit Category Name, Emoji, or Budget Target"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ textAlign: "right" }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: isOver ? "var(--color-loss-text)" : "var(--text-main)" }}>
                          {fmtINR(displaySpent)} / {fmtINR(displayBudget)}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>
                          {isAnnual ? `(${fmtINR(monthlyBudget)}/mo)` : `(${fmtINR(annualBudget)}/yr)`}
                        </span>
                      </div>
                      {expenseCategories.length > 1 && (
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, display: "inline-flex", alignItems: "center" }}
                          title="Delete Category"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: "100%", height: 6, borderRadius: 4, background: "rgba(229, 184, 105, 0.1)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: isOver
                          ? "var(--color-loss)"
                          : pct >= 85
                          ? "linear-gradient(90deg, var(--color-gold) 0%, #F59E0B 100%)"
                          : "linear-gradient(90deg, var(--color-win) 0%, var(--color-gold) 100%)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Transactions Ledger Table */}
      <div className="glass-card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Monthly Transaction Ledger ({filteredLedger.length})
            </span>
          </div>

          {/* Filters & Search */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-elevated)", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-subtle)" }}>
              <Search size={12} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search notes or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-main)",
                  fontSize: 12,
                  outline: "none",
                  padding: 0,
                  minHeight: "auto",
                  width: 140,
                }}
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-main)",
                fontSize: 11.5,
                fontWeight: 600,
                padding: "4px 8px",
                borderRadius: 6,
                minHeight: "auto",
                cursor: "pointer",
              }}
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Incomes Only</option>
              <option value="transfer">Transfers Only</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontWeight: 650, fontSize: 11, textTransform: "uppercase" }}>Date</th>
                <th style={{ padding: "10px 12px", fontWeight: 650, fontSize: 11, textTransform: "uppercase" }}>Type</th>
                <th style={{ padding: "10px 12px", fontWeight: 650, fontSize: 11, textTransform: "uppercase" }}>Category / Route</th>
                <th style={{ padding: "10px 12px", fontWeight: 650, fontSize: 11, textTransform: "uppercase" }}>Account</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 650, fontSize: 11, textTransform: "uppercase" }}>Amount</th>
                <th style={{ padding: "10px 12px", fontWeight: 650, fontSize: 11, textTransform: "uppercase" }}>Note</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 650, fontSize: 11, textTransform: "uppercase" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>
                    No transactions recorded for {selectedMonth}. Click "+ Log Income", "+ Log Expense", or "+ Transfer" above to begin.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((tx) => {
                  const isIncome = tx.type === "income";
                  const isExpense = tx.type === "expense";
                  const isTransfer = tx.type === "transfer";
                  const cat = categories.find((c) => c.id === tx.categoryId);

                  return (
                    <tr key={tx.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <td className="mono" style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {tx.date}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            textTransform: "uppercase",
                            background: isIncome
                              ? "var(--color-win-soft)"
                              : isExpense
                              ? "var(--color-loss-soft)"
                              : "var(--color-info-soft)",
                            color: isIncome
                              ? "var(--color-win-text)"
                              : isExpense
                              ? "var(--color-loss-text)"
                              : "var(--color-info-text)",
                          }}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {isTransfer ? (
                          <span style={{ color: "var(--color-info-text)", fontSize: 12, fontWeight: 650 }}>
                            {accounts[tx.accountId]?.name} ➔ {accounts[tx.targetAccountId]?.name}
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span>{cat?.emoji || "🏷️"}</span>
                            <span>{cat?.name || tx.categoryId}</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontSize: 12 }}>
                        {accounts[tx.accountId]?.name || tx.accountId}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          fontSize: 13.5,
                          color: isIncome
                            ? "var(--color-win-text)"
                            : isExpense
                            ? "var(--color-loss-text)"
                            : "var(--color-info-text)",
                        }}
                      >
                        {isIncome ? "+" : isExpense ? "-" : "⇄"}
                        {fmtINR(tx.amount)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--text-main)", fontSize: 12 }}>
                        {tx.note || <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        {deleteConfirmId === tx.id ? (
                          <div style={{ display: "inline-flex", gap: 4 }}>
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              style={{ background: "var(--color-loss)", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px 4px" }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(tx.id)}
                            style={{ background: "none", border: "none", color: "var(--color-loss-text)", cursor: "pointer", padding: 2 }}
                            title="Delete Transaction"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODALS FOR TRANSACTIONS & TRANSFERS */}
      {(activeModal === "income" || activeModal === "expense" || activeModal === "transfer") && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="glass-card mobile-modal"
            style={{
              width: "100%",
              maxWidth: 440,
              padding: 24,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>
                {activeModal === "income" && "💰 Log Income Stream"}
                {activeModal === "expense" && "💳 Log Expense Outflow"}
                {activeModal === "transfer" && "⇄ Transfer Between Accounts"}
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Category (for income or expense) */}
              {activeModal !== "transfer" && (
                <div>
                  <label>Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    required
                  >
                    {(activeModal === "income" ? incomeCategories : expenseCategories).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Source Account */}
              <div>
                <label>{activeModal === "transfer" ? "From Account" : activeModal === "income" ? "Deposit Into Account" : "Paid From Account"}</label>
                <select
                  value={formAccount}
                  onChange={(e) => setFormAccount(e.target.value)}
                  required
                >
                  <option value="bank1">🏦 {accounts.bank1?.name}</option>
                  <option value="bank2">🏦 {accounts.bank2?.name}</option>
                  <option value="cash">💵 {accounts.cash?.name}</option>
                </select>
              </div>

              {/* Destination Account (Only for Transfer) */}
              {activeModal === "transfer" && (
                <div>
                  <label>To Account</label>
                  <select
                    value={formTargetAccount}
                    onChange={(e) => setFormTargetAccount(e.target.value)}
                    required
                  >
                    <option value="bank1" disabled={formAccount === "bank1"}>🏦 {accounts.bank1?.name}</option>
                    <option value="bank2" disabled={formAccount === "bank2"}>🏦 {accounts.bank2?.name}</option>
                    <option value="cash" disabled={formAccount === "cash"}>💵 {accounts.cash?.name}</option>
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <label>Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Date */}
              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              {/* Note */}
              <div>
                <label>Note / Purpose</label>
                <input
                  type="text"
                  placeholder="Optional memo (e.g. ATM withdrawal, Grocery run, Client fee)"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 20px",
                    borderRadius: 8,
                    background: "var(--color-gold)",
                    border: "none",
                    color: "#081022",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: EDIT ACCOUNT (RENAME & OPENING BALANCE) */}
      {activeModal === "edit_account" && editAccountTarget && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="glass-card mobile-modal"
            style={{
              width: "100%",
              maxWidth: 420,
              padding: 24,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>
                Edit Account Details
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccountEdit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label>Account Display Name</label>
                <input
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. HDFC Bank, ICICI Bank, Home Cash"
                  required
                />
              </div>

              <div>
                <label>Initial Opening Balance (₹)</label>
                <input
                  type="number"
                  value={accOpening}
                  onChange={(e) => setAccOpening(e.target.value)}
                  placeholder="0"
                  required
                />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Starting baseline balance before any transactions are applied.
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 20px",
                    borderRadius: 8,
                    background: "var(--color-gold)",
                    border: "none",
                    color: "#081022",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: MANAGE CATEGORY (EDIT & CREATE WITH ANNUAL/MONTHLY AUTO-DIVISION) */}
      {activeModal === "category" && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="glass-card mobile-modal"
            style={{
              width: "100%",
              maxWidth: 460,
              padding: 24,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>
                  {editingCategoryId ? "Edit Category Details" : "Create New Category"}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                  {editingCategoryId
                    ? "Update category name, emoji, or annual/monthly budget allocations"
                    : "Define custom category and divide budget automatically"}
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setEditingCategoryId(null);
                }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label>Category Type</label>
                <select value={catType} onChange={(e) => setCatType(e.target.value)}>
                  <option value="expense">Expense (Outflow)</option>
                  <option value="income">Income (Inflow)</option>
                </select>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Category Emoji & Icon</label>
                  <span style={{ fontSize: 10.5, color: "var(--color-gold)", fontWeight: 650 }}>
                    Mac Shortcut: ⌘ + ⌃ + Space
                  </span>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <input
                    type="text"
                    value={catEmoji}
                    onChange={(e) => setCatEmoji(e.target.value)}
                    style={{ textAlign: "center", fontSize: 24, width: 64, height: 46, flexShrink: 0, borderRadius: 8 }}
                    title="Current Category Emoji"
                  />
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                    Click any emoji below or press <kbd style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 4, padding: "2px 5px", fontSize: 10, color: "var(--text-main)", fontWeight: 700 }}>⌘ + ⌃ + Space</kbd> to open Mac emoji palette
                  </div>
                </div>

                {/* Emoji Group Tabs */}
                <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 6, marginBottom: 8, scrollbarWidth: "none" }}>
                  {Object.keys(EMOJI_GROUPS).map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setSelectedEmojiGroup(group)}
                      style={{
                        padding: "3px 8px",
                        fontSize: 10.5,
                        fontWeight: 650,
                        borderRadius: 6,
                        border: "1px solid",
                        borderColor: selectedEmojiGroup === group ? "var(--color-gold)" : "var(--border-subtle)",
                        background: selectedEmojiGroup === group ? "var(--color-gold-soft)" : "var(--bg-elevated)",
                        color: selectedEmojiGroup === group ? "var(--color-gold)" : "var(--text-secondary)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {group}
                    </button>
                  ))}
                </div>

                {/* Emojis in Selected Group */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, background: "var(--bg-elevated)", padding: 8, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                  {EMOJI_GROUPS[selectedEmojiGroup].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setCatEmoji(em)}
                      style={{
                        background: catEmoji === em ? "var(--color-gold-soft)" : "transparent",
                        border: catEmoji === em ? "1px solid var(--color-gold)" : "1px solid transparent",
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 16,
                        cursor: "pointer",
                        transition: "transform 0.1s ease",
                      }}
                      title={`Select ${em}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label>Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Golf, Mentorship, Tech Tools, Groceries"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                />
              </div>

              {catType === "expense" && (
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    padding: 14,
                    borderRadius: 10,
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-gold)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Budget Allocation (Auto-Divided)
                    </span>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--color-gold-soft)", color: "var(--color-gold)", fontWeight: 700 }}>
                      ÷ 12 MONTHS
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 10.5, marginBottom: 4 }}>Annual Budget (₹/yr)</label>
                      <input
                        type="number"
                        placeholder="e.g. 120000"
                        value={catAnnualBudget}
                        onChange={(e) => handleAnnualBudgetChange(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, marginBottom: 4 }}>Monthly Budget (₹/mo)</label>
                      <input
                        type="number"
                        placeholder="e.g. 10000"
                        value={catMonthlyBudget}
                        onChange={(e) => handleMonthlyBudgetChange(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span>💡</span>
                    <span>
                      {parseFloat(catAnnualBudget) > 0
                        ? `₹${Number(catAnnualBudget).toLocaleString("en-IN")}/yr automatically divides into ₹${Number(catMonthlyBudget || 0).toLocaleString("en-IN")}/month`
                        : "Enter annual budget to divide by 12, or enter monthly target directly."}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div>
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(editingCategoryId)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        background: "var(--color-loss-soft)",
                        border: "1px solid var(--color-loss-border)",
                        color: "var(--color-loss-text)",
                        cursor: "pointer",
                        fontSize: 12.5,
                        fontWeight: 650,
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      setEditingCategoryId(null);
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      background: "var(--color-gold)",
                      border: "none",
                      color: "#081022",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {editingCategoryId ? "Save Changes" : "Create Category"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
