"use client";

import { useRef, useEffect, useState } from "react";

interface StatusBarProps {
  connectedAt: number | null;
  totalSamples: number;
  throughput: number;
  fps: number;
}

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function StatusBar({
  connectedAt,
  totalSamples,
  throughput,
  fps,
}: StatusBarProps) {
  const [uptime, setUptime] = useState("00:00:00");

  useEffect(() => {
    if (!connectedAt) {
      setUptime("00:00:00");
      return;
    }
    const interval = setInterval(() => {
      setUptime(formatUptime(Date.now() - connectedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [connectedAt]);

  const items = [
    { label: "UPTIME", value: uptime },
    { label: "SAMPLES RX", value: totalSamples.toLocaleString() },
    { label: "THROUGHPUT", value: `${throughput.toFixed(0)} smp/s` },
    { label: "CHANNELS", value: "8 ACTIVE" },
    { label: "FRAME RATE", value: `${fps.toFixed(0)} fps` },
  ];

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        height: 28,
        padding: "0 12px",
        gap: 0,
        flexShrink: 0,
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingRight: 20,
            borderRight: i < items.length - 1 ? "1px solid var(--border)" : "none",
            marginRight: i < items.length - 1 ? 20 : 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--text-mono)",
              fontSize: 9,
              color: "var(--text-secondary)",
              letterSpacing: "0.1em",
            }}
          >
            {item.label}
          </span>
          <span
            style={{
              fontFamily: "var(--text-mono)",
              fontSize: 11,
              color: "var(--text-primary)",
              letterSpacing: "0.05em",
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
