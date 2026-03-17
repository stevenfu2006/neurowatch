#!/usr/bin/env python3
"""
NeuroWatch Signal Generator
Generates 8 channels of simulated neural signal data at 60Hz
and streams via WebSocket to the relay server.
"""

import asyncio
import json
import math
import random
import time
import numpy as np
import websockets
from websockets.exceptions import ConnectionClosed

# Channel configuration
CHANNELS = [
    {"id": 0, "label": "CH-01", "freq": 0.5},
    {"id": 1, "label": "CH-02", "freq": 1.0},
    {"id": 2, "label": "CH-03", "freq": 1.5},
    {"id": 3, "label": "CH-04", "freq": 2.0},
    {"id": 4, "label": "CH-05", "freq": 2.5},
    {"id": 5, "label": "CH-06", "freq": 3.0},
    {"id": 6, "label": "CH-07", "freq": 0.75},
    {"id": 7, "label": "CH-08", "freq": 1.25},
]

SAMPLE_RATE = 60       # Hz
NOISE_SIGMA = 0.05
NORMAL_AMP = 1.0
ANOMALY_AMP_MIN = 3.0
ANOMALY_AMP_MAX = 5.0
SERVER_URI = "ws://localhost:8080"


class AnomalyState:
    """Tracks active anomaly injection per channel."""
    def __init__(self):
        self.active = {}       # channel_id -> samples_remaining
        self.amplitude = {}    # channel_id -> spike amplitude

    def tick(self, channel_id: int) -> tuple[bool, float]:
        """Returns (is_anomaly, extra_amplitude)."""
        if channel_id in self.active:
            self.active[channel_id] -= 1
            if self.active[channel_id] <= 0:
                del self.active[channel_id]
                del self.amplitude[channel_id]
                return False, 0.0
            return True, self.amplitude[channel_id]
        return False, 0.0

    def inject(self, channel_id: int):
        duration = random.randint(10, 20)
        amp = random.uniform(ANOMALY_AMP_MIN, ANOMALY_AMP_MAX)
        self.active[channel_id] = duration
        self.amplitude[channel_id] = amp


async def stream_signals(websocket):
    print("Connected. Streaming 8 channels at 60Hz...")

    anomaly_state = AnomalyState()
    t = 0.0
    dt = 1.0 / SAMPLE_RATE

    # Schedule next anomaly injection
    next_anomaly_in = random.uniform(3.0, 8.0)  # seconds
    time_since_last_anomaly = 0.0

    while True:
        loop_start = time.perf_counter()

        now_ms = int(time.time() * 1000)
        gen_ts = now_ms

        channels_data = []
        for ch in CHANNELS:
            # Base sine wave
            base = NORMAL_AMP * math.sin(2 * math.pi * ch["freq"] * t)

            # Gaussian noise
            noise = np.random.normal(0, NOISE_SIGMA)

            is_anomaly, anomaly_amp = anomaly_state.tick(ch["id"])

            if is_anomaly:
                # Spike on top of base signal
                value = anomaly_amp * math.sin(2 * math.pi * ch["freq"] * t) + noise
            else:
                value = base + noise

            channels_data.append({
                "id": ch["id"],
                "label": ch["label"],
                "value": round(float(value), 4),
                "anomaly": is_anomaly,
            })

        message = {
            "t": now_ms,
            "gen_ts": gen_ts,
            "channels": channels_data,
        }

        await websocket.send(json.dumps(message))

        t += dt
        time_since_last_anomaly += dt

        # Check if it's time to inject anomaly
        if time_since_last_anomaly >= next_anomaly_in:
            target_channel = random.randint(0, 7)
            if target_channel not in anomaly_state.active:
                anomaly_state.inject(target_channel)
            time_since_last_anomaly = 0.0
            next_anomaly_in = random.uniform(3.0, 8.0)

        # Maintain 60Hz timing
        elapsed = time.perf_counter() - loop_start
        sleep_time = dt - elapsed
        if sleep_time > 0:
            await asyncio.sleep(sleep_time)


async def main():
    while True:
        try:
            async with websockets.connect(SERVER_URI) as websocket:
                await stream_signals(websocket)
        except (ConnectionClosed, ConnectionRefusedError, OSError) as e:
            print(f"Connection lost: {e}. Retrying in 2 seconds...")
            await asyncio.sleep(2)
        except Exception as e:
            print(f"Unexpected error: {e}. Retrying in 2 seconds...")
            await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())
