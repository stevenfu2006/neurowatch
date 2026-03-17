"use client";

import { useRef, useEffect, useCallback } from "react";

interface WaveformChartProps {
  channelId: number;
  label: string;
  color: string;
  thresholdValue: number;
  onThresholdChange: (val: number) => void;
  latestValue: number;
  isAnomaly: boolean;
  buffer: number[];
}

const BUFFER_SIZE = 300;
const CHART_HEIGHT = 80;
const Y_MIN = -5;
const Y_MAX = 5;
const GRID_LINES = [-1, -0.5, 0, 0.5, 1];

export default function WaveformChart({
  channelId,
  label,
  color,
  thresholdValue,
  onThresholdChange,
  latestValue,
  isAnomaly,
  buffer,
}: WaveformChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const bufferRef = useRef<number[]>(buffer);

  // Keep bufferRef in sync
  useEffect(() => {
    bufferRef.current = buffer;
  }, [buffer]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const data = bufferRef.current;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#12121f";
    ctx.fillRect(0, 0, W, H);

    const toY = (v: number) => {
      return H - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * H;
    };

    // Grid lines
    for (const gv of GRID_LINES) {
      const y = toY(gv);
      ctx.beginPath();
      ctx.strokeStyle = gv === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)";
      ctx.lineWidth = gv === 0 ? 1 : 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Threshold line (dashed, white)
    if (thresholdValue >= Y_MIN && thresholdValue <= Y_MAX) {
      const ty = toY(thresholdValue);
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.moveTo(0, ty);
      ctx.lineTo(W, ty);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Waveform
    if (data.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    const step = W / (BUFFER_SIZE - 1);

    for (let i = 0; i < data.length; i++) {
      const x = i * step;
      const y = toY(data[i]);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }, [color, thresholdValue]);

  // RAF loop
  useEffect(() => {
    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = CHART_HEIGHT;
    });
    ro.observe(container);

    canvas.width = container.clientWidth;
    canvas.height = CHART_HEIGHT;

    return () => ro.disconnect();
  }, []);

  // Anomaly flash on container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isAnomaly) return;
    container.classList.remove("anomaly-flash");
    void container.offsetWidth; // reflow
    container.classList.add("anomaly-flash");
  }, [isAnomaly]);

  const valueColor =
    Math.abs(latestValue) > Math.abs(thresholdValue)
      ? "#ff3333"
      : color;

  return (
    <div
      style={{
        borderColor: "var(--border)",
        display: "flex",
        alignItems: "stretch",
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        height: `${CHART_HEIGHT + 2}px`,
        position: "relative",
        flexShrink: 0,
      }}
      className={isAnomaly ? "anomaly-flash" : ""}
    >
      {/* Left label */}
      <div
        style={{
          width: 72,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 8px",
          gap: 2,
        }}
      >
        <div
          style={{
            fontFamily: "var(--text-mono)",
            fontSize: 10,
            color: color,
            letterSpacing: "0.1em",
            lineHeight: 1,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--text-mono)",
            fontSize: 11,
            color: valueColor,
            letterSpacing: "0.05em",
            lineHeight: 1,
          }}
        >
          {latestValue >= 0 ? "+" : ""}
          {latestValue.toFixed(3)}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: `${CHART_HEIGHT}px` }}
        />
      </div>

      {/* Right threshold control */}
      <div
        style={{
          width: 88,
          flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 8px",
          gap: 3,
        }}
      >
        <div
          style={{
            fontFamily: "var(--text-mono)",
            fontSize: 9,
            color: "var(--text-secondary)",
            letterSpacing: "0.08em",
          }}
        >
          THRESHOLD
        </div>
        <input
          type="number"
          min={-5}
          max={5}
          step={0.1}
          value={thresholdValue}
          onChange={(e) => onThresholdChange(parseFloat(e.target.value) || 0)}
          style={{
            width: "100%",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "var(--text-mono)",
            fontSize: 11,
            padding: "2px 4px",
            outline: "none",
            appearance: "textfield",
          }}
        />
      </div>
    </div>
  );
}
