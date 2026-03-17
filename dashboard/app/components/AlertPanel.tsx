"use client";

import { useRef, useEffect } from "react";

export interface Alert {
  id: string;
  timestamp: string;
  channel: string;
  peakValue: number;
  duration: number;
  isNew: boolean;
}

interface AlertPanelProps {
  alerts: Alert[];
}

export default function AlertPanel({ alerts }: AlertPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top on new alert
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "6px 10px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--text-mono)",
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "var(--text-secondary)",
          }}
        >
          ANOMALY LOG
        </span>
        <span
          style={{
            fontFamily: "var(--text-mono)",
            fontSize: 10,
            color: alerts.length > 0 ? "#ff3333" : "var(--text-secondary)",
          }}
        >
          {alerts.length.toString().padStart(3, "0")}
        </span>
      </div>

      {/* Alert list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {alerts.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--text-mono)",
              fontSize: 10,
              color: "var(--text-secondary)",
              letterSpacing: "0.1em",
            }}
          >
            NO ANOMALIES DETECTED
          </div>
        ) : (
          alerts.slice(0, 50).map((alert) => (
            <div
              key={alert.id}
              className={alert.isNew ? "alert-new" : ""}
              style={{
                padding: "4px 10px",
                borderBottom: "1px solid rgba(30,30,58,0.5)",
                fontFamily: "var(--text-mono)",
                fontSize: 10,
                letterSpacing: "0.04em",
                lineHeight: 1.6,
                flexShrink: 0,
              }}
            >
              <div style={{ color: "var(--text-secondary)" }}>{alert.timestamp}</div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  color: "#ff3333",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--text-primary)" }}>{alert.channel}</span>
                <span>PEAK:{alert.peakValue >= 0 ? "+" : ""}{alert.peakValue.toFixed(3)}</span>
                <span>DUR:{alert.duration}ms</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
