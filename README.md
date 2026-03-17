# NeuroWatch

Real-time neural signal monitoring dashboard — 8-channel waveform visualization with end-to-end latency tracking, anomaly detection, and 60Hz live rendering.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEUROWATCH                               │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────────┐
  │  signal_          │  WS    │  Node.js Relay   │  WS    │  Next.js Dashboard   │
  │  generator.py    │──────▶ │  server.js        │──────▶ │  (React + Canvas)    │
  │                  │ :8080  │                  │ :8081  │                      │
  │  8 channels      │        │  - Stamps         │        │  - WaveformChart x8  │
  │  60Hz sine +     │        │    server_ts      │        │  - AlertPanel        │
  │  noise           │        │  - Broadcasts     │        │  - LatencyDisplay    │
  │  anomaly inject  │        │    to all clients │        │  - StatusBar         │
  └──────────────────┘        └──────────────────┘        └──────────────────────┘

  Python (asyncio)            Node.js (ws)                Next.js 14 (App Router)
  port 8080 client            ports 8080 + 8081           port 3000
```

## Setup

Requires: Python 3.10+, Node.js 18+

**Terminal 1 — Signal Generator**
```bash
cd /path/to/NeuroWatch
pip install -r requirements.txt
python signal_generator.py
# Output: Connected. Streaming 8 channels at 60Hz...
```

**Terminal 2 — Relay Server**
```bash
cd /path/to/NeuroWatch/server
npm install
npm start
# Output: Generator server listening on ws://localhost:8080
#         Dashboard server listening on ws://localhost:8081
```

**Terminal 3 — Dashboard**
```bash
cd /path/to/NeuroWatch/dashboard
npm install
npm run dev
# Open http://localhost:3000
```

## Screenshot

<img width="1568" height="760" alt="image" src="https://github.com/user-attachments/assets/b561fc7a-e006-49d9-b3c6-8e0c6ab3363a" />


## Key Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| End-to-end latency (gen_ts → render) | < 100ms | Python → Node → Browser |
| Throughput | 480 samples/sec | 8 channels × 60Hz |
| Anomaly → UI alert | < 200ms | Sub-frame detection |
| Render rate | 60fps | Canvas RAF loop |
| Memory | Bounded | 300-sample rolling buffers |

## Signal Channels

| Channel | Frequency | Color |
|---------|-----------|-------|
| CH-01 | 0.5 Hz | #00ff88 |
| CH-02 | 1.0 Hz | #00ccff |
| CH-03 | 1.5 Hz | #ff6b6b |
| CH-04 | 2.0 Hz | #ffd93d |
| CH-05 | 2.5 Hz | #c77dff |
| CH-06 | 3.0 Hz | #ff9f43 |
| CH-07 | 0.75 Hz | #48dbfb |
| CH-08 | 1.25 Hz | #ff6b9d |

Anomalies injected randomly every 3–8 seconds: 3–5× amplitude spike, 10–20 sample duration.
