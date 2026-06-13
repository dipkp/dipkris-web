import { WebSocketServer, WebSocket } from "ws";
import { env } from "./lib/env";

const WS_PORT = 3002;

// Global to persist across HMR in dev
const globalForWss = globalThis as unknown as { wss: WebSocketServer };

if (globalForWss.wss) {
  console.log("[WS] Closing previous WebSocket server due to HMR");
  globalForWss.wss.close();
}

// Room state: roomId -> Set<WebSocket>
const rooms = new Map<string, Set<WebSocket>>();

function handleConnection(ws: WebSocket, req: any) {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  ws.on("message", (messageData) => {
    try {
      const msg = JSON.parse(messageData.toString());

      if (msg.type === "join") {
        currentRoomId = msg.roomId;
        currentUserId = msg.userId;
        
        if (!rooms.has(currentRoomId!)) {
          rooms.set(currentRoomId!, new Set());
        }
        rooms.get(currentRoomId!)!.add(ws);
        
        // Notify others
        broadcastToRoom(currentRoomId!, {
          type: "peer_joined",
          peerId: currentUserId
        }, ws);
      } 
      else if (msg.type === "signal") {
        // Forward WebRTC signaling data
        broadcastToRoom(currentRoomId!, {
          type: "signal",
          from: currentUserId,
          target: msg.target, // optional specific peer
          signal: msg.signal
        }, ws);
      }
      else if (["chat", "sync", "magnet", "reaction", "video_change"].includes(msg.type)) {
        // General broadcasting for chat and video sync
        broadcastToRoom(currentRoomId!, msg, ws);
      }
    } catch (err) {
      console.error("[WS Error]", err);
    }
  });

  ws.on("close", () => {
    if (currentRoomId && rooms.has(currentRoomId)) {
      rooms.get(currentRoomId)!.delete(ws);
      if (rooms.get(currentRoomId)!.size === 0) {
        rooms.delete(currentRoomId);
      } else {
        broadcastToRoom(currentRoomId, {
          type: "peer_left",
          peerId: currentUserId
        }, ws);
      }
    }
  });

  function broadcastToRoom(roomId: string, data: any, excludeWs?: WebSocket) {
    const room = rooms.get(roomId);
    if (!room) return;
    const dataStr = JSON.stringify(data);
    for (const client of room) {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        // If msg has a target, only send to that target
        if (data.target && client !== data.target_ws) {
           // We don't track target_ws perfectly yet, so we just broadcast and client filters by target
           client.send(dataStr);
        } else {
           client.send(dataStr);
        }
      }
    }
  }
}

export function setupWebSocketServer(server?: any) {
  let wss: WebSocketServer;
  if (server) {
    wss = new WebSocketServer({ server });
    console.log(`[WS] Signaling server attached to HTTP server`);
  } else {
    wss = new WebSocketServer({ port: WS_PORT });
    console.log(`[WS] Signaling server running on ws://localhost:${WS_PORT}`);
  }
  
  globalForWss.wss = wss;
  wss.on("connection", handleConnection);
  return wss;
}

// In development, we run the WebSocket server on a separate port automatically
if (!env.isProduction) {
  setupWebSocketServer();
}
