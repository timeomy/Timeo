/**
 * Turnstile WebSocket Bridge
 * 
 * Handles WebSocket connections from turnstile devices and forwards commands from HTTP POST requests.
 * 
 * Endpoints:
 * - ws://gate.wsfitness.my/turnstile/socket - WebSocket endpoint for device connections
 * - POST /turnstile/cmd - HTTP endpoint to send commands to connected devices
 */

export interface Env {
  TURNSTILE_SOCKETS: DurableObjectNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  TURNSTILE_SHARED_SECRET: string;
}

// Main worker entry point
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route to appropriate handler
    if (path === "/turnstile/socket") {
      return handleWebSocket(request, env);
    }

    if (path === "/turnstile/cmd" && request.method === "POST") {
      return handleCommand(request, env);
    }

    // Health check
    if (path === "/turnstile/health") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // List connected devices
    if (path === "/turnstile/devices" && request.method === "GET") {
      return handleListDevices(request, env);
    }

    return new Response("Not Found", { status: 404 });
  }
};

// Handle WebSocket upgrade and connection
async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  const upgradeHeader = request.headers.get("Upgrade");
  
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  // Get device ID from query param or generate one
  const url = new URL(request.url);
  const deviceId = url.searchParams.get("device_id") || "default";

  // Route to Durable Object
  const id = env.TURNSTILE_SOCKETS.idFromName(deviceId);
  const stub = env.TURNSTILE_SOCKETS.get(id);

  return stub.fetch(request);
}

// Handle command forwarding
async function handleCommand(request: Request, env: Env): Promise<Response> {
  try {
    // Verify shared secret
    const authHeader = request.headers.get("x-turnstile-secret");
    if (authHeader !== env.TURNSTILE_SHARED_SECRET) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json() as { device_id?: string; command: unknown };
    const deviceId = body.device_id || "default";
    const command = body.command;

    if (!command) {
      return new Response(JSON.stringify({ success: false, error: "Missing command" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Forward to Durable Object
    const id = env.TURNSTILE_SOCKETS.idFromName(deviceId);
    const stub = env.TURNSTILE_SOCKETS.get(id);

    const response = await stub.fetch(new Request("http://internal/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    }));

    return response;
  } catch (error) {
    console.error("Command error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// List connected devices
async function handleListDevices(request: Request, env: Env): Promise<Response> {
  // Note: In production, you'd want to track device IDs in a KV store
  // For now, return a simple status
  return new Response(JSON.stringify({ 
    message: "Device list requires KV storage tracking",
    hint: "Connect devices with ?device_id=XXX parameter"
  }), {
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Durable Object: TurnstileSocketManager
 * 
 * Manages WebSocket connections for a single device.
 * Each device_id gets its own Durable Object instance.
 */
export class TurnstileSocketManager {
  private state: DurableObjectState;
  private env: Env;
  private socket: WebSocket | null = null;
  private deviceId: string = "unknown";
  private lastPing: number = Date.now();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Internal command forwarding
    if (url.pathname === "/send" && request.method === "POST") {
      return this.handleSendCommand(request);
    }

    // WebSocket upgrade
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader?.toLowerCase() === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }

    return new Response("Invalid request", { status: 400 });
  }

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const url = new URL(request.url);
    this.deviceId = url.searchParams.get("device_id") || "default";

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket
    this.state.acceptWebSocket(server);
    this.socket = server;

    console.log(`[WS] Device connected: ${this.deviceId}`);

    // Start keepalive ping
    this.startKeepalive();

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  private async handleSendCommand(request: Request): Promise<Response> {
    try {
      const { command } = await request.json() as { command: unknown };

      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Device not connected",
          device_id: this.deviceId
        }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Send command to device
      const payload = JSON.stringify(command);
      this.socket.send(payload);

      console.log(`[WS] Command sent to ${this.deviceId}:`, payload.substring(0, 100));

      return new Response(JSON.stringify({ 
        success: true, 
        device_id: this.deviceId,
        message: "Command sent"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error(`[WS] Send error for ${this.deviceId}:`, error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Send failed" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  private startKeepalive() {
    // Durable Objects don't support setInterval directly in the same way
    // We'll use the alarm API for keepalive
    this.state.storage.setAlarm(Date.now() + 30000);
  }

  async alarm() {
    // Send ping to keep connection alive
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
        console.log(`[WS] Ping sent to ${this.deviceId}`);
        
        // Schedule next ping
        this.state.storage.setAlarm(Date.now() + 30000);
      } catch (error) {
        console.error(`[WS] Ping failed for ${this.deviceId}:`, error);
      }
    }
  }

  // WebSocket event handlers (called by Durable Object runtime)
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const data = typeof message === "string" ? message : new TextDecoder().decode(message);
    console.log(`[WS] Message from ${this.deviceId}:`, data.substring(0, 200));

    try {
      const parsed = JSON.parse(data);

      // Handle pong response
      if (parsed.type === "pong") {
        this.lastPing = Date.now();
        return;
      }

      // Handle device callback (face recognition event)
      if (parsed.info?.PersonID || parsed.PersonID) {
        await this.handleFaceCallback(parsed);
      }

    } catch (error) {
      console.error(`[WS] Parse error:`, error);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    console.log(`[WS] Device disconnected: ${this.deviceId}, code: ${code}, reason: ${reason}`);
    this.socket = null;
  }

  async webSocketError(ws: WebSocket, error: Event) {
    console.error(`[WS] WebSocket error for ${this.deviceId}:`, error);
    this.socket = null;
  }

  // Handle face recognition callback from device
  private async handleFaceCallback(data: Record<string, unknown>) {
    const personId = (data.info as Record<string, unknown>)?.PersonID || data.PersonID;
    const deviceSn = (data.info as Record<string, unknown>)?.DeviceID || data.DeviceID || this.deviceId;
    const capTime = (data.info as Record<string, unknown>)?.Time || data.Time || new Date().toISOString();

    console.log(`[WS] Face callback - PersonID: ${personId}, Device: ${deviceSn}`);

    try {
      // Call Supabase edge function to check access
      const response = await fetch(`${this.env.SUPABASE_URL}/functions/v1/check-turnstile-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.env.SUPABASE_ANON_KEY}`,
          "x-turnstile-secret": this.env.TURNSTILE_SHARED_SECRET
        },
        body: JSON.stringify({ id: String(personId) })
      });

      const result = await response.json() as { allowed: boolean; name: string; message: string };
      console.log(`[WS] Access check result:`, result);

      // Send response back to device
      const deviceResponse = {
        cmd: "face_verify_result",
        sequence_no: data.sequence_no || Date.now(),
        cap_time: capTime,
        person_id: personId,
        allowed: result.allowed,
        name: result.name,
        message: result.message,
        // Command to open gate if allowed
        ...(result.allowed ? { open_door: true } : {})
      };

      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(deviceResponse));
        console.log(`[WS] Response sent to device:`, deviceResponse);
      }

    } catch (error) {
      console.error(`[WS] Access check error:`, error);
      
      // Send error response to device
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          cmd: "face_verify_result",
          sequence_no: data.sequence_no || Date.now(),
          allowed: false,
          message: "Server Error"
        }));
      }
    }
  }
}
