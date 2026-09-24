import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Calendar,
  Sparkles,
  Flame,
  Award,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Target,
} from "lucide-react";
import {
  loadDailyHabitsFromDb,
  persistDailyHabitToDb,
} from "../services/dashboardService";
import BharatAvatarCard from "./BharatAvatarCard";

// Pillar 1: 11 Mind & Body Daily Rituals (Kept in strict order)
export const HABIT_LIST = [
  { id: "surya", num: "01", name: "Surya Namaskar", category: "BODY" },
  { id: "yoga", num: "02", name: "Yoga", category: "BODY" },
  { id: "meditation", num: "03", name: "Meditation", category: "MIND" },
  { id: "earn", num: "04", name: "Earn Money", category: "WORK" },
  { id: "focus", num: "05", name: "Focus", category: "MIND" },
  { id: "uncertainty", num: "06", name: "Uncertainty", category: "MIND" },
  { id: "juice", num: "07", name: "Juice", category: "BODY" },
  { id: "gym", num: "08", name: "Gym", category: "BODY" },
  { id: "walk", num: "09", name: "Walk", category: "BODY" },
  { id: "reading", num: "10", name: "Reading", category: "MIND" },
  { id: "journaling", num: "11", name: "Journaling", category: "WORK" },
];

// Pillar 2: 5 Trading Standard of Process (SOP) Rules
export const TRADING_SOP_LIST = [
  {
    id: "sop_news",
    num: "P1",
    name: "Event & News Clearance",
    desc: "Checked calendar for RBI, Fed, or major earnings. No unhedged straddles on high-impact event days.",
    category: "NEWS FILTER",
  },
  {
    id: "sop_trend",
    num: "P2",
    name: "15-Min ORB / Trend Filter",
    desc: "Waited for 09:15–09:30 AM open to settle. Confirmed rangebound/sideways bias before entering.",
    category: "ENTRY BIAS",
  },
  {
    id: "sop_sl",
    num: "P3",
    name: "Hard System SL on Both Legs",
    desc: "Placed 25%–35% GTT/SL directly in broker terminal immediately upon entry. Zero mental stops.",
    category: "SYSTEM SL",
  },
  {
    id: "sop_wings",
    num: "P4",
    name: "Wings / OTM Hedges Deployed",
    desc: "Deep OTM wings active to cap gamma explosion and eliminate black-swan news gaps.",
    category: "HEDGE",
  },
  {
    id: "sop_maxloss",
    num: "P5",
    name: "Max Daily Loss Respected (1.5% Cap)",
    desc: "Closed terminal if daily drawdown reached 1.5%. Zero revenge trading or chasing.",
    category: "CIRCUIT STOP",
  },
];

const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDisplayDate = (iso) => {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export default function DailyHabitsTab({ todayPnl = 0, discipline = 100 }) {
  const todayISO = toISO(new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [habitsData, setHabitsData] = useState({});
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved"

  // Load habit records from Supabase / local cache
  useEffect(() => {
    loadDailyHabitsFromDb().then((data) => {
      if (data) setHabitsData(data);
    });
  }, []);

  // Current day's selections
  const currentEntry = habitsData[selectedDate] || { habits: {}, completedCount: 0 };
  const currentHabits = currentEntry.habits || {};

  const isItemChecked = (id) => {
    if (id === "journaling") return !!(currentHabits.journaling || currentHabits.workout);
    return !!currentHabits[id];
  };

  // Pillar 1 Habits count
  const habitsCompletedCount = useMemo(() => {
    return HABIT_LIST.filter((h) => isItemChecked(h.id)).length;
  }, [currentHabits]);
  const habitsPct = Math.round((habitsCompletedCount / HABIT_LIST.length) * 100);

  // Pillar 2 Trading SOP count
  const sopCompletedCount = useMemo(() => {
    return TRADING_SOP_LIST.filter((s) => isItemChecked(s.id)).length;
  }, [currentHabits]);
  const sopPct = Math.round((sopCompletedCount / TRADING_SOP_LIST.length) * 100);
  const isSopHonored = sopCompletedCount === TRADING_SOP_LIST.length;

  // Combined totals
  const totalCompletedCount = habitsCompletedCount + sopCompletedCount;
  const totalPossible = HABIT_LIST.length + TRADING_SOP_LIST.length; // 16
  const totalCompletionPct = Math.round((totalCompletedCount / totalPossible) * 100);

  // Toggle checkbox handler
  const toggleItem = (id) => {
    const isNowChecked = !isItemChecked(id);
    const updated = { ...currentHabits, [id]: isNowChecked };
    if (id === "journaling") {
      updated.workout = isNowChecked;
    }
    const hCount = HABIT_LIST.filter((h) => {
      if (h.id === "journaling") return !!(updated.journaling || updated.workout);
      return !!updated[h.id];
    }).length;
    const sCount = TRADING_SOP_LIST.filter((s) => !!updated[s.id]).length;

    setHabitsData((prev) => ({
      ...prev,
      [selectedDate]: { habits: updated, completedCount: hCount + sCount },
    }));
  };

  // Save habit entry
  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      await persistDailyHabitToDb({
        date: selectedDate,
        habits: currentHabits,
        completedCount: totalCompletedCount,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (e) {
      console.error("Save habit error:", e);
      setSaveStatus("idle");
    }
  };

  // Today's statistics
  const todayEntry = habitsData[todayISO] || { habits: {}, completedCount: 0 };
  const todayHMap = todayEntry.habits || {};
  const todayHabitsCount = HABIT_LIST.filter((h) =>
    h.id === "journaling" ? !!(todayHMap.journaling || todayHMap.workout) : !!todayHMap[h.id]
  ).length;
  const todaySopCount = TRADING_SOP_LIST.filter((s) => !!todayHMap[s.id]).length;
  const todayHabitsPct = Math.round((todayHabitsCount / HABIT_LIST.length) * 100);
  const todaySopPct = Math.round((todaySopCount / TRADING_SOP_LIST.length) * 100);
  const isTodaySopHonored = todaySopCount === TRADING_SOP_LIST.length;

  // Trailing 14 days array
  const last14Days = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = toISO(d);
      const record = habitsData[iso] || { habits: {}, completedCount: 0 };
      const hMap = record.habits || {};
      const hCount = HABIT_LIST.filter((h) =>
        h.id === "journaling" ? !!(hMap.journaling || hMap.workout) : !!hMap[h.id]
      ).length;
      const sCount = TRADING_SOP_LIST.filter((s) => !!hMap[s.id]).length;
      const count = hCount + sCount;
      const pct = Math.round((count / totalPossible) * 100);
      arr.push({
        iso,
        display: formatDisplayDate(iso),
        habitsCount: hCount,
        sopCount: sCount,
        isSopHonored: sCount === TRADING_SOP_LIST.length,
        count,
        pct,
      });
    }
    return arr;
  }, [habitsData, totalPossible]);

  // Streak calculation (days with >= 8 habits)
  const currentStreak = useMemo(() => {
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = toISO(d);
      const record = habitsData[iso];
      if (record && record.completedCount >= 8) {
        streak++;
      } else if (i === 0 && (!record || record.completedCount < 8)) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  }, [habitsData]);

  // 7-day average completion %
  const sevenDayAvg = useMemo(() => {
    const days = last14Days.slice(0, 7);
    const sum = days.reduce((s, d) => s + d.pct, 0);
    return Math.round(sum / 7);
  }, [last14Days]);

  // Perfect process days count (Full Mind/Body + Full Trading SOP)
  const perfectDaysCount = useMemo(() => {
    return Object.values(habitsData).filter((d) => {
      const hMap = d.habits || {};
      const hCount = HABIT_LIST.filter((h) =>
        h.id === "journaling" ? !!(hMap.journaling || hMap.workout) : !!hMap[h.id]
      ).length;
      const sCount = TRADING_SOP_LIST.filter((s) => !!hMap[s.id]).length;
      return hCount === HABIT_LIST.length && sCount === TRADING_SOP_LIST.length;
    }).length;
  }, [habitsData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. HERO BANNER */}
      <div
        className="glass-card habits-hero-banner"
        style={{
          padding: "26px 28px",
          border: "1px solid var(--color-gold-border)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                borderRadius: 20,
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "var(--color-win-text)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              <Sparkles size={12} />
              DAILY HABITS & EXECUTION SOP
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-gold)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              MIND • BODY • WORK • TRADING DISCIPLINE
            </div>

            <h1
              className="habits-hero-title"
              style={{
                fontSize: "clamp(22px, 3.5vw, 32px)",
                fontWeight: 800,
                margin: "0 0 10px 0",
                lineHeight: 1.25,
              }}
            >
              Before you command <span className="gold-text-accent">₹20 Crore</span>, Bharat, you must command yourself.
            </h1>

            <p style={{ color: "var(--text-secondary)", fontSize: 14.5, margin: 0, maxWidth: 680, lineHeight: 1.6, fontWeight: 500 }}>
              The market never bows to desire — it surrenders to discipline. Master your dawn, conquer volatility, and the empire becomes inevitable.
            </p>
          </div>

          {/* Right Dual Scorecard Badges with Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 280, flexWrap: "wrap" }}>
            {/* Interactive Avatar Medallion */}
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                overflow: "hidden",
                border: isTodaySopHonored && todayHabitsCount >= 8 ? "3px solid var(--color-win)" : "3px solid var(--color-gold)",
                boxShadow: isTodaySopHonored && todayHabitsCount >= 8 ? "0 0 18px rgba(16, 185, 129, 0.45)" : "0 0 14px rgba(198, 167, 94, 0.35)",
                flexShrink: 0,
                background: "var(--bg-card)",
                transition: "all 0.3s ease",
              }}
              title={isTodaySopHonored && todayHabitsCount >= 8 ? "Bharat Ascended: Discipline & Process Honored!" : "Bharat: Centered & Poised"}
            >
              <img
                src={isTodaySopHonored && todayHabitsCount >= 8 ? "/avatars/bharat_profit.jpg" : "/avatars/bharat_standing.jpg"}
                alt="Bharat Avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 200px" }}>
              {/* Mind & Body Pill */}
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  MIND & BODY RITUALS
                </div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>
                  {todayHabitsCount} / 11 <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({todayHabitsPct}%)</span>
                </div>
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(198, 167, 94, 0.15)", color: "var(--color-gold)" }}>
                PILLAR 1
              </span>
            </div>

            {/* Trading SOP Pill */}
            <div
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                background: isTodaySopHonored ? "rgba(16, 185, 129, 0.12)" : "rgba(198, 167, 94, 0.12)",
                border: isTodaySopHonored ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid var(--color-gold-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: isTodaySopHonored ? "var(--color-win-text)" : "var(--color-gold)", textTransform: "uppercase" }}>
                  TRADING SOP INTEGRITY
                </div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: isTodaySopHonored ? "var(--color-win-text)" : "var(--color-gold)" }}>
                  {todaySopCount} / 5 <span style={{ fontSize: 11 }}>({isTodaySopHonored ? "100% HONORED ★" : `${todaySopPct}%`})</span>
                </div>
              </div>
              <ShieldCheck size={18} color={isTodaySopHonored ? "var(--color-win-text)" : "var(--color-gold)"} />
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* 2. MAIN CHECKLIST & 4 KPI SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 1fr) 380px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left: Combined Daily Checklist Card */}
        <div
          className="glass-card"
          style={{
            padding: 24,
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
          }}
        >
          {/* Header & Date Picker */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px 0", color: "var(--text-main)" }}>
                Process & Ritual Checklist
              </h2>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Hold yourself to the highest professional standard. Track both your personal habits and trading SOP.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                DATE:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-input)",
                  color: "var(--text-main)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  minHeight: 36,
                }}
              />
            </div>
          </div>

          {/* PILLAR 1: 11 MIND & BODY RITUALS */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: "var(--color-gold)", textTransform: "uppercase" }}>
                  PILLAR 1: MIND & BODY FOUNDATION
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Daily routines to stabilize your nervous system and cultivate sharp execution
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                background: habitsPct === 100 ? "var(--color-win-soft)" : "var(--bg-elevated)",
                color: habitsPct === 100 ? "var(--color-win-text)" : "var(--text-muted)",
                border: "1px solid var(--border-subtle)"
              }}>
                {habitsCompletedCount} / 11 Completed ({habitsPct}%)
              </span>
            </div>

            {/* 11 Checklist Items (2-Column Grid) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              {HABIT_LIST.map((habit) => {
                const isChecked = isItemChecked(habit.id);
                return (
                  <div
                    key={habit.id}
                    onClick={() => toggleItem(habit.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: isChecked ? "rgba(16, 185, 129, 0.08)" : "var(--bg-elevated)",
                      border: `1px solid ${isChecked ? "rgba(16, 185, 129, 0.35)" : "var(--border-subtle)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: "var(--color-win)",
                        cursor: "pointer",
                        minHeight: "auto",
                      }}
                    />
                    <span
                      className="mono"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isChecked ? "var(--color-win-text)" : "var(--text-muted)",
                      }}
                    >
                      {habit.num}
                    </span>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: isChecked ? "var(--text-main)" : "var(--text-secondary)",
                      }}
                    >
                      {habit.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PILLAR 2: 5 TRADING STANDARD OF PROCESS RULES */}
          <div style={{ marginBottom: 24, paddingTop: 20, borderTop: "1px dashed var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: "var(--color-win-text)", textTransform: "uppercase" }}>
                  PILLAR 2: TRADING EXECUTION SOP (ANTI-1% SPIKE PROTOCOL)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Systemic guardrails to eliminate sudden 15-min flash losses and protect compounding capital
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                background: isSopHonored ? "var(--color-win-soft)" : "rgba(239, 68, 68, 0.1)",
                color: isSopHonored ? "var(--color-win-text)" : "var(--color-loss-text)",
                border: isSopHonored ? "1px solid var(--color-win-border)" : "1px solid var(--color-loss-border)"
              }}>
                {isSopHonored ? "★ PROCESS RESPECTED (5/5)" : `${sopCompletedCount} / 5 Rules Honored`}
              </span>
            </div>

            {/* 5 SOP Cards (Stacked full-width cards) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {TRADING_SOP_LIST.map((sop) => {
                const isChecked = isItemChecked(sop.id);
                return (
                  <div
                    key={sop.id}
                    onClick={() => toggleItem(sop.id)}
                    className={`sop-card ${isChecked ? "checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: "var(--color-win)",
                        cursor: "pointer",
                        marginTop: 2,
                        minHeight: "auto",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3, flexWrap: "wrap", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            className="mono"
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: isChecked ? "var(--color-win-soft)" : "var(--bg-card)",
                              color: isChecked ? "var(--color-win-text)" : "var(--text-muted)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            {sop.num}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: isChecked ? "var(--text-main)" : "var(--text-secondary)",
                            }}
                          >
                            {sop.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "var(--bg-card)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border-subtle)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {sop.category}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                        {sop.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Progress Bar & Save Button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ flex: "1 1 240px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "var(--text-muted)" }}>
                  Rituals: <strong>{habitsCompletedCount}/11</strong> · Trading SOP: <strong>{sopCompletedCount}/5</strong>
                </span>
                <span className="mono" style={{ fontWeight: 700, color: totalCompletionPct === 100 ? "var(--color-win-text)" : "var(--color-gold)" }}>
                  {totalCompletionPct}% Process Integrity
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
                    width: `${totalCompletionPct}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, var(--color-gold), var(--color-win-text))",
                    borderRadius: 4,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: 10,
                border: "none",
                background:
                  saveStatus === "saved"
                    ? "var(--color-win)"
                    : "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                color: "#0F172A",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(245, 158, 11, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              <CheckCircle2 size={16} />
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save Process & Habits"}
            </button>
          </div>
        </div>

        {/* Right: Bharat's Full-Body Avatar Card + 4 KPI Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <BharatAvatarCard
            habitsMap={todayHMap}
            sopMap={todayHMap}
            isTodaySopHonored={isTodaySopHonored}
            todayPnl={todayPnl}
          />

          {/* 4 KPI Cards (2x2 Grid) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Card 1: Trading SOP Integrity */}
            <div
              className="glass-card"
              style={{
                padding: 16,
                background: "var(--bg-card)",
                border: isTodaySopHonored ? "1px solid var(--color-win-border)" : "1px solid var(--border-card)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                TRADING SOP INTEGRITY
              </div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 900, color: isTodaySopHonored ? "var(--color-win-text)" : "var(--color-gold)", margin: "8px 0 4px 0" }}>
                {todaySopCount} / 5
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isTodaySopHonored ? "var(--color-win-text)" : "var(--text-secondary)" }}>
                {isTodaySopHonored ? "★ 100% Process Respected" : `${5 - todaySopCount} rule(s) pending`}
              </div>
            </div>

            {/* Card 2: Mind & Body Rituals */}
            <div
              className="glass-card"
              style={{
                padding: 16,
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                MIND & BODY RITUALS
              </div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 900, color: "var(--color-win-text)", margin: "8px 0 4px 0" }}>
                {todayHabitsCount} / 11
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {todayHabitsPct}% completed today
              </div>
            </div>

            {/* Card 3: Current Streak */}
            <div
              className="glass-card"
              style={{
                padding: 16,
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                CURRENT STREAK
              </div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 900, color: "var(--color-gold)", margin: "8px 0 4px 0" }}>
                {currentStreak}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                days with disciplined execution
              </div>
            </div>

            {/* Card 4: Perfect Process Days */}
            <div
              className="glass-card"
              style={{
                padding: 16,
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                PERFECT DAYS
              </div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 900, color: "var(--color-win-text)", margin: "8px 0 4px 0" }}>
                {perfectDaysCount}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Full rituals + Full SOP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LAST 14 DAYS SECTION */}
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
            marginBottom: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px 0", color: "var(--text-main)" }}>
              Last 14 days process audit
            </h3>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              Select a day to review both your daily habits and trading SOP integrity
            </div>
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--color-gold)",
              background: "var(--color-gold-soft)",
              border: "1px solid var(--color-gold-border)",
              padding: "4px 10px",
              borderRadius: 6,
            }}
          >
            PROCESS COMPLIANCE BUILDS COMPOUNDING
          </span>
        </div>

        {/* 2-Column Responsive Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 10,
          }}
        >
          {last14Days.map((day) => {
            const isSelected = selectedDate === day.iso;
            return (
              <div
                key={day.iso}
                onClick={() => setSelectedDate(day.iso)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: isSelected ? "rgba(245, 158, 11, 0.12)" : "var(--bg-elevated)",
                  border: `1px solid ${isSelected ? "var(--color-gold)" : "var(--border-subtle)"}`,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
                      {day.display}
                    </span>
                    {day.isSopHonored && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 3, background: "var(--color-win-soft)", color: "var(--color-win-text)" }}>
                        SOP ★
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Rituals: {day.habitsCount}/11 · SOP: {day.sopCount}/5
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 110 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      background: "var(--border-subtle)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${day.pct}%`,
                        height: "100%",
                        background:
                          day.isSopHonored && day.habitsCount >= 8
                            ? "var(--color-win-text)"
                            : day.count > 0
                            ? "var(--color-gold)"
                            : "transparent",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        day.isSopHonored && day.habitsCount >= 8
                          ? "var(--color-win-text)"
                          : day.count > 0
                          ? "var(--color-gold)"
                          : "var(--text-muted)",
                      minWidth: 32,
                      textAlign: "right",
                    }}
                  >
                    {day.pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
