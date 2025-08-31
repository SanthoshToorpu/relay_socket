import { heartbeat, keepAlive } from "./utils/keepalive.js"
import { WebSocketServer } from "ws"
import WebSocket from "ws"

const CLUSTER_WS_URL = process.env.CLUSTER_WS_URL || "wss://129.80.218.9.nip.io/ws/agent"
const BEARER_TOKEN = process.env.BEARER_TOKEN || "<your_service_account_token>"

console.log("CLUSTER_WS_URL =", JSON.stringify(process.env.CLUSTER_WS_URL));
console.log("BEARER_TOKEN =", process.env.BEARER_TOKEN ? "<set>" : "<missing>");

const wss = new WebSocketServer({ port: Number(process.env.PORT) })

wss.on("connection", (client) => {
	console.log("🌐 Browser connected to relay")

	// Connect to your cluster WS with Authorization header
	const backendWS = new WebSocket(CLUSTER_WS_URL, {
		headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
		rejectUnauthorized: false // 🚨 remove once you have valid SSL
	})

	backendWS.on("open", () => console.log("✅ Relay connected to cluster WS"))

	// Relay messages from browser → backend
	client.on("message", (msg) => {
		if (backendWS.readyState === WebSocket.OPEN) {
			backendWS.send(msg)
		}
	})

	// Relay messages from backend → browser
	backendWS.on("message", (msg) => {
  try {
    const text = msg.toString(); // ensure it's a string
    if (client.readyState === WebSocket.OPEN) {
      client.send(text);
    }
  } catch (err) {
    console.error("❌ Relay parse error:", err);
  }
});


	client.on("close", () => backendWS.close())
	backendWS.on("close", () => client.close())

	client.on("pong", heartbeat)
})

const interval = keepAlive(wss)
wss.on("close", () => clearInterval(interval))
