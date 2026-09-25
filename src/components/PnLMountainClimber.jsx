import React, { useState, useEffect, useRef, useMemo } from "react";
import { Mountain, Flag, Trophy, Play, RotateCcw, Sparkles, Compass, ShieldAlert, Award } from "lucide-react";
import { playProfitFanfare, playMeditationChime } from "../utils/avatarAudio";

export default function PnLMountainClimber({ curve = [], totalNet = 0, peakProfit = 0, startingCapital = 500000 }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(1); // 0 to 1
  const [isSummitCelebration, setIsSummitCelebration] = useState(false);
  const animFrameRef = useRef(null);

  // Normalize points for SVG mountain canvas (width: 800, height: 320)
  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 300;
  const PADDING_X = 60;
  const PADDING_TOP = 50;
  const PADDING_BOTTOM = 60;

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

  // Current climber position based on playback progress
  const climber = useMemo(() => {
    if (coords.length === 0) return { x: PADDING_X, y: SVG_HEIGHT - PADDING_BOTTOM, profit: 0, angle: 0, isAtPeak: true };
    if (coords.length === 1) return { ...coords[0], angle: 0, isAtPeak: true };

    const totalSegments = coords.length - 1;
    const targetPos = playbackProgress * totalSegments;
    const segIdx = Math.min(Math.floor(targetPos), totalSegments - 1);
    const segFrac = targetPos - segIdx;

    const p1 = coords[segIdx];
    const p2 = coords[segIdx + 1] || p1;

    const x = p1.x + (p2.x - p1.x) * segFrac;
    const y = p1.y + (p2.y - p1.y) * segFrac;
    const profit = Math.round(p1.profit + (p2.profit - p1.profit) * segFrac);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const isAtPeak = profit >= (peakCoord.profit - 500) && peakCoord.profit > 0;

    return { x, y, profit, angle, isAtPeak, date: p2.date };
  }, [coords, playbackProgress, peakCoord]);

  // Mountain Area Path & Trail Line Path
  const { pathData, areaData } = useMemo(() => {
    if (coords.length === 0) return { pathData: "", areaData: "" };

    let p = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      // Smooth cubic bezier curves for realistic mountain slope
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
    const DURATION = 6000; // 6 seconds full trek

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
        setTimeout(() => setIsSummitCelebration(false), 4500);
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

  const fmtINR = (val) => "₹" + Math.abs(val).toLocaleString("en-IN");

  return (
    <div
      className="glass-card"
      style={{
        padding: "20px 22px",
        background: "linear-gradient(180deg, #091326 0%, #060B18 100%)",
        border: "1px solid rgba(229, 184, 105, 0.22)",
        position: "relative",
        overflow: "hidden",
        boxShadow: "inset 0 1px 0 rgba(229, 184, 105, 0.15), 0 12px 40px rgba(3, 8, 20, 0.7)",
      }}
    >
      {/* Background Mountain Aurora & Starlight */}
      <div
        style={{
          position: "absolute",
          top: -50,
          right: "15%",
          width: 320,
          height: 180,
          background: "radial-gradient(circle, rgba(229, 184, 105, 0.12) 0%, rgba(20, 36, 71, 0.2) 60%, transparent 80%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
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
                background: "rgba(229, 184, 105, 0.15)",
                border: "1px solid rgba(229, 184, 105, 0.35)",
                color: "var(--color-gold)",
              }}
            >
              <Mountain size={16} />
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-main)",
              }}
            >
              Bharat's Live P&L Mountain Ascent
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 650,
                padding: "2px 8px",
                borderRadius: 20,
                background: climber.isAtPeak ? "var(--color-win-soft)" : "rgba(229, 184, 105, 0.12)",
                color: climber.isAtPeak ? "var(--color-win-text)" : "var(--color-gold)",
                border: `1px solid ${climber.isAtPeak ? "var(--color-win-border)" : "var(--color-gold-border)"}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {climber.isAtPeak ? (
                <>
                  <Flag size={10} /> AT SUMMIT (PEAK PROFIT)
                </>
              ) : (
                <>
                  <Compass size={10} /> CLIMBING ELEVATION
                </>
              )}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            Watch Bharat scale the mountain terrain as cumulative trading profits expand toward ₹20 Crore
          </div>
        </div>

        {/* Live Elevation Telemetry & Replay Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(12, 22, 45, 0.8)",
              border: "1px solid rgba(229, 184, 105, 0.25)",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Current Altitude
            </div>
            <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: climber.profit >= 0 ? "var(--color-win-text)" : "var(--color-loss-text)" }}>
              {climber.profit >= 0 ? "+" : ""}{fmtINR(climber.profit)}
            </div>
          </div>

          <div
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(12, 22, 45, 0.8)",
              border: "1px solid rgba(229, 184, 105, 0.25)",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Peak Summit (ATH)
            </div>
            <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-gold)" }}>
              {fmtINR(peakProfit)}
            </div>
          </div>

          {isPlaying ? (
            <button
              onClick={() => setIsPlaying(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: "rgba(244, 63, 94, 0.2)",
                border: "1px solid rgba(244, 63, 94, 0.4)",
                color: "#FB7185",
                fontSize: 11.5,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              Pause Trek
            </button>
          ) : (
            <button
              onClick={handleStartReplay}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: "linear-gradient(135deg, rgba(229, 184, 105, 0.25) 0%, rgba(20, 36, 71, 0.8) 100%)",
                border: "1px solid var(--color-gold)",
                color: "var(--text-main)",
                fontSize: 11.5,
                fontWeight: 650,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
              title="Watch Bharat re-climb from Day 1 to Today"
            >
              <Play size={12} fill="var(--color-gold)" color="var(--color-gold)" /> Replay Mountain Ascent
            </button>
          )}

          {playbackProgress < 1 && !isPlaying && (
            <button
              onClick={handleResetToToday}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "8px 10px",
                borderRadius: 8,
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
                fontSize: 11,
                cursor: "pointer",
              }}
              title="Return to today's live altitude"
            >
              <RotateCcw size={12} /> Today
            </button>
          )}
        </div>
      </div>

      {/* Mountain SVG Canvas */}
      <div style={{ position: "relative", width: "100%", height: 320 }}>
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{ width: "100%", height: "100%", overflow: "visible" }}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Mountain Gradient Fill */}
            <linearGradient id="mountainRidgeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E5B869" stopOpacity="0.45" />
              <stop offset="35%" stopColor="#1C3564" stopOpacity="0.30" />
              <stop offset="75%" stopColor="#0B162E" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#060B18" stopOpacity="0.95" />
            </linearGradient>

            {/* Trail Stroke Gradient */}
            <linearGradient id="trailLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8E9FBE" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#E5B869" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F5DEB3" stopOpacity="1" />
            </linearGradient>

            {/* Glowing Golden Trail Filter */}
            <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Avatar Head Pattern Clip */}
            <clipPath id="avatarClip">
              <circle cx="0" cy="0" r="14" />
            </clipPath>
          </defs>

          {/* Background Mountain Silhouette Range (Parallax Depth) */}
          <path
            d={`M 0 ${SVG_HEIGHT - PADDING_BOTTOM} 
               L 120 180 L 220 220 L 340 140 L 480 200 L 620 110 L 720 160 L ${SVG_WIDTH} ${SVG_HEIGHT - PADDING_BOTTOM} Z`}
            fill="rgba(15, 29, 58, 0.45)"
          />
          <path
            d={`M 0 ${SVG_HEIGHT - PADDING_BOTTOM} 
               L 80 210 L 200 160 L 320 190 L 440 120 L 580 170 L 700 90 L ${SVG_WIDTH} ${SVG_HEIGHT - PADDING_BOTTOM} Z`}
            fill="rgba(20, 38, 77, 0.35)"
          />

          {/* Base Camp Ground Line */}
          <line
            x1={PADDING_X - 20}
            y1={SVG_HEIGHT - PADDING_BOTTOM}
            x2={SVG_WIDTH - PADDING_X + 20}
            y2={SVG_HEIGHT - PADDING_BOTTOM}
            stroke="rgba(229, 184, 105, 0.2)"
            strokeDasharray="4 4"
          />
          <text
            x={PADDING_X}
            y={SVG_HEIGHT - PADDING_BOTTOM + 22}
            fill="#8E9FBE"
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
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#goldGlow)"
            />
          )}

          {/* Golden Milestone Camps along the Ridge */}
          {coords.map((c, i) => {
            // Show camp nodes on every few points or major turns
            if (i === 0 || i === coords.length - 1 || i === peakIndex || (i % 4 === 0 && coords.length > 8)) {
              const isPeak = i === peakIndex;
              return (
                <g key={i}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isPeak ? 5 : 3.5}
                    fill={isPeak ? "#E5B869" : "#10B981"}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  {isPeak && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="10"
                      fill="none"
                      stroke="#E5B869"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.8"
                    />
                  )}
                </g>
              );
            }
            return null;
          })}

          {/* Peak Profit Flag (Permanent Summit Marker) */}
          {peakCoord && (
            <g transform={`translate(${peakCoord.x}, ${peakCoord.y})`}>
              {/* Flag Pole */}
              <line x1="0" y1="0" x2="0" y2="-44" stroke="#E5B869" strokeWidth="2.5" />
              {/* Golden Sunburst behind flag */}
              <circle cx="0" cy="-44" r="5" fill="#FFE39B" filter="url(#goldGlow)" />
              {/* Waving Golden Flag Banner */}
              <path
                d="M 0 -44 Q 14 -50 24 -44 Q 14 -38 0 -32 Z"
                fill="url(#trailLineGrad)"
                stroke="#FFE39B"
                strokeWidth="1"
              >
                <animate
                  attributeName="d"
                  dur="1.8s"
                  repeatCount="indefinite"
                  values="
                    M 0 -44 Q 14 -50 24 -44 Q 14 -38 0 -32 Z;
                    M 0 -44 Q 14 -38 24 -44 Q 14 -50 0 -32 Z;
                    M 0 -44 Q 14 -50 24 -44 Q 14 -38 0 -32 Z
                  "
                />
              </path>
              <text
                x="30"
                y="-42"
                fill="#E5B869"
                fontSize="10"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                PEAK {fmtINR(peakProfit)}
              </text>
            </g>
          )}

          {/* THE LIVE BHARAT CLIMBER AVATAR */}
          <g transform={`translate(${climber.x}, ${climber.y})`}>
            {/* Golden Trail Footstep Rings */}
            <circle cx="0" cy="0" r="18" fill="rgba(229, 184, 105, 0.18)" filter="url(#goldGlow)">
              <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Climber Silhouette Body & Trekking Gear */}
            <g transform="translate(0, -22)">
              {/* Trekking Pole */}
              <line
                x1="-6"
                y1="12"
                x2="-18"
                y2="24"
                stroke="#E5B869"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-10 0 12; 15 0 12; -10 0 12"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              </line>

              {/* Mountaineering Backpack */}
              <rect x="-16" y="2" width="8" height="12" rx="3" fill="#D4AF37" />

              {/* Bharat Avatar Head Circle with Clean Shaven Face Image */}
              <circle cx="0" cy="-4" r="14" fill="#0C162D" stroke="#E5B869" strokeWidth="2" />
              <g transform="translate(0, -4)">
                <image
                  href="/avatars/bharat_standing.jpg"
                  x="-14"
                  y="-14"
                  width="28"
                  height="28"
                  clipPath="url(#avatarClip)"
                  preserveAspectRatio="xMidYMid slice"
                />
              </g>

              {/* Climbing Helmet with Gold Crest */}
              <path d="M -12 -12 Q 0 -22 12 -12 Z" fill="#E5B869" />
              <circle cx="0" cy="-14" r="2.5" fill="#FFFFFF" />

              {/* Live Climbing Legs Motion */}
              <g stroke="#E5B869" strokeWidth="2.5" strokeLinecap="round">
                {/* Left Leg */}
                <line x1="-3" y1="14" x2="-8" y2="22">
                  <animate
                    attributeName="y2"
                    values="22;18;22"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </line>
                {/* Right Leg */}
                <line x1="3" y1="14" x2="8" y2="22">
                  <animate
                    attributeName="y2"
                    values="18;22;18"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </line>
              </g>
            </g>

            {/* Live Position Tooltip Callout */}
            <g transform="translate(0, -64)">
              <rect
                x="-55"
                y="-18"
                width="110"
                height="24"
                rx="6"
                fill="#0C162D"
                stroke="rgba(229, 184, 105, 0.45)"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="-2"
                textAnchor="middle"
                fill="#FBF9F5"
                fontSize="10"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                Bharat {fmtINR(climber.profit)}
              </text>
            </g>
          </g>

          {/* Summit Celebration Golden Flare Layer */}
          {isSummitCelebration && (
            <g transform={`translate(${peakCoord.x}, ${peakCoord.y - 40})`}>
              <circle cx="0" cy="0" r="50" fill="rgba(229, 184, 105, 0.25)" filter="url(#goldGlow)">
                <animate attributeName="r" values="30;80;30" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text
                x="0"
                y="-55"
                fill="#FFE39B"
                fontSize="12"
                fontWeight="800"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                ★ ALL-TIME HIGH SUMMIT CONQUERED! ★
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Milestone Progress Ladder */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 8,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px dashed rgba(229, 184, 105, 0.18)",
        }}
      >
        {[
          { label: "Camp 1: First 1 Lakh", target: 100000 },
          { label: "Camp 2: 5 Lakhs", target: 500000 },
          { label: "Camp 3: 10 Lakhs", target: 1000000 },
          { label: "Camp 4: 25 Lakhs", target: 2500000 },
          { label: "Grand Summit: 1 Crore+", target: 10000000 },
        ].map((camp, idx) => {
          const isPassed = totalNet >= camp.target;
          return (
            <div
              key={idx}
              style={{
                background: isPassed ? "rgba(16, 185, 129, 0.1)" : "rgba(12, 22, 45, 0.6)",
                border: `1px solid ${isPassed ? "rgba(16, 185, 129, 0.35)" : "rgba(229, 184, 105, 0.12)"}`,
                borderRadius: 8,
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ color: isPassed ? "var(--color-win-text)" : "var(--text-muted)", fontSize: 13 }}>
                {isPassed ? "✓" : "⛺"}
              </span>
              <div>
                <div style={{ fontSize: 9.5, color: isPassed ? "var(--color-win-text)" : "var(--text-muted)", fontWeight: 650 }}>
                  {camp.label}
                </div>
                <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: isPassed ? "var(--text-main)" : "var(--text-secondary)" }}>
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
