import React, { useState, useEffect, useMemo } from "react";
import {
  BHARAT_ACTIVITIES,
  getBharatActivityById,
  getAutoBharatActivity,
} from "../data/bharatAvatar";
import {
  playMeditationChime,
  playCricketShotSound,
  playPushupRepSound,
  playGlassClinkSound,
  playProfitFanfare,
} from "../utils/avatarAudio";
import {
  Sparkles,
  Dices,
  RotateCcw,
  Quote,
  Volume2,
  VolumeX,
  Zap,
  Flame,
} from "lucide-react";

export default function BharatAvatarCard({
  habitsMap = {},
  sopMap = {},
  isTodaySopHonored = false,
  todayPnl = 0,
}) {
  const [manualActivityId, setManualActivityId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushupReps, setPushupReps] = useState(14);
  const [actionNotice, setActionNotice] = useState(null);
  const [isActionActive, setIsActionActive] = useState(false);

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

  const modeLabel = manualActivityId ? "Manual Choice" : autoResult.modeName;

  // Auto increment pushup reps every 2.6s when in workout mode
  useEffect(() => {
    if (currentActivity.id !== "workout") return;
    const interval = setInterval(() => {
      setPushupReps((prev) => (prev >= 99 ? 1 : prev + 1));
    }, 2600);
    return () => clearInterval(interval);
  }, [currentActivity.id]);

  const handleShuffle = () => {
    const remaining = BHARAT_ACTIVITIES.filter((a) => a.id !== currentActivity.id);
    const randomChoice = remaining[Math.floor(Math.random() * remaining.length)];
    setManualActivityId(randomChoice.id);
  };

  // Interactive Live Action Triggers
  const triggerLiveAction = () => {
    setIsActionActive(true);
    setTimeout(() => setIsActionActive(false), 900);

    if (currentActivity.id === "workout") {
      const nextRep = pushupReps + 1;
      setPushupReps(nextRep);
      if (soundEnabled) playPushupRepSound(nextRep);
      showNotice(`💪 Rep ${nextRep} Completed! Form Locked!`);
    } else if (currentActivity.id === "meditation") {
      if (soundEnabled) playMeditationChime();
      showNotice("🧘 528 Hz Singing Bowl Resonance • Mind Centered");
    } else if (currentActivity.id === "cricket") {
      if (soundEnabled) playCricketShotSound();
      showNotice("🏏 CRISP COVER DRIVE! BOUNDARY! FOUR RUNS!");
    } else if (currentActivity.id === "romance") {
      if (soundEnabled) playGlassClinkSound();
      showNotice("🥂 Cheers to living fully and trading flawlessly!");
    } else if (currentActivity.id === "reading") {
      if (soundEnabled) playPushupRepSound(1);
      showNotice("📖 Page Turned • Nourishing mind with discipline");
    } else if (currentActivity.id === "profit") {
      if (soundEnabled) playProfitFanfare();
      showNotice("🎉 ₹20 Crore Execution Honored! Victory Fanfare!");
    } else {
      if (soundEnabled) playPushupRepSound(2);
      showNotice("👔 Centered and poised. Market volatility neutralized.");
    }
  };

  const showNotice = (text) => {
    setActionNotice(text);
    setTimeout(() => setActionNotice(null), 3200);
  };

  // Determine kinetic animation style based on activity
  const getImageAnimationStyle = () => {
    switch (currentActivity.id) {
      case "workout":
        return {
          animation: "avatarPushupMotion 2.4s ease-in-out infinite",
          transformOrigin: "center bottom",
        };
      case "meditation":
        return {
          animation: "avatarLevitate 3.8s ease-in-out infinite",
          transformOrigin: "center center",
        };
      case "cricket":
        return {
          animation: "avatarCricketTap 3.4s ease-in-out infinite",
          transformOrigin: "center bottom",
        };
      case "romance":
        return {
          animation: "avatarLevitate 4.5s ease-in-out infinite",
          transformOrigin: "center center",
        };
      case "profit":
        return {
          animation: "avatarLevitate 2.8s ease-in-out infinite",
          transformOrigin: "center center",
        };
      default:
        return {
          animation: "avatarLevitate 5s ease-in-out infinite",
          transformOrigin: "center center",
        };
    }
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
        gap: 14,
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
            <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
              Bharat • {currentActivity.name}
            </h3>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: currentActivity.accentColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {currentActivity.badge} • <span style={{ color: "var(--text-secondary)", fontWeight: 450 }}>{modeLabel}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Action Sound FX" : "Enable Action Sound FX"}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: soundEnabled ? "var(--color-gold)" : "var(--text-muted)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

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
              <RotateCcw size={11} /> Auto
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

      {/* Full-Body Character Artwork Frame with Live Motion Layers */}
      <div
        style={{
          width: "100%",
          maxHeight: 460,
          aspectRatio: "3 / 4",
          borderRadius: 14,
          overflow: "hidden",
          position: "relative",
          background: "var(--bg-elevated)",
          border: `2px solid ${currentActivity.accentColor}60`,
          boxShadow: `0 10px 25px rgba(0, 0, 0, 0.25)`,
        }}
      >
        {/* Kinetic Animated Image Container */}
        <div
          style={{
            width: "100%",
            height: "100%",
            ...getImageAnimationStyle(),
            transition: "all 0.3s ease",
            transform: isActionActive ? "scale(1.03)" : undefined,
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
            }}
          />
        </div>

        {/* 🧘 Layer: Meditation Expanding Golden Energy Ripples */}
        {currentActivity.id === "meditation" && (
          <div
            style={{
              position: "absolute",
              top: "22%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                border: "2px solid rgba(245, 158, 11, 0.65)",
                boxShadow: "0 0 24px rgba(245, 158, 11, 0.4)",
                animation: "avatarAuraPulse 3s ease-out infinite",
              }}
            />
          </div>
        )}

        {/* 📈 Layer: Trading Profit Streaming Green Candlesticks */}
        {currentActivity.id === "profit" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            {[18, 48, 78].map((leftPct, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  bottom: "10%",
                  width: 10,
                  height: 34,
                  background: "rgba(16, 185, 129, 0.75)",
                  boxShadow: "0 0 14px rgba(16, 185, 129, 0.8)",
                  borderRadius: 2,
                  animation: `avatarGreenCandleRise ${2 + i * 0.7}s ease-in-out infinite`,
                  animationDelay: `${i * 0.6}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* 🌹 Layer: Rooftop Romance Candle Flame Glow */}
        {currentActivity.id === "romance" && (
          <div
            style={{
              position: "absolute",
              top: "54%",
              left: "49%",
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.8)",
              boxShadow: "0 0 20px rgba(245, 158, 11, 0.95)",
              animation: "avatarCandleFlicker 1.8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* 📖 Layer: Juice Bubbles Rising */}
        {currentActivity.id === "reading" && (
          <div
            style={{
              position: "absolute",
              bottom: "22%",
              left: "22%",
              pointerEvents: "none",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.7)",
                  animation: `avatarBubbleRise 2.2s ease-in infinite`,
                  animationDelay: `${i * 0.7}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Top-Right: Pulsing Live Action Indicator Badge */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${currentActivity.accentColor}60`,
            padding: "4px 10px",
            borderRadius: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#FFFFFF",
            fontSize: 10.5,
            fontWeight: 650,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: currentActivity.accentColor,
              display: "inline-block",
              animation: "avatarLiveDotPulse 1.4s ease-in-out infinite",
            }}
          />
          Live Action
        </div>

        {/* Top-Left: Workout Live Rep Counter */}
        {currentActivity.id === "workout" && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(16, 185, 129, 0.6)",
              padding: "4px 12px",
              borderRadius: 20,
              color: "var(--color-win-text)",
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            <Flame size={13} color="var(--color-win-text)" />
            REP {pushupReps.toString().padStart(2, "0")}
          </div>
        )}

        {/* Bottom Floating Vibe Pill */}
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
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <Sparkles size={12} color={currentActivity.accentColor} />
          {currentActivity.vibe}
        </div>

        {/* Dynamic Action Notification Bubble */}
        {actionNotice && (
          <div
            style={{
              position: "absolute",
              top: "45%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(15, 23, 42, 0.95)",
              border: `2px solid ${currentActivity.accentColor}`,
              boxShadow: `0 0 24px ${currentActivity.glowColor}`,
              padding: "8px 16px",
              borderRadius: 24,
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 650,
              whiteSpace: "nowrap",
              zIndex: 10,
              animation: "avatarLevitate 1s ease-in-out infinite",
            }}
          >
            {actionNotice}
          </div>
        )}
      </div>

      {/* Interactive Action Trigger Button */}
      <button
        onClick={triggerLiveAction}
        style={{
          width: "100%",
          padding: "10px 16px",
          borderRadius: 10,
          border: `1px solid ${currentActivity.accentColor}`,
          background: `linear-gradient(135deg, ${currentActivity.accentColor}25 0%, var(--bg-elevated) 100%)`,
          color: "var(--text-main)",
          fontSize: 13,
          fontWeight: 650,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: `0 2px 10px ${currentActivity.glowColor}`,
          transition: "all 0.2s ease",
          transform: isActionActive ? "scale(0.98)" : "scale(1)",
        }}
      >
        <Zap size={15} color={currentActivity.accentColor} />
        {currentActivity.id === "workout"
          ? "⚡ Do Pushup Rep (+1 Rep & Audio)"
          : currentActivity.id === "meditation"
          ? "🔔 Strike Singing Bowl (528 Hz Chime)"
          : currentActivity.id === "cricket"
          ? "🏏 Strike Cover Drive (Boundary Shot!)"
          : currentActivity.id === "romance"
          ? "🥂 Cheers & Toast with Lady"
          : currentActivity.id === "reading"
          ? "📖 Turn Page & Take Juice Sip"
          : currentActivity.id === "profit"
          ? "🎉 Celebrate ₹20Cr Profit (Fanfare!)"
          : "⚡ Focus & Center Mind"}
      </button>

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
          <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-main)", lineHeight: 1.45, fontWeight: 450 }}>
            "{currentActivity.quote}"
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4, fontWeight: 550 }}>
            Context: {currentActivity.routineReason}
          </div>
        </div>
      </div>

      {/* 7 Interactive Quick Pose Chips */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 650, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
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
                  fontWeight: isSelected ? 650 : 500,
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
