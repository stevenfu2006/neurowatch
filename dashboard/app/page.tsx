"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import WaveformChart from "./components/WaveformChart";
import AlertPanel, { Alert } from "./components/AlertPanel";
import LatencyDisplay from "./components/LatencyDisplay";
import StatusBar from "./components/StatusBar";
import ChannelControls from "./components/ChannelControls";

// ---- Constants ----
const WS_URL = "ws://localhost:8081";
const BUFFER_SIZE = 300;
const MAX_ALERTS = 50;
const MAX_LATENCY_HISTORY = 300;
const DEFAULT_THRESHOLD = 2.0;
const RECONNECT_DELAY = 2000;

const CHANNEL_COLORS = [
  "#00ff88", "#00ccff", "#ff6b6b", "#ffd93d",
  "#c77dff", "#ff9f43", "#48dbfb", "#ff6b9d",
];

const CHANNEL_LABELS = [
  "CH-01", "CH-02", "CH-03", "CH-04",
  "CH-05", "CH-06", "CH-07", "CH-08",
];

// ---- Types ----
interface ChannelSample {
  id: number;
  label: string;
  value: number;
  anomaly: boolean;
}

interface SignalMessage {
  t: number;
  gen_ts: number;
  server_ts?: number;
  channels: ChannelSample[];
}

// ---- Helpers ----
function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

function formatClock(d: Date): string {
  const y = d.getFullYear();
  const mo = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const h = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${y}-${mo}-${day}  ${h}:${mi}:${s}`;
}

// ---- Component ----
export default function Home() {
  // Connection state
  const [connStatus, setConnStatus] = useState<"CONNECTED" | "DISCONNECTED" | "RECONNECTING">("DISCONNECTED");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clock
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Channel state
  const [activeChannels, setActiveChannels] = useState<boolean[]>(Array(8).fill(true));
  const [thresholds, setThresholds] = useState<number[]>(Array(8).fill(DEFAULT_THRESHOLD));

  // Rolling buffers (not in React state — updated via refs, drawn by RAF)
  const channelBuffers = useRef<number[][]>(Array.from({ length: 8 }, () => []));
  const [latestValues, setLatestValues] = useState<number[]>(Array(8).fill(0));
  const [anomalyFlags, setAnomalyFlags] = useState<boolean[]>(Array(8).fill(false));

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const anomalyStartRef = useRef<Record<number, { startTs: number; peakValue: number }>>({});

  // Latency
  const latencyHistoryRef = useRef<number[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  // Stats
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [totalSamples, setTotalSamples] = useState(0);
  const [throughput, setThroughput] = useState(0);
  const [fps, setFps] = useState(0);
  const throughputWindowRef = useRef<number[]>([]);

  // FPS tracking
  const lastFrameRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fpsTimerRef.current = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);
    return () => {
      if (fpsTimerRef.current) clearInterval(fpsTimerRef.current);
    };
  }, []);

  // Track frames via RAF
  useEffect(() => {
    let raf: number;
    const tick = () => {
      frameCountRef.current++;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Latency sync to state (throttled to every ~16ms)
  const latencyFlushRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    latencyFlushRef.current = setInterval(() => {
      setLatencyHistory([...latencyHistoryRef.current]);
    }, 100);
    return () => {
      if (latencyFlushRef.current) clearInterval(latencyFlushRef.current);
    };
  }, []);

  // Throughput calc
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - 1000;
      throughputWindowRef.current = throughputWindowRef.current.filter((t) => t > cutoff);
      setThroughput(throughputWindowRef.current.length);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // ---- WebSocket connection ----
  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }

    setConnStatus("RECONNECTING");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnStatus("CONNECTED");
      setConnectedAt(Date.now());
    };

    ws.onmessage = (event) => {
      const clientTs = Date.now();

      let msg: SignalMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      // Latency: full end-to-end
      const latency = clientTs - msg.gen_ts;
      latencyHistoryRef.current.push(latency);
      if (latencyHistoryRef.current.length > MAX_LATENCY_HISTORY) {
        latencyHistoryRef.current.shift();
      }

      // Update buffers
      const newValues = [...latestValues];
      const newAnomalies = Array(8).fill(false);
      const pendingAlerts: Alert[] = [];

      for (const ch of msg.channels) {
        const buf = channelBuffers.current[ch.id];
        buf.push(ch.value);
        if (buf.length > BUFFER_SIZE) buf.shift();

        newValues[ch.id] = ch.value;
        newAnomalies[ch.id] = ch.anomaly;

        // Anomaly tracking for duration
        if (ch.anomaly) {
          if (!anomalyStartRef.current[ch.id]) {
            anomalyStartRef.current[ch.id] = { startTs: clientTs, peakValue: ch.value };
          } else {
            const rec = anomalyStartRef.current[ch.id];
            if (Math.abs(ch.value) > Math.abs(rec.peakValue)) {
              rec.peakValue = ch.value;
            }
          }
        } else if (anomalyStartRef.current[ch.id]) {
          // Anomaly ended
          const rec = anomalyStartRef.current[ch.id];
          const duration = clientTs - rec.startTs;
          pendingAlerts.push({
            id: `${ch.id}-${clientTs}`,
            timestamp: formatTimestamp(clientTs),
            channel: ch.label,
            peakValue: rec.peakValue,
            duration,
            isNew: true,
          });
          delete anomalyStartRef.current[ch.id];
        }
      }

      setLatestValues(newValues);
      setAnomalyFlags(newAnomalies);

      if (pendingAlerts.length > 0) {
        setAlerts((prev) => {
          const merged = [
            ...pendingAlerts,
            ...prev.map((a) => ({ ...a, isNew: false })),
          ].slice(0, MAX_ALERTS);
          return merged;
        });
      }

      // Throughput
      throughputWindowRef.current.push(clientTs);

      // Total samples
      setTotalSamples((n) => n + 1);
    };

    ws.onclose = () => {
      setConnStatus("DISCONNECTED");
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = () => {
      setConnStatus("DISCONNECTED");
      ws.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  // ---- Handlers ----
  const handleToggleChannel = (id: number) => {
    setActiveChannels((prev) => {
      const next = [...prev];
      next[id] = !next[id];
      return next;
    });
  };

  const handleThresholdChange = (id: number, val: number) => {
    setThresholds((prev) => {
      const next = [...prev];
      next[id] = val;
      return next;
    });
  };

  const handleResetThresholds = () => {
    setThresholds(Array(8).fill(DEFAULT_THRESHOLD));
  };

  const handleClearAlerts = () => {
    setAlerts([]);
  };

  // ---- Status dot ----
  const statusDotColor =
    connStatus === "CONNECTED"
      ? "#00ff88"
      : connStatus === "RECONNECTING"
      ? "#ffd93d"
      : "#ff3333";

  const statusLabel = connStatus;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      {/* ---- Header ---- */}
      <header
        style={{
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          height: 40,
          flexShrink: 0,
          gap: 16,
        }}
      >
        {/* Left: branding */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--text-mono)",
              fontSize: 14,
              letterSpacing: "0.2em",
              color: "#00ccff",
            }}
          >
            NEUROWATCH
          </span>
          <span
            style={{
              fontFamily: "var(--text-mono)",
              fontSize: 9,
              color: "var(--text-secondary)",
              letterSpacing: "0.1em",
            }}
          >
            v1.0.0
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Center: connection status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            className={connStatus === "CONNECTED" ? "" : "dot-pulse"}
            style={{
              width: 6,
              height: 6,
              background: statusDotColor,
              flexShrink: 0,
              boxShadow: `0 0 6px ${statusDotColor}`,
            }}
          />
          <span
            style={{
              fontFamily: "var(--text-mono)",
              fontSize: 10,
              color: statusDotColor,
              letterSpacing: "0.15em",
            }}
          >
            {statusLabel}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Right: clock */}
        <span
          style={{
            fontFamily: "var(--text-mono)",
            fontSize: 11,
            color: "var(--text-secondary)",
            letterSpacing: "0.08em",
          }}
        >
          {clock}
        </span>
      </header>

      {/* ---- Channel controls bar ---- */}
      <ChannelControls
        activeChannels={activeChannels}
        onToggleChannel={handleToggleChannel}
        onResetThresholds={handleResetThresholds}
        onClearAlerts={handleClearAlerts}
      />

      {/* ---- Main content ---- */}
      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Charts column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            gap: 1,
            padding: "1px",
            minWidth: 0,
          }}
        >
          {Array.from({ length: 8 }, (_, i) => {
            if (!activeChannels[i]) return null;
            return (
              <WaveformChart
                key={i}
                channelId={i}
                label={CHANNEL_LABELS[i]}
                color={CHANNEL_COLORS[i]}
                thresholdValue={thresholds[i]}
                onThresholdChange={(val) => handleThresholdChange(i, val)}
                latestValue={latestValues[i]}
                isAnomaly={anomalyFlags[i]}
                buffer={channelBuffers.current[i]}
              />
            );
          })}
        </div>

        {/* Right sidebar */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {/* Alert panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <AlertPanel alerts={alerts} />
          </div>

          {/* Latency display */}
          <LatencyDisplay latencyHistory={latencyHistory} />
        </div>
      </div>

      {/* ---- Status bar ---- */}
      <StatusBar
        connectedAt={connectedAt}
        totalSamples={totalSamples}
        throughput={throughput}
        fps={fps}
      />
    </div>
  );
}
