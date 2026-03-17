"use client";

const CHANNEL_COLORS = [
  "#00ff88", "#00ccff", "#ff6b6b", "#ffd93d",
  "#c77dff", "#ff9f43", "#48dbfb", "#ff6b9d",
];

interface ChannelControlsProps {
  activeChannels: boolean[];
  onToggleChannel: (id: number) => void;
  onResetThresholds: () => void;
  onClearAlerts: () => void;
}

export default function ChannelControls({
  activeChannels,
  onToggleChannel,
  onResetThresholds,
  onClearAlerts,
}: ChannelControlsProps) {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "5px 10px",
        gap: 8,
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: "var(--text-mono)",
          fontSize: 9,
          color: "var(--text-secondary)",
          letterSpacing: "0.15em",
          marginRight: 4,
        }}
      >
        CHANNELS
      </span>

      {activeChannels.map((active, i) => (
        <button
          key={i}
          onClick={() => onToggleChannel(i)}
          style={{
            fontFamily: "var(--text-mono)",
            fontSize: 9,
            letterSpacing: "0.08em",
            padding: "2px 6px",
            background: active ? `${CHANNEL_COLORS[i]}18` : "transparent",
            border: `1px solid ${active ? CHANNEL_COLORS[i] : "var(--border)"}`,
            color: active ? CHANNEL_COLORS[i] : "var(--text-secondary)",
            cursor: "pointer",
            transition: "all 0.1s",
          }}
        >
          CH-{(i + 1).toString().padStart(2, "0")}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      <button
        onClick={onResetThresholds}
        style={{
          fontFamily: "var(--text-mono)",
          fontSize: 9,
          letterSpacing: "0.08em",
          padding: "2px 8px",
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          cursor: "pointer",
        }}
      >
        RESET THRESHOLDS
      </button>

      <button
        onClick={onClearAlerts}
        style={{
          fontFamily: "var(--text-mono)",
          fontSize: 9,
          letterSpacing: "0.08em",
          padding: "2px 8px",
          background: "transparent",
          border: "1px solid rgba(255,51,51,0.4)",
          color: "rgba(255,51,51,0.7)",
          cursor: "pointer",
        }}
      >
        CLEAR ALERTS
      </button>
    </div>
  );
}
