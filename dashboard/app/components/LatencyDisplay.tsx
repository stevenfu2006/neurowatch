"use client";

import { useRef, useEffect } from "react";

interface LatencyDisplayProps {
  latencyHistory: number[];
}

const SPARKLINE_W = 200;
const SPARKLINE_H = 40;
const WINDOW = 60;

export default function LatencyDisplay({ latencyHistory }: LatencyDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const recent = latencyHistory.slice(-WINDOW);
  const current = recent.length > 0 ? recent[recent.length - 1] : 0;
  const avg =
    recent.length > 0
      ? recent.reduce((a, b) => a + b, 0) / recent.length
      : 0;
  const min = recent.length > 0 ? Math.min(...recent) : 0;
  const max = recent.length > 0 ? Math.max(...recent) : 0;

  const latencyColor =
    avg < 100 ? "#00ff88" : avg < 200 ? "#ffd93d" : "#ff3333";

  // Draw sparkline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = SPARKLINE_W;
    const H = SPARKLINE_H;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    if (recent.length < 2) return;

    const dataMax = Math.max(...recent, 50);
    const dataMin = 0;
    const range = dataMax - dataMin || 1;

    const toY = (v: number) => H - ((v - dataMin) / range) * (H - 4) - 2;
    const toX = (i: number) => (i / (WINDOW - 1)) * W;

    // Fill area under sparkline
    ctx.beginPath();
    ctx.moveTo(toX(0), H);
    for (let i = 0; i < recent.length; i++) {
      ctx.lineTo(toX(i), toY(recent[i]));
    }
    ctx.lineTo(toX(recent.length - 1), H);
    ctx.closePath();
    ctx.fillStyle = `${latencyColor}18`;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = latencyColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    for (let i = 0; i < recent.length; i++) {
      if (i === 0) ctx.moveTo(toX(i), toY(recent[i]));
      else ctx.lineTo(toX(i), toY(recent[i]));
    }
    ctx.stroke();

    // 100ms threshold line
    if (100 >= dataMin && 100 <= dataMax) {
      const y100 = toY(100);
      ctx.beginPath();
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = "rgba(255,211,61,0.3)";
      ctx.lineWidth = 0.5;
      ctx.moveTo(0, y100);
      ctx.lineTo(W, y100);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [latencyHistory, latencyColor, recent]);

  const fmt = (v: number) => v.toFixed(1).padStart(6);

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "6px 10px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--text-mono)",
          fontSize: 10,
          letterSpacing: "0.15em",
          color: "var(--text-secondary)",
        }}
      >
        LATENCY (E2E)
      </div>

      <div style={{ padding: "10px" }}>
        {/* Big readouts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          <ReadoutRow label="CUR" value={`${fmt(current)}ms`} color={latencyColor} large />
          <ReadoutRow label="AVG" value={`${fmt(avg)}ms`} color={latencyColor} />
          <div style={{ display: "flex", gap: 6 }}>
            <ReadoutRow label="MIN" value={`${fmt(min)}ms`} color="var(--text-secondary)" />
            <ReadoutRow label="MAX" value={`${fmt(max)}ms`} color={max > 200 ? "#ff3333" : "var(--text-secondary)"} />
          </div>
        </div>

        {/* Sparkline */}
        <canvas
          ref={canvasRef}
          width={SPARKLINE_W}
          height={SPARKLINE_H}
          style={{
            display: "block",
            width: "100%",
            height: `${SPARKLINE_H}px`,
            border: "1px solid var(--border)",
          }}
        />

        {/* Color key */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            fontFamily: "var(--text-mono)",
            fontSize: 8,
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ color: "#00ff88" }}>&lt;100ms OK</span>
          <span style={{ color: "#ffd93d" }}>100-200ms WARN</span>
          <span style={{ color: "#ff3333" }}>&gt;200ms CRIT</span>
        </div>
      </div>
    </div>
  );
}

function ReadoutRow({
  label,
  value,
  color,
  large,
}: {
  label: string;
  value: string;
  color: string;
  large?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span
        style={{
          fontFamily: "var(--text-mono)",
          fontSize: 9,
          color: "var(--text-secondary)",
          letterSpacing: "0.1em",
          width: 28,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--text-mono)",
          fontSize: large ? 20 : 13,
          color,
          letterSpacing: "0.05em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}
