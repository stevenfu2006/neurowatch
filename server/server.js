/**
 * NeuroWatch Relay Server
 *
 * Port 8080 - accepts ONE signal generator connection
 * Port 8081 - broadcasts to MANY dashboard clients
 */

const { WebSocketServer, WebSocket } = require("ws");

const GENERATOR_PORT = 8080;
const CLIENT_PORT = 8081;

// State
let generator = null;
const dashboardClients = new Set();
let messageCount = 0;
let relayTimes = [];

// --- Generator Server (port 8080) ---
const generatorServer = new WebSocketServer({ port: GENERATOR_PORT });

generatorServer.on("listening", () => {
  console.log(`[NeuroWatch] Generator server listening on ws://localhost:${GENERATOR_PORT}`);
});

generatorServer.on("connection", (ws, req) => {
  if (generator) {
    console.log("[NeuroWatch] Second generator attempted to connect — rejecting.");
    ws.close(1008, "Only one generator allowed");
    return;
  }

  generator = ws;
  console.log(`[NeuroWatch] Generator connected from ${req.socket.remoteAddress}`);

  ws.on("message", (data) => {
    const receiveTime = Date.now();

    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      console.error("[NeuroWatch] Failed to parse generator message:", e.message);
      return;
    }

    // Stamp with server receive time
    parsed.server_ts = receiveTime;

    const outgoing = JSON.stringify(parsed);

    // Broadcast to all connected dashboard clients
    let sent = 0;
    for (const client of dashboardClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(outgoing);
        sent++;
      }
    }

    // Track relay timing
    const relayTime = Date.now() - receiveTime;
    relayTimes.push(relayTime);
    if (relayTimes.length > 600) relayTimes.shift();

    messageCount++;

    // Heartbeat every 600 messages (~10 seconds at 60Hz)
    if (messageCount % 600 === 0) {
      const avgRelay =
        relayTimes.length > 0
          ? (relayTimes.reduce((a, b) => a + b, 0) / relayTimes.length).toFixed(2)
          : "0.00";
      console.log(
        `[NeuroWatch] 10s heartbeat: ${dashboardClients.size} client(s) connected, avg relay time ${avgRelay}ms`
      );
    }
  });

  ws.on("close", () => {
    generator = null;
    console.log("[NeuroWatch] Generator disconnected. Waiting for reconnect...");
  });

  ws.on("error", (err) => {
    console.error("[NeuroWatch] Generator error:", err.message);
    generator = null;
  });
});

// --- Dashboard Client Server (port 8081) ---
const clientServer = new WebSocketServer({ port: CLIENT_PORT });

clientServer.on("listening", () => {
  console.log(`[NeuroWatch] Dashboard server listening on ws://localhost:${CLIENT_PORT}`);
});

clientServer.on("connection", (ws, req) => {
  dashboardClients.add(ws);
  console.log(
    `[NeuroWatch] Dashboard client connected (${dashboardClients.size} total) from ${req.socket.remoteAddress}`
  );

  ws.on("close", () => {
    dashboardClients.delete(ws);
    console.log(
      `[NeuroWatch] Dashboard client disconnected (${dashboardClients.size} remaining)`
    );
  });

  ws.on("error", (err) => {
    console.error("[NeuroWatch] Dashboard client error:", err.message);
    dashboardClients.delete(ws);
  });
});

console.log("[NeuroWatch] Server starting...");
