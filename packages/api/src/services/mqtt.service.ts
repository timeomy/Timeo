/**
 * MQTT Service for Face Recognition Turnstile Device Communication
 *
 * Handles server → device commands:
 * - Register a member's face on the device (uploadperson)
 * - Delete a member's face from the device (deleteperson(s))
 * - Query registered persons on the device (requestpersons)
 *
 * MQTT topics per device (configurable via turnstile_devices.mqtt_topic):
 *   Request:  {prefix}/request/{deviceId}
 *   Response: {prefix}/response/{deviceId}
 */

import mqtt from "mqtt";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MqttConfig {
  brokerUrl: string;
  username: string;
  password: string;
  topicPrefix: string;
}

interface DeviceCommand {
  version: string;
  cmd: string;
  [key: string]: unknown;
}

interface DeviceResponse {
  reply: string;
  cmd: string;
  code: number;
  [key: string]: unknown;
}

// ─── State ──────────────────────────────────────────────────────────────────

let client: mqtt.MqttClient | null = null;
let config: MqttConfig | null = null;

// Pending command responses (keyed by command_id)
const pendingResponses = new Map<
  string,
  {
    resolve: (response: DeviceResponse) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

// ─── Initialization ─────────────────────────────────────────────────────────

export function initMqtt(): void {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    console.log("MQTT: not configured (set MQTT_BROKER_URL to enable turnstile integration)");
    return;
  }

  config = {
    brokerUrl,
    username: process.env.MQTT_USERNAME ?? "",
    password: process.env.MQTT_PASSWORD ?? "",
    topicPrefix: process.env.MQTT_TOPIC_PREFIX ?? "topic/face/manage",
  };

  client = mqtt.connect(config.brokerUrl, {
    username: config.username,
    password: config.password,
    reconnectPeriod: 4000,
    connectTimeout: 10000,
    clean: true,
  });

  client.on("connect", () => {
    console.log("MQTT: connected to", config!.brokerUrl);
    // Subscribe to all response topics (wildcard)
    const responseTopic = `${config!.topicPrefix}/response/+`;
    client!.subscribe(responseTopic, (err) => {
      if (err) {
        console.error("MQTT: failed to subscribe to response topic:", err);
      } else {
        console.log("MQTT: subscribed to", responseTopic);
      }
    });
  });

  client.on("message", (_topic, message) => {
    try {
      const response = JSON.parse(message.toString()) as DeviceResponse;
      const commandId = (response as Record<string, unknown>).command_id as
        | string
        | undefined;

      if (commandId && pendingResponses.has(commandId)) {
        const pending = pendingResponses.get(commandId)!;
        clearTimeout(pending.timeout);
        pendingResponses.delete(commandId);
        pending.resolve(response);
      }
    } catch {
      // Ignore non-JSON or unexpected messages
    }
  });

  client.on("error", (err) => {
    console.error("MQTT: connection error:", err.message);
  });

  client.on("reconnect", () => {
    console.log("MQTT: reconnecting...");
  });
}

export function isConnected(): boolean {
  return client?.connected ?? false;
}

// ─── Send Command to Device ─────────────────────────────────────────────────

async function sendCommand(
  deviceMqttTopic: string,
  command: DeviceCommand,
  timeoutMs = 15000,
): Promise<DeviceResponse> {
  if (!client || !config) {
    throw new Error("MQTT not initialized");
  }

  if (!client.connected) {
    throw new Error("MQTT not connected");
  }

  const commandId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = { ...command, command_id: commandId };

  const requestTopic = `${config.topicPrefix}/request/${deviceMqttTopic}`;

  return new Promise<DeviceResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingResponses.delete(commandId);
      reject(new Error(`MQTT command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    pendingResponses.set(commandId, { resolve, reject, timeout });

    client!.publish(requestTopic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) {
        clearTimeout(timeout);
        pendingResponses.delete(commandId);
        reject(new Error(`MQTT publish failed: ${err.message}`));
      }
    });
  });
}

// ─── Register Face on Device ────────────────────────────────────────────────

export async function registerFaceOnDevice(input: {
  mqttTopic: string;
  personId: string;
  personName: string;
  faceImageBase64: string;
  role?: number;
  termStart?: string;
  termEnd?: string;
}): Promise<DeviceResponse> {
  const command: DeviceCommand = {
    version: "0.2",
    cmd: "uploadperson",
    id: input.personId,
    name: input.personName.slice(0, 63), // device limit: 63 bytes
    role: input.role ?? 1, // 1 = whitelist
    reg_image: input.faceImageBase64,
    term_start: input.termStart ?? "useless",
    term: input.termEnd ?? "forever",
    upload_mode: 0, // 0 = auto (add if new, update if exists)
  };

  return sendCommand(input.mqttTopic, command);
}

// ─── Delete Face from Device ────────────────────────────────────────────────

export async function deleteFaceFromDevice(input: {
  mqttTopic: string;
  personId: string;
}): Promise<DeviceResponse> {
  const command: DeviceCommand = {
    version: "0.2",
    cmd: "deleteperson(s)",
    flag: -1, // delete by ID
    id: input.personId,
  };

  return sendCommand(input.mqttTopic, command);
}

// ─── Query Persons on Device ────────────────────────────────────────────────

export async function queryDevicePersons(input: {
  mqttTopic: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<DeviceResponse> {
  const command: DeviceCommand = {
    version: "0.2",
    cmd: "requestpersons",
    role: -1, // all
    page_no: input.pageNo ?? 1,
    page_size: input.pageSize ?? 20,
    feature_flag: 0,
    image_flag: 0,
  };

  return sendCommand(input.mqttTopic, command, 30000);
}

// ─── Force Open Door ───────────────────────────────────────────────────────

export async function sendDoorOpenCommand(input: {
  mqttTopic: string;
}): Promise<DeviceResponse> {
  const command: DeviceCommand = {
    version: "0.2",
    cmd: "gateway_ctrl",
    device_type: "gpio",
    device_no: 1,
    ctrl_mode: "force",
  };

  return sendCommand(input.mqttTopic, command);
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

export function closeMqtt(): void {
  if (client) {
    for (const [, pending] of pendingResponses) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("MQTT client closing"));
    }
    pendingResponses.clear();
    client.end();
    client = null;
  }
}
