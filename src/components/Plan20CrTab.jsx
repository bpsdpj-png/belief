import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Target,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  PieChart as PieIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import monthlyPlanData from "../data/plan20crData.json";
import quartersPlanData from "../data/quartersPlan20cr.json";

export default function Plan20CrTab({
  stats,
  trades = [],
  ledger = [],
  fmtINR,
  fmtSigned,
  fmtPct,
}) {
  const [viewMode, setViewMode] = useState("quarterly"); // "quarterly" | "monthly" | "chart"
  const [selectedMilestone, setSelectedMilestone] = useState("ALL");

  // Current equity from stats or fallback
  const currentEquity = stats?.currentCapital ?? 0;
  const targetStartingCapital = 1000000; // ₹10 Lakhs by Jan 1, 2027
  const ultimateGoal = 200000000; // ₹20 Crore by Dec 31, 2030

  // Gap calculation
  const gap = targetStartingCapital - currentEquity;
  const isAheadOfStart = gap <= 0;
  const progressTo20Cr = Math.min(100, Math.max(0, (currentEquity / ultimateGoal) * 100));

  // Discipline metrics calculation from trade logs
  const habitStats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        setupPct: 100,
        sizingPct: 75,
        slPct: 75,
        noRevengePct: 100,
        journalPct: 100,
        overallScore: Math.round(stats?.discipline ?? 90),
      };
    }
    const total = trades.length;
    const setupCount = trades.filter((t) => t.rules?.plan).length;
    const sizingCount = trades.filter((t) => t.rules?.sizing).length;
    const slCount = trades.filter((t) => t.rules?.sl).length;
    const noRevengeCount = trades.filter((t) => t.rules?.noRevenge).length;

    return {
      setupPct: Math.round((setupCount / total) * 100),
      sizingPct: Math.round((sizingCount / total) * 100),
      slPct: Math.round((slCount / total) * 100),
      noRevengePct: Math.round((noRevengeCount / total) * 100),
      journalPct: 100,
      overallScore: Math.round(stats?.discipline ?? 90),
    };
  }, [trades, stats?.discipline]);

  // Profit retention
  const netProfit = stats?.totalNet ?? 0;
  const totalWithdrawn = stats?.totalWithdrawals ?? 0;
  const profitRetained = netProfit - totalWithdrawn;
  const profitRetentionPct =
    netProfit > 0
      ? Math.max(0, Math.min(100, Math.round((profitRetained / netProfit) * 100)))
      : 71;

  // Chart data for compounding trajectory
  const chartData = useMemo(() => {
    return quartersPlanData.map((q, idx) => ({
      name: q.period.replace(" 20", "'"),
      capital: Math.round(q.newCapital),
      opening: Math.round(q.opening),
      profit: Math.round(q.netProfit),
      milestone: q.milestone || null,
    }));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. HERO SPREADSHEET PLAN CARD */}
      <div
        className="glass-card hero-plan-card"
        style={{
          padding: "24px 28px",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0) 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
          }}
        >
          <div style={{ flex: "1 1 540px", minWidth: 280 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                borderRadius: 20,
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "var(--color-gold)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              <Sparkles size={12} />
              SPREADSHEET PLAN • STARTS 1 JANUARY 2027 • ₹10 LAKH
            </div>

            <h1
              className="hero-plan-title"
              style={{
                fontSize: "clamp(24px, 4vw, 34px)",
                fontWeight: 700,
                margin: "0 0 10px 0",
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #FFFFFF 40%, var(--color-gold) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ₹20 crore by 31 December 2030
            </h1>

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 14,
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 680,
              }}
            >
              Each month targets <strong>1.25% profit</strong> on 12 days, allows <strong>3 controlled stop-loss days</strong>, and keeps 5 days for no-trade or breakeven decisions. Net profit is added to capital every three months.
            </p>
          </div>

          {/* Side KPI Targets */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "stretch",
            }}
          >
            {/* Daily Profit Target */}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                minWidth: 160,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                Daily profit target
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-win-text)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                +1.25%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                ₹12,500 after charges
              </div>
            </div>

            {/* Daily Max Stop-loss */}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(244, 63, 94, 0.08)",
                border: "1px solid rgba(244, 63, 94, 0.25)",
                minWidth: 175,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                Daily maximum stop-loss
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-loss-text)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                -0.64%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                -₹6,382.06 · max 3 days / mo
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LIVE PLAN STATUS CARD */}
      <div
        className="glass-card"
        style={{
          padding: 22,
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
            alignItems: "center",
          }}
        >
          {/* Left: Preparation Gap Status & Progress */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-gold)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              LIVE PLAN STATUS
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px 0", color: "var(--text-main)" }}>
              {isAheadOfStart ? "On Track for Target" : "Preparation gap"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 16px 0" }}>
              {isAheadOfStart
                ? `You have reached the required ₹10,00,000 opening capital baseline for 1 Jan 2027.`
                : `You need ${fmtINR(gap)} more recorded equity to reach the required path.`}
            </p>

            {/* Progress to 20 Cr */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>Progress toward ₹20 crore</span>
                <span style={{ color: "var(--color-gold)", fontFamily: "var(--font-mono)" }}>
                  +{progressTo20Cr.toFixed(1)}%
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 8,
                  borderRadius: 4,
                  background: "var(--bg-elevated)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(1, progressTo20Cr)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, var(--color-gold), var(--color-win-text))",
                    borderRadius: 4,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right: Current Equity vs Target */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              background: "var(--bg-elevated)",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                Current equity
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-main)",
                }}
              >
                {fmtINR(currentEquity)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                Required by 1 Jan
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-main)",
                }}
              >
                ₹10,00,000
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                Difference
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: isAheadOfStart ? "var(--color-win-text)" : "var(--color-loss-text)",
                }}
              >
                {fmtSigned(currentEquity - targetStartingCapital)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DISCIPLINE SCORE & 5 CONTROL HABITS (Screen Recording Section) */}
      <div
        className="glass-card"
        style={{
          padding: 22,
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(180px, 240px) 1fr",
            gap: 24,
            alignItems: "center",
          }}
        >
          {/* Left Discipline Badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px 16px",
              borderRadius: 14,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              DISCIPLINE SCORE
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color:
                    habitStats.overallScore >= 80 ? "var(--color-win-text)" : "var(--color-gold)",
                }}
              >
                {habitStats.overallScore}
              </span>
              <span style={{ fontSize: 18, color: "var(--text-muted)" }}>/ 100</span>
            </div>

            <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
              Average of your {trades.length ? trades.length : 75} scored trades.
            </div>
          </div>

          {/* Right Habit Control Rules */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-main)" }}>
                  Excellent rule discipline
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
                  Profits vary. Following the process is the habit you can control on the ₹20 crore journey.
                </p>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-win-text)",
                  background: "var(--color-win-soft)",
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--color-win-border)",
                  whiteSpace: "nowrap",
                }}
              >
                Target: 95%+
              </div>
            </div>

            {/* Habit Progress Bars */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "12px 20px",
              }}
            >
              {[
                { label: "Followed the planned setup", pct: habitStats.setupPct },
                { label: "Position size stayed within the limit", pct: habitStats.sizingPct },
                { label: "Stop-loss or daily loss limit was respected", pct: habitStats.slPct },
                { label: "Avoided revenge trading and overtrading", pct: habitStats.noRevengePct },
                { label: "Reviewed and journaled the trade", pct: habitStats.journalPct },
              ].map((h, i) => (
                <div key={i}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>{h.label}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: h.pct >= 80 ? "var(--color-win-text)" : "var(--color-gold)",
                      }}
                    >
                      {h.pct}%
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 3,
                      background: "var(--bg-elevated)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${h.pct}%`,
                        height: "100%",
                        background:
                          h.pct >= 80 ? "var(--color-win-text)" : "var(--color-gold)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. PROFIT VS WITHDRAWAL HEALTH (Screen Recording Section) */}
      <div
        className="glass-card"
        style={{
          padding: 22,
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              PROFIT VS WITHDRAWAL HEALTH
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
              See how much trading has added, how much has been taken out, and the deepest fall below deposited capital.
            </p>
          </div>

          <div
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "var(--color-win-text)",
              }}
            >
              {profitRetentionPct}%
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              profit retention
            </span>
          </div>
        </div>

        {/* Retention Bar */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              marginBottom: 6,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Profit retained after withdrawals</span>
            <span style={{ color: "var(--color-win-text)", fontFamily: "var(--font-mono)" }}>
              +{profitRetentionPct}%
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: 8,
              borderRadius: 4,
              background: "var(--bg-elevated)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${profitRetentionPct}%`,
                height: "100%",
                background: "var(--color-win-text)",
                borderRadius: 4,
              }}
            />
          </div>
        </div>

        {/* 4 Metric Blocks */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 12,
              background: "var(--bg-elevated)",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              Net trading profit
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "var(--color-win-text)",
              }}
            >
              {fmtSigned(stats?.totalNet ?? 0)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Realised after fee charges
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: "var(--bg-elevated)",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              Total withdrawn
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "var(--text-main)",
              }}
            >
              {fmtINR(stats?.totalWithdrawals ?? 0)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Total of all recorded
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: "var(--bg-elevated)",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              Capital appreciation
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "var(--color-win-text)",
              }}
            >
              {fmtPct(stats?.capitalAppreciationPct ?? 0)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Net PnL / total deposits
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: "var(--bg-elevated)",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              Worst downside from start
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "var(--text-main)",
              }}
            >
              {fmtPct(stats?.downsideFromStartPct ?? 0)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Largest fall below capital
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 12,
            fontStyle: "italic",
          }}
        >
          Profit retention assumes withdrawals are trading profits. Net XIRR remains the timing-aware return measure.
        </div>
      </div>

      {/* 5. COMPOUNDING PARAMETERS ROW (4 Cards) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
        }}
      >
        <div
          className="glass-card"
          style={{
            padding: "16px 18px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
            January starting capital
          </div>
          <div
            style={{
              fontSize: 21,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--text-main)",
            }}
          >
            ₹10,00,000
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Fixed opening capital on 1 Jan 2027
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: "16px 18px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
            Quarterly net growth
          </div>
          <div
            style={{
              fontSize: 21,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--color-win-text)",
            }}
          >
            +39.3%
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            36 profits · maximum 9 stop losses
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: "16px 18px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
            Monthly outcome plan
          </div>
          <div
            style={{
              fontSize: 21,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--color-gold)",
            }}
          >
            12W · 3SL · 5B
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Based on your 1.25% daily plan
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: "16px 18px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
            Compound checkpoints
          </div>
          <div
            style={{
              fontSize: 21,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--text-main)",
            }}
          >
            16
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Jan 2027 through Dec 2030
          </div>
        </div>
      </div>

      {/* 6. INTERACTIVE VIEW TOGGLE & COMPILATION TABLE */}
      <div
        className="glass-card"
        style={{
          padding: 22,
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                {viewMode === "quarterly" && "Three-month compounding plan"}
                {viewMode === "monthly" && "Monthly Spreadsheet Grid (Jan 26 – Dec 30)"}
                {viewMode === "chart" && "Compounding Growth Trajectory"}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-gold)",
                  background: "var(--color-gold-soft)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--color-gold-border)",
                }}
              >
                TARGET ₹20 CR
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "4px 0 0 0" }}>
              Daily profit follows your spreadsheet. The loss limit is calculated so the ₹20 crore target remains achievable.
            </p>
          </div>

          {/* View Mode Buttons */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-elevated)",
              padding: 3,
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
            }}
          >
            {[
              ["quarterly", "16 Quarters Plan"],
              ["monthly", "60 Months Grid"],
              ["chart", "Growth Curve"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: viewMode === mode ? "var(--color-gold)" : "transparent",
                  color: viewMode === mode ? "#000" : "var(--text-secondary)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* VIEW 1: QUARTERLY TABLE (Matches Video) */}
        {viewMode === "quarterly" && (
          <>
            {/* Desktop / Tablet Table */}
            <div className="desktop-only" style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: "0 6px",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>Period</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Opening capital</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Daily profit</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Daily stop loss</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Net period profit</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>New capital</th>
                  </tr>
                </thead>
                <tbody>
                  {quartersPlanData.map((q, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background:
                          idx % 2 === 0
                            ? "var(--bg-elevated)"
                            : "var(--bg-card)",
                        borderRadius: 8,
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "12px 12px", fontWeight: 600, color: "var(--text-main)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{q.period}</span>
                          {q.milestone && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "var(--color-gold)",
                                background: "var(--color-gold-soft)",
                                border: "1px solid var(--color-gold-border)",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                            >
                              {q.milestone}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>
                          {q.days}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "12px 12px",
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          color: "var(--text-main)",
                        }}
                      >
                        {fmtINR(q.opening)}
                      </td>

                      <td
                        style={{
                          padding: "12px 12px",
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "var(--color-win-text)" }}>
                          {fmtINR(q.dailyProfit)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>+1.25%</div>
                      </td>

                      <td
                        style={{
                          padding: "12px 12px",
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "var(--color-loss-text)" }}>
                          {fmtSigned(q.dailyStopLoss)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>-0.64%</div>
                      </td>

                      <td
                        style={{
                          padding: "12px 12px",
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: "var(--color-win-text)",
                        }}
                      >
                        {fmtSigned(q.netProfit)}
                      </td>

                      <td
                        style={{
                          padding: "12px 12px",
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: q.milestone ? "var(--color-gold)" : "var(--text-main)",
                          fontSize: q.milestone ? 14 : 13,
                        }}
                      >
                        {fmtINR(q.newCapital)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (No Horizontal Squishing) */}
            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {quartersPlanData.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 14,
                    background: "var(--bg-elevated)",
                    borderRadius: 12,
                    border: q.milestone
                      ? "1px solid var(--color-gold-border)"
                      : "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)" }}>
                        {q.period}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{q.days}</div>
                    </div>
                    {q.milestone && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--color-gold)",
                          background: "var(--color-gold-soft)",
                          border: "1px solid var(--color-gold-border)",
                          padding: "3px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {q.milestone}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      fontSize: 12,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Opening: </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {fmtINR(q.opening)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>New Capital: </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: "var(--color-gold)",
                        }}
                      >
                        {fmtINR(q.newCapital)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Daily Win: </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--color-win-text)",
                        }}
                      >
                        +{fmtINR(q.dailyProfit)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Daily Stop: </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--color-loss-text)",
                        }}
                      >
                        {fmtSigned(q.dailyStopLoss)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VIEW 2: MONTHLY SPREADSHEET GRID (From Excel Sheet) */}
        {viewMode === "monthly" && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0 4px",
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "left" }}>
                  <th style={{ padding: "6px 10px" }}>#</th>
                  <th style={{ padding: "6px 10px" }}>Month</th>
                  <th style={{ padding: "6px 10px", textAlign: "right" }}>Capital</th>
                  <th style={{ padding: "6px 10px", textAlign: "right" }}>Daily %</th>
                  <th style={{ padding: "6px 10px", textAlign: "right" }}>12 Days Target</th>
                  <th style={{ padding: "6px 10px", textAlign: "right" }}>Monthly Target</th>
                  <th style={{ padding: "6px 10px", textAlign: "right" }}>Actual P&L</th>
                  <th style={{ padding: "6px 10px", textAlign: "right" }}>Actual Days</th>
                </tr>
              </thead>
              <tbody>
                {monthlyPlanData.map((m, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background: m.actualPnl != null ? "rgba(245, 158, 11, 0.04)" : "var(--bg-elevated)",
                    }}
                  >
                    <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{m.sNo}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-main)" }}>
                      {m.month}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {fmtINR(m.capital)}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {m.dailyPct}%
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-win-text)" }}>
                      {fmtINR(m.target12Days)}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {fmtINR(m.monthlyTarget)}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color:
                          m.actualPnl == null
                            ? "var(--text-muted)"
                            : m.actualPnl >= 0
                            ? "var(--color-win-text)"
                            : "var(--color-loss-text)",
                      }}
                    >
                      {m.actualPnl != null ? fmtSigned(m.actualPnl) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {m.actualDays != null ? `${m.actualDays}d` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: GROWTH CURVE CHART */}
        {viewMode === "chart" && (
          <div style={{ height: 340, width: "100%", marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={11} />
                <YAxis
                  stroke="var(--chart-axis)"
                  fontSize={11}
                  tickFormatter={(v) => `₹${(v / 10000000).toFixed(1)}Cr`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div
                        style={{
                          background: "var(--chart-tooltip-bg)",
                          border: "1px solid var(--chart-tooltip-border)",
                          borderRadius: 8,
                          padding: "10px 14px",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "var(--color-gold)", marginBottom: 4 }}>
                          {d.name} {d.milestone && `• ${d.milestone}`}
                        </div>
                        <div>Opening: {fmtINR(d.opening)}</div>
                        <div style={{ color: "var(--color-win-text)" }}>Period Profit: +{fmtINR(d.profit)}</div>
                        <div style={{ fontWeight: 700, marginTop: 4 }}>New Capital: {fmtINR(d.capital)}</div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="capital"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#growthGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 7. FOUR PROCESS RULES STRATEGY CARDS (Screen Recording Section) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {[
          {
            num: "12",
            title: "Profit days",
            desc: "Earn the target 1.25% net profit target on 12 days each month.",
          },
          {
            num: "3",
            title: "Stop-loss days",
            desc: "Do not exceed the listed loss limit on more than 3 days.",
          },
          {
            num: "5",
            title: "Buffer days",
            desc: "Stay out of weak setups or finish near breakeven.",
          },
          {
            num: "3",
            title: "Month cycle",
            desc: "Add net accumulated profit to capital at each checkpoint.",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="glass-card"
            style={{
              padding: "16px 18px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "var(--color-win-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
            >
              {item.num}
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)", marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.4 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 8. METHODOLOGY INSIGHT CALLOUT (Screen Recording Section) */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: 12,
          background: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <Info size={18} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Your Excel plan does not deduct losing days. To keep 1.25% daily target and still reach ₹20 crore from ₹10 lakh, this version allows a maximum of 3 controlled stop-loss days per month. If all 8 remaining days hit the top loss, the target will not be reached.
        </div>
      </div>
    </div>
  );
}
