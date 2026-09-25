import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mountain, Flag, Play, RotateCcw, ChevronDown, ChevronUp, Compass
} from "lucide-react";
import { playProfitFanfare, playMeditationChime } from "../utils/avatarAudio";

export default function PnLMountainClimber({ curve = [], totalNet = 0, peakProfit = 0, startingCapital = 500000 }) {
  // Collapsed by default as requested: sleek compact bar, opens on click
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(1); // 0 to 1
  const [isSummitCelebration, setIsSummitCelebration] = useState(false);
  const animFrameRef = useRef(null);

  // Normalize points for SVG mountain canvas (width: 800, height: 260)
  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 260;
  const PADDING_X = 60;
  const PADDING_TOP = 40;
  const PADDING_BOTTOM = 50;

  // Build clean dataset
  const points = useMemo(() => {
    if (!curve || curve.length === 0) {
      return [
        { date: "Day 1", profit: 0, pnl: 0 },
        { date: "Today", profit: Math.max(0, totalNet), pnl: totalNet }
      ];
    }
    return curve;
  }, [curve, totalNet]);

  const maxVal = useMemo(() => {
    const highest = Math.max(peakProfit, totalNet, ...points.map(p => p.profit), 50000);
    return highest > 0 ? highest * 1.15 : 100000;
  }, [peakProfit, totalNet, points]);

  const minVal = useMemo(() => {
    const lowest = Math.min(0, totalNet, ...points.map(p => p.profit));
    return lowest < 0 ? lowest * 1.15 : 0;
  }, [totalNet, points]);

  const valueRange = maxVal - minVal || 1;

  // Compute (x, y) coordinates for all points
  const coords = useMemo(() => {
    const usableWidth = SVG_WIDTH - PADDING_X * 2;
    const usableHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    return points.map((p, idx) => {
      const x = PADDING_X + (idx / Math.max(1, points.length - 1)) * usableWidth;
      const normalizedY = (p.profit - minVal) / valueRange;
      const y = SVG_HEIGHT - PADDING_BOTTOM - normalizedY * usableHeight;
      return { x, y, ...p };
    });
  }, [points, minVal, valueRange]);

  // Find Peak Index
  const peakIndex = useMemo(() => {
    let bestIdx = 0;
    let highest = -Infinity;
    coords.forEach((c, idx) => {
      if (c.profit > highest) {
        highest = c.profit;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, [coords]);

  const peakCoord = coords[peakIndex] || coords[coords.length - 1];

  // Current position based on playback progress
  const position = useMemo(() => {
    if (coords.length === 0) return { x: PADDING_X, y: SVG_HEIGHT - PADDING_BOTTOM, profit: 0, isAtPeak: true };
    if (coords.length === 1) return { ...coords[0], isAtPeak: true };

    const totalSegments = coords.length - 1;
    const targetPos = playbackProgress * totalSegments;
    const segIdx = Math.min(Math.floor(targetPos), totalSegments - 1);
    const segFrac = targetPos - segIdx;

    const p1 = coords[segIdx];
    const p2 = coords[segIdx + 1] || p1;

    const x = p1.x + (p2.x - p1.x) * segFrac;
    const y = p1.y + (p2.y - p1.y) * segFrac;
    const profit = Math.round(p1.profit + (p2.profit - p1.profit) * segFrac);
    const isAtPeak = profit >= (peakCoord.profit - 500) && peakCoord.profit > 0;

    return { x, y, profit, isAtPeak, date: p2.date };
  }, [coords, playbackProgress, peakCoord]);

  // Mountain Area Path & Trail Line Path
  const { pathData, areaData } = useMemo(() => {
    if (coords.length === 0) return { pathData: "", areaData: "" };

    let p = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      p += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }

    const groundY = SVG_HEIGHT - PADDING_BOTTOM;
    const a = `${p} L ${coords[coords.length - 1].x} ${groundY} L ${coords[0].x} ${groundY} Z`;

    return { pathData: p, areaData: a };
  }, [coords]);

  // Replay Ascent Animation Loop
  useEffect(() => {
    if (!isPlaying) return;

    let startTime = null;
    const DURATION = 5000;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / DURATION);
      setPlaybackProgress(progress);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setIsPlaying(false);
        setIsSummitCelebration(true);
        playProfitFanfare();
        setTimeout(() => setIsSummitCelebration(false), 4000);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  const handleStartReplay = () => {
    setPlaybackProgress(0);
    setIsPlaying(true);
    playMeditationChime();
  };

  const handleResetToToday = () => {
    setIsPlaying(false);
    setPlaybackProgress(1);
  };

  const fmtINR = (val) => "₹" + Math.abs(val || 0).toLocaleString("en-IN");
  const fmtSigned = (val) => (val >= 0 ? "+" : "-") + "₹" + Math.abs(val || 0).toLocaleString("en-IN");

  // IF COLLAPSED: Sleek Compact Bar that opens when clicked
  if (!isExpanded) {
    return (
      <div
        className="glass-card"
        onClick={() => setIsExpanded(true)}
        style={{
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          cursor: "pointer",
          borderRadius: 12,
          transition: "all 0.2s ease",
        }}
        title="Click to expand P&L Mountain terrain"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--color-gold-soft)",
              border: "1px solid var(--color-gold-border)",
              color: "var(--color-gold)",
              flexShrink: 0,
            }}
          >
            <Mountain size={16} />
          </span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", letterSpacing: "0.02em" }}>
                P&L Mountain Ascent
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 7px",
                  borderRadius: 12,
                  background: "var(--color-win-soft)",
                  color: "var(--color-win-text)",
                  border: "1px solid var(--color-win-border)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Flag size={10} /> PEAK {fmtINR(peakProfit)}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
              Current Altitude: <strong style={{ color: totalNet >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>{fmtSigned(totalNet)}</strong> · Click to open terrain & summit flag
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            borderRadius: 6,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--color-gold)",
            fontSize: 11.5,
            fontWeight: 650,
            cursor: "pointer",
          }}
        >
          <Mountain size={13} /> Open Mountain ▾
        </button>
      </div>
    );
  }

  // IF EXPANDED: Full Mountain Terrain View (without 3D avatar, with waving peak flag)
  return (
    <div
      className="glass-card"
      style={{
        padding: "16px 20px",
        position: "relative",
        overflow: "hidden",
        borderRadius: 14,
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 12,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--color-gold-soft)",
                border: "1px solid var(--color-gold-border)",
                color: "var(--color-gold)",
              }}
            >
              <Mountain size={16} />
            </span>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--text-main)",
              }}
            >
              P&L Mountain Ascent
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 650,
                padding: "2px 8px",
                borderRadius: 20,
                background: position.isAtPeak ? "var(--color-win-soft)" : "var(--color-gold-soft)",
                color: position.isAtPeak ? "var(--color-win-text)" : "var(--color-gold)",
                border: `1px solid ${position.isAtPeak ? "var(--color-win-border)" : "var(--color-gold-border)"}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Flag size={10} /> {position.isAtPeak ? "AT SUMMIT (PEAK)" : "ASCENDING RIDGE"}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 3 }}>
            Cumulative trading profit trajectory climbing toward the summit flag
          </div>
        </div>

        {/* Telemetry & Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>Current Altitude</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: position.profit >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
              {position.profit >= 0 ? "+" : ""}{fmtINR(position.profit)}
            </div>
          </div>

          <div
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>Peak Summit</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--color-gold)" }}>
              {fmtINR(peakProfit)}
            </div>
          </div>

          {isPlaying ? (
            <button
              onClick={() => setIsPlaying(false)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: "var(--color-loss-soft)",
                border: "1px solid var(--color-loss-border)",
                color: "var(--color-loss-text)",
                fontSize: 11,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handleStartReplay}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 6,
                background: "var(--color-gold-soft)",
                border: "1px solid var(--color-gold-border)",
                color: "var(--color-gold)",
                fontSize: 11,
                fontWeight: 650,
                cursor: "pointer",
              }}
              title="Watch profit trail re-climb from Day 1 to Today"
            >
              <Play size={11} fill="var(--color-gold)" /> Replay Trail
            </button>
          )}

          {playbackProgress < 1 && !isPlaying && (
            <button
              onClick={handleResetToToday}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                borderRadius: 6,
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={11} /> Today
            </button>
          )}

          {/* Collapse Button */}
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 6,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              fontSize: 11,
              fontWeight: 650,
              cursor: "pointer",
            }}
            title="Minimize mountain view"
          >
            <ChevronUp size={13} /> Collapse
          </button>
        </div>
      </div>

      {/* Mountain SVG Canvas */}
      <div style={{ position: "relative", width: "100%", height: 260 }}>
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{ width: "100%", height: "100%", overflow: "visible" }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="mountainRidgeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.4} />
              <stop offset="40%" stopColor="var(--color-win)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--bg-card)" stopOpacity={0.9} />
            </linearGradient>

            <linearGradient id="trailLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8E9FBE" stopOpacity={0.5} />
              <stop offset="60%" stopColor="var(--color-gold)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#FFE39B" stopOpacity={1} />
            </linearGradient>

            <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Mountain Silhouette Range (Parallax Depth) */}
          <path
            d={`M 0 ${SVG_HEIGHT - PADDING_BOTTOM} 
               L 120 150 L 220 190 L 340 120 L 480 170 L 620 90 L 720 140 L ${SVG_WIDTH} ${SVG_HEIGHT - PADDING_BOTTOM} Z`}
            fill="var(--border-subtle)"
            opacity="0.4"
          />

          {/* Base Camp Ground Line */}
          <line
            x1={PADDING_X - 20}
            y1={SVG_HEIGHT - PADDING_BOTTOM}
            x2={SVG_WIDTH - PADDING_X + 20}
            y2={SVG_HEIGHT - PADDING_BOTTOM}
            stroke="var(--border-subtle)"
            strokeDasharray="4 4"
          />
          <text
            x={PADDING_X}
            y={SVG_HEIGHT - PADDING_BOTTOM + 20}
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            BASE CAMP (₹0)
          </text>

          {/* Active Mountain Area & Trail Curve */}
          {areaData && <path d={areaData} fill="url(#mountainRidgeGrad)" />}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke="url(#trailLineGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#goldGlow)"
            />
          )}

          {/* Milestone Camps along the Ridge */}
          {coords.map((c, i) => {
            if (i === 0 || i === coords.length - 1 || i === peakIndex || (i % 4 === 0 && coords.length > 8)) {
              const isPeak = i === peakIndex;
              return (
                <g key={i}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isPeak ? 5 : 3}
                    fill={isPeak ? "var(--color-gold)" : "var(--color-win)"}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                </g>
              );
            }
            return null;
          })}

          {/* THE AWESOME WAVING GOLDEN SUMMIT FLAG (Preserved & Highlighted!) */}
          {peakCoord && (
            <g transform={`translate(${peakCoord.x}, ${peakCoord.y})`}>
              {/* Flag Pole */}
              <line x1="0" y1="0" x2="0" y2="-42" stroke="var(--color-gold)" strokeWidth="2.5" />
              {/* Golden Sunburst behind flag */}
              <circle cx="0" cy="-42" r="5" fill="#FFE39B" filter="url(#goldGlow)" />
              {/* Waving Golden Flag Banner */}
              <path
                d="M 0 -42 Q 14 -48 24 -42 Q 14 -36 0 -30 Z"
                fill="url(#trailLineGrad)"
                stroke="#FFE39B"
                strokeWidth="1"
              >
                <animate
                  attributeName="d"
                  dur="1.8s"
                  repeatCount="indefinite"
                  values="
                    M 0 -42 Q 14 -48 24 -42 Q 14 -36 0 -30 Z;
                    M 0 -42 Q 14 -36 24 -42 Q 14 -48 0 -30 Z;
                    M 0 -42 Q 14 -48 24 -42 Q 14 -36 0 -30 Z
                  "
                />
              </path>
              <text
                x="28"
                y="-40"
                fill="var(--color-gold)"
                fontSize="10"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                PEAK {fmtINR(peakProfit)}
              </text>
            </g>
          )}

          {/* Current Trail Position Dot & Glowing Ring (No 3D avatar figure) */}
          <g transform={`translate(${position.x}, ${position.y})`}>
            {/* Pulsing Trail Ring */}
            <circle cx="0" cy="0" r="14" fill="var(--color-gold-soft)" filter="url(#goldGlow)">
              <animate attributeName="r" values="8;18;8" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Center Golden Pivot Point */}
            <circle cx="0" cy="0" r="4.5" fill="var(--color-gold)" stroke="#FFFFFF" strokeWidth="1.5" />

            {/* Position Altitude Badge */}
            <g transform="translate(0, -22)">
              <rect
                x="-40"
                y="-14"
                width="80"
                height="18"
                rx="4"
                fill="var(--bg-elevated)"
                stroke="var(--color-gold-border)"
                strokeWidth="1"
              />
              <text
                x="0"
                y="-1"
                textAnchor="middle"
                fill="var(--text-main)"
                fontSize="9"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                {fmtINR(position.profit)}
              </text>
            </g>
          </g>

          {/* Summit Celebration Flare Layer */}
          {isSummitCelebration && (
            <g transform={`translate(${peakCoord.x}, ${peakCoord.y - 35})`}>
              <circle cx="0" cy="0" r="40" fill="var(--color-gold-soft)" filter="url(#goldGlow)">
                <animate attributeName="r" values="20;60;20" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text
                x="0"
                y="-45"
                fill="var(--color-gold)"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                ★ ALL-TIME HIGH CONQUERED! ★
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Milestone Progress Ladder */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 8,
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px dashed var(--border-subtle)",
        }}
      >
        {[
          { label: "Camp 1: 1 Lakh", target: 100000 },
          { label: "Camp 2: 5 Lakhs", target: 500000 },
          { label: "Camp 3: 10 Lakhs", target: 1000000 },
          { label: "Camp 4: 25 Lakhs", target: 2500000 },
          { label: "Grand Summit: 1 Cr+", target: 10000000 },
        ].map((camp, idx) => {
          const isPassed = totalNet >= camp.target;
          return (
            <div
              key={idx}
              style={{
                background: isPassed ? "var(--color-win-soft)" : "var(--bg-elevated)",
                border: `1px solid ${isPassed ? "var(--color-win-border)" : "var(--border-subtle)"}`,
                borderRadius: 6,
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ color: isPassed ? "var(--color-win-text)" : "var(--text-muted)", fontSize: 11 }}>
                {isPassed ? "✓" : "⛺"}
              </span>
              <div>
                <div style={{ fontSize: 9, color: isPassed ? "var(--color-win-text)" : "var(--text-muted)", fontWeight: 650 }}>
                  {camp.label}
                </div>
                <div className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: isPassed ? "var(--text-main)" : "var(--text-secondary)" }}>
                  {fmtINR(camp.target)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
