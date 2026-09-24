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
} from "lucide-react";
import {
  loadDailyHabitsFromDb,
  persistDailyHabitToDb,
} from "../services/dashboardService";

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

export default function DailyHabitsTab() {
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

  // Current day's habit selections
  const currentEntry = habitsData[selectedDate] || { habits: {}, completedCount: 0 };
  const currentHabits = currentEntry.habits || {};

  const isHabitChecked = (hId) => {
    if (hId === "journaling") return !!(currentHabits.journaling || currentHabits.workout);
    return !!currentHabits[hId];
  };

  // Count for selected date
  const completedCount = useMemo(() => {
    return HABIT_LIST.filter((h) => isHabitChecked(h.id)).length;
  }, [currentHabits]);

  const completionPct = Math.round((completedCount / HABIT_LIST.length) * 100);

  // Toggle habit checkbox
  const toggleHabit = (id) => {
    const isNowChecked = !isHabitChecked(id);
    const updated = { ...currentHabits, [id]: isNowChecked };
    if (id === "journaling") {
      updated.workout = isNowChecked;
    }
    const count = HABIT_LIST.filter((h) => {
      if (h.id === "journaling") return !!(updated.journaling || updated.workout);
      return !!updated[h.id];
    }).length;

    setHabitsData((prev) => ({
      ...prev,
      [selectedDate]: { habits: updated, completedCount: count },
    }));
  };

  // Save habit entry
  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      await persistDailyHabitToDb({
        date: selectedDate,
        habits: currentHabits,
        completedCount,
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
  const todayCompletedCount = todayEntry.completedCount || 0;
  const todayPct = Math.round((todayCompletedCount / HABIT_LIST.length) * 100);

  // Trailing 14 days array
  const last14Days = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = toISO(d);
      const record = habitsData[iso] || { completedCount: 0 };
      const count = record.completedCount || 0;
      const pct = Math.round((count / HABIT_LIST.length) * 100);
      arr.push({
        iso,
        display: formatDisplayDate(iso),
        count,
        pct,
      });
    }
    return arr;
  }, [habitsData]);

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
        // Today still ongoing, check if yesterday had streak
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

  // Perfect days count (all 11 completed)
  const perfectDaysCount = useMemo(() => {
    return Object.values(habitsData).filter((d) => d.completedCount === HABIT_LIST.length).length;
  }, [habitsData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. HERO BANNER */}
      <div
        className="glass-card habits-hero-banner"
        style={{
          padding: "24px 28px",
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
              PERSONAL HABIT TRACKER
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
              MIND • BODY • WORK
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
              Before you command <span className="gold-text-accent">₹20 Crore</span>, you must command yourself.
            </h1>

            <p style={{ color: "var(--text-secondary)", fontSize: 14.5, margin: 0, maxWidth: 660, lineHeight: 1.6, fontWeight: 500 }}>
              The market never bows to desire — it surrenders to discipline. Master your dawn, conquer volatility, and the empire becomes inevitable.
            </p>
          </div>

          {/* Daily Consistency Pill Badge */}
          <div
            style={{
              padding: "16px 24px",
              borderRadius: 14,
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              textAlign: "center",
              minWidth: 150,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Daily consistency
            </div>
            <div
              className="mono"
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: "var(--color-win-text)",
                marginTop: 4,
              }}
            >
              {todayPct}%
            </div>
            <div style={{ fontSize: 11, color: "var(--color-win-text)", fontWeight: 700, letterSpacing: "0.05em" }}>
              TODAY
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CHECKLIST & 4 KPI SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 1fr) 300px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left: Daily Checklist Card */}
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
                Daily checklist
              </h2>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Tick what you completed. You can also update an earlier date.
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

          {/* 11 Checklist Items (2-Column Grid) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {HABIT_LIST.map((habit) => {
              const isChecked = isHabitChecked(habit.id);
              return (
                <div
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
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
                    onChange={() => {}} // handled by parent div
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
                      fontSize: 14,
                      fontWeight: 600,
                      color: isChecked ? "var(--text-main)" : "var(--text-secondary)",
                      textDecoration: isChecked ? "none" : "none",
                    }}
                  >
                    {habit.name}
                  </span>
                </div>
              );
            })}
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
                  {completedCount} of 11 completed
                </span>
                <span className="mono" style={{ fontWeight: 700, color: "var(--color-win-text)" }}>
                  {completionPct}%
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
                    width: `${completionPct}%`,
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
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save daily habits"}
            </button>
          </div>
        </div>

        {/* Right: 4 KPI Cards (2x2 Grid) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Card 1: Today's Completion */}
          <div
            className="glass-card"
            style={{
              padding: 16,
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              TODAY'S COMPLETION
            </div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 900, color: "var(--color-win-text)", margin: "8px 0 4px 0" }}>
              {todayPct}%
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {todayCompletedCount} of 11 habits
            </div>
          </div>

          {/* Card 2: Current Streak */}
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
            <div className="mono" style={{ fontSize: 26, fontWeight: 900, color: "var(--color-gold)", margin: "8px 0 4px 0" }}>
              {currentStreak}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              days with at least 8 habits
            </div>
          </div>

          {/* Card 3: 7-Day Average */}
          <div
            className="glass-card"
            style={{
              padding: 16,
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              7-DAY AVERAGE
            </div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 900, color: "var(--text-main)", margin: "8px 0 4px 0" }}>
              {sevenDayAvg}%
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Trailing 7 calendar days
            </div>
          </div>

          {/* Card 4: Perfect Days */}
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
            <div className="mono" style={{ fontSize: 26, fontWeight: 900, color: "var(--color-win-text)", margin: "8px 0 4px 0" }}>
              {perfectDaysCount}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              All 11 habits completed
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
              Last 14 days
            </h3>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              Select a day to review or update it
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
            8+ HABITS BUILDS YOUR STREAK
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
                    {day.display}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {day.count > 0 ? `${day.count} completed` : "No habits saved"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 120 }}>
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
                          day.count >= 8
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
                        day.count >= 8
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
