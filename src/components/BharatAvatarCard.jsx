import React, { useState, useMemo } from "react";
import {
  BHARAT_ACTIVITIES,
  getBharatActivityById,
  getAutoBharatActivity,
} from "../data/bharatAvatar";
import { Sparkles, Dices, RotateCcw, Quote } from "lucide-react";

export default function BharatAvatarCard({
  habitsMap = {},
  sopMap = {},
  isTodaySopHonored = false,
  todayPnl = 0,
}) {
  const [manualActivityId, setManualActivityId] = useState(null);

  // Compute automatic state
  const autoResult = useMemo(() => {
    return getAutoBharatActivity({
      habitsMap,
      sopMap,
      isSopHonored: isTodaySopHonored,
      todayPnl,
    });
  }, [habitsMap, sopMap, isTodaySopHonored, todayPnl]);

  const currentActivity = manualActivityId
    ? getBharatActivityById(manualActivityId)
    : autoResult.activity;

  const modeLabel = manualActivityId
    ? "Manual Choice"
    : autoResult.modeName;

  const handleShuffle = () => {
    const remaining = BHARAT_ACTIVITIES.filter((a) => a.id !== currentActivity.id);
    const randomChoice = remaining[Math.floor(Math.random() * remaining.length)];
    setManualActivityId(randomChoice.id);
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: 20,
        background: "var(--bg-card)",
        border: `1px solid ${currentActivity.accentColor}35`,
        boxShadow: `0 8px 30px ${currentActivity.glowColor}`,
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.35s ease",
      }}
    >
      {/* Header Info */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{currentActivity.emoji}</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
              Bharat • {currentActivity.name}
            </h3>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: currentActivity.accentColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {currentActivity.badge} • <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{modeLabel}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {manualActivityId && (
            <button
              onClick={() => setManualActivityId(null)}
              title="Return to smart auto-routine mode"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--color-gold)",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={11} /> Auto Sync
            </button>
          )}
          <button
            onClick={handleShuffle}
            title="Randomize pose"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              cursor: "pointer",
            }}
          >
            <Dices size={12} /> Shuffle
          </button>
        </div>
      </div>

      {/* Full-Body Character Artwork Frame */}
      <div
        style={{
          width: "100%",
          maxHeight: 460,
          aspectRatio: "3 / 4",
          borderRadius: 14,
          overflow: "hidden",
          position: "relative",
          background: "var(--bg-elevated)",
          border: `2px solid ${currentActivity.accentColor}50`,
          boxShadow: `0 10px 25px rgba(0, 0, 0, 0.25)`,
        }}
      >
        <img
          src={currentActivity.image}
          alt={`Bharat - ${currentActivity.name}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            display: "block",
            transition: "opacity 0.25s ease",
          }}
        />

        {/* Floating Vibe Pill */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            background: "rgba(18, 25, 39, 0.85)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${currentActivity.accentColor}60`,
            padding: "5px 12px",
            borderRadius: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#FFFFFF",
            fontSize: 11.5,
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <Sparkles size={12} color={currentActivity.accentColor} />
          {currentActivity.vibe}
        </div>
      </div>

      {/* Contextual Bharat Quote */}
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <Quote size={18} color={currentActivity.accentColor} style={{ flexShrink: 0, marginTop: 2, transform: "rotate(180deg)" }} />
        <div>
          <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-main)", lineHeight: 1.45, fontWeight: 500 }}>
            "{currentActivity.quote}"
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
            Context: {currentActivity.routineReason}
          </div>
        </div>
      </div>

      {/* 7 Interactive Quick Pose Chips */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Switch Bharat's Activity:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {BHARAT_ACTIVITIES.map((act) => {
            const isSelected = currentActivity.id === act.id;
            return (
              <button
                key={act.id}
                onClick={() => setManualActivityId(act.id)}
                style={{
                  padding: "4px 9px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: isSelected ? 800 : 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: isSelected ? act.accentColor : "var(--bg-elevated)",
                  color: isSelected ? "#0F172A" : "var(--text-secondary)",
                  border: isSelected ? `1px solid ${act.accentColor}` : "1px solid var(--border-subtle)",
                  transition: "all 0.15s ease",
                  transform: isSelected ? "scale(1.02)" : "scale(1)",
                }}
              >
                <span>{act.emoji}</span>
                <span>{act.short}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
