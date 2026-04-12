import { Buffer } from "node:buffer";
import WebSocket, { type RawData } from "ws";
import { logger } from "./logger.js";

export interface TurnstileClientOptions {
  ip: string;
  port: number;
  username: string;
  password: string;
  reconnectMs: number;
  httpTimeoutMs: number;
  commandTimeoutMs: number;
}

export interface TurnstilePerson {
  id: string;
  name: string;
  [key: string]: unknown;
}

type TurnstileCommandPayload = Record<string, unknown>;
type TurnstileCommandResponse = Record<string, unknown>;

interface PendingCommand {
  payload: TurnstileCommandPayload;
  expectedCmd: string | null;
  timeoutMs: number;
  resolve: (response: TurnstileCommandResponse) => void;
  reject: (error: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBlob(value: unknown): boolean {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function parseRawData(data: RawData): string | null {
  if (typeof data === "string") {
    return data;
  }

  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString("utf8");
  }

  return null;
}

function buildCommandError(
  commandName: string,
  response: TurnstileCommandResponse,
): Error {
  const code = toInteger(response.code);
  const detail =
    typeof response.desc === "string"
      ? response.desc
      : typeof response.message === "string"
        ? response.message
        : JSON.stringify(response);

  return new Error(
    `${commandName} failed${code !== null ? ` with code ${code}` : ""}: ${detail}`,
  );
}

export class TurnstileClient {
  private readonly options: TurnstileClientOptions;

  private socket: WebSocket | null = null;

  private isConnected = false;

  private isShuttingDown = false;

  private reconnectAttempt = 0;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private connectPromise: Promise<void> | null = null;

  private activeCommand: PendingCommand | null = null;

  private readonly queue: PendingCommand[] = [];

  constructor(options: TurnstileClientOptions) {
    this.options = options;
  }

  getStatus() {
    return {
      connected: this.isSocketConnected(),
      reconnectAttempt: this.reconnectAttempt,
      queueLength: this.queue.length,
      activeCommand: this.activeCommand?.expectedCmd ?? null,
    };
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.isSocketConnected()) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.isShuttingDown = false;

    this.connectPromise = this.connectInternal();

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  async disconnect(): Promise<void> {
    this.isShuttingDown = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const shutdownError = new Error("Turnstile client disconnected");

    if (this.activeCommand) {
      const active = this.activeCommand;
      this.clearActiveCommand();
      active.reject(shutdownError);
    }

    while (this.queue.length > 0) {
      const pending = this.queue.shift();
      pending?.reject(shutdownError);
    }

    if (!this.socket) {
      this.isConnected = false;
      return;
    }

    const socket = this.socket;
    this.socket = null;

    await new Promise<void>((resolve) => {
      let settled = false;

      const finalize = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };

      const timeoutHandle = setTimeout(() => {
        socket.terminate();
        finalize();
      }, 1500);

      socket.once("close", () => {
        clearTimeout(timeoutHandle);
        finalize();
      });

      socket.close();
    });

    this.isConnected = false;
  }

  async enrollFace(
    id: string,
    name: string,
    imageBase64: string,
  ): Promise<TurnstileCommandResponse> {
    const payload: TurnstileCommandPayload = {
      cmd: "upload person",
      id,
      name,
      role: 0,
      kind: 0,
      reg_image: imageBase64,
      term_start: "useless",
      term: "forever",
      customer_text: " ",
      upload_mode: 2,
      wg_card_id: 0,
      worksite_id: "",
    };

    const response = await this.executeCommand(payload);
    this.ensureSuccess("upload person", response);
    return response;
  }

  async deleteFace(id: string): Promise<TurnstileCommandResponse> {
    const payload: TurnstileCommandPayload = {
      cmd: "delete person(s)",
      flag: -1,
      id,
      worksite_id: "",
    };

    const response = await this.executeCommand(payload);
    this.ensureSuccess("delete person(s)", response);
    return response;
  }

  async getPersonCount(): Promise<number> {
    const payload: TurnstileCommandPayload = {
      cmd: "request persons",
      role: -1,
      page_no: 1,
      page_size: 1,
      image_flag: 0,
      query_mode: 0,
      worksite_id: "",
      condition: {
        person_id: "",
        no_feature: 0,
      },
    };

    const response = await this.executeCommand(payload);
    this.ensureSuccess("request persons", response);

    const total = toInteger(response.total) ?? toInteger(response.count);
    if (total !== null) {
      return total;
    }

    if (Array.isArray(response.persons)) {
      return response.persons.length;
    }

    return 0;
  }

  async listPersons(pageSize = 100): Promise<TurnstilePerson[]> {
    const byId = new Map<string, TurnstilePerson>();

    let pageNo = 1;
    let total: number | null = null;

    while (true) {
      const payload: TurnstileCommandPayload = {
        cmd: "request persons",
        role: -1,
        page_no: pageNo,
        page_size: pageSize,
        image_flag: 0,
        query_mode: 0,
        worksite_id: "",
        condition: {
          person_id: "",
          no_feature: 0,
        },
      };

      const response = await this.executeCommand(payload, this.options.commandTimeoutMs * 2);
      this.ensureSuccess("request persons", response);

      const persons = Array.isArray(response.persons)
        ? response.persons.filter(isRecord)
        : [];

      for (const person of persons) {
        const rawId = person.id;
        const id = typeof rawId === "string" ? rawId : String(rawId ?? "");
        if (!id) {
          continue;
        }

        const name =
          typeof person.name === "string" && person.name.trim().length > 0
            ? person.name
            : id;

        byId.set(id, { ...person, id, name });
      }

      const reportedTotal = toInteger(response.total) ?? toInteger(response.count);
      if (reportedTotal !== null) {
        total = reportedTotal;
      }

      if (persons.length === 0) {
        break;
      }

      if (total !== null && byId.size >= total) {
        break;
      }

      pageNo += 1;
    }

    return [...byId.values()];
  }

  private async connectInternal(): Promise<void> {
    const token = await this.authenticate();
    const wsUrl = `ws://${this.options.ip}:${this.options.port}?Basic=${encodeURIComponent(token)}`;

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      let settled = false;

      const fail = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };

      const succeed = () => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        this.bindSocket(socket);
        resolve();
      };

      const timeoutHandle = setTimeout(() => {
        socket.terminate();
        fail(
          new Error(
            `Timed out connecting to turnstile WebSocket after ${this.options.httpTimeoutMs}ms`,
          ),
        );
      }, this.options.httpTimeoutMs);

      const cleanup = () => {
        clearTimeout(timeoutHandle);
        socket.off("open", onOpen);
        socket.off("error", onError);
        socket.off("close", onCloseBeforeOpen);
      };

      const onOpen = () => {
        succeed();
      };

      const onError = (error: Error) => {
        fail(error);
      };

      const onCloseBeforeOpen = (code: number, reason: Buffer) => {
        const reasonText = reason.toString("utf8");
        fail(
          new Error(
            `Turnstile WebSocket closed before open (code ${code}${
              reasonText ? `, reason: ${reasonText}` : ""
            })`,
          ),
        );
      };

      socket.on("open", onOpen);
      socket.on("error", onError);
      socket.on("close", onCloseBeforeOpen);
    });
  }

  private async authenticate(): Promise<string> {
    const basicToken = Buffer.from(
      `${this.options.username}:${this.options.password}`,
    ).toString("base64");

    const controller = new AbortController();
    const timeoutHandle = setTimeout(
      () => controller.abort(),
      this.options.httpTimeoutMs,
    );

    try {
      const response = await fetch(
        `http://${this.options.ip}:${this.options.port}`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cmd: "ping" }),
          signal: controller.signal,
        },
      );

      const rawBody = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${rawBody.slice(0, 200)}`);
      }

      if (!rawBody) {
        return basicToken;
      }

      let parsed: unknown = null;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        parsed = null;
      }

      if (isRecord(parsed)) {
        const tokenCandidate =
          parsed.token ?? parsed.Basic ?? parsed.basic ?? parsed.auth;

        if (
          typeof tokenCandidate === "string" &&
          tokenCandidate.trim().length > 0
        ) {
          return tokenCandidate.trim();
        }
      }

      return basicToken;
    } catch (error) {
      throw new Error(
        `Turnstile HTTP authentication failed: ${(error as Error).message}`,
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private bindSocket(socket: WebSocket): void {
    this.socket = socket;
    this.isConnected = true;
    this.reconnectAttempt = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    socket.on("message", (data, isBinary) => {
      this.handleMessage(data, isBinary);
    });

    socket.on("close", (code, reason) => {
      this.handleSocketClose(code, reason);
    });

    socket.on("error", (error) => {
      logger.error("Turnstile WebSocket error", {
        message: error.message,
      });
    });

    logger.info("Connected to turnstile", {
      ip: this.options.ip,
      port: this.options.port,
    });

    this.processQueue();
  }

  private handleSocketClose(code: number, reason: Buffer): void {
    this.isConnected = false;
    this.socket = null;

    const reasonText = reason.toString("utf8");
    logger.warn("Turnstile WebSocket disconnected", {
      code,
      reason: reasonText,
    });

    if (this.activeCommand) {
      const active = this.activeCommand;
      this.clearActiveCommand();
      active.reject(
        new Error(
          `Turnstile connection dropped while waiting for '${
            active.expectedCmd ?? "command"
          }' response`,
        ),
      );
    }

    if (!this.isShuttingDown) {
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: RawData, isBinary: boolean): void {
    if (isBinary || isBlob(data)) {
      return;
    }

    const rawText = parseRawData(data);
    if (!rawText) {
      return;
    }

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return;
    }

    if (!isRecord(parsed)) {
      return;
    }

    if (!this.activeCommand) {
      return;
    }

    if (!this.matchesCommandResponse(this.activeCommand, parsed)) {
      return;
    }

    const active = this.activeCommand;
    this.clearActiveCommand();
    active.resolve(parsed);
    this.processQueue();
  }

  private matchesCommandResponse(
    command: PendingCommand,
    response: TurnstileCommandResponse,
  ): boolean {
    if (!command.expectedCmd) {
      return true;
    }

    const responseCmd = response.cmd;
    if (typeof responseCmd !== "string") {
      return false;
    }

    return responseCmd === command.expectedCmd;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isShuttingDown) {
      return;
    }

    this.reconnectAttempt += 1;

    const delay = Math.min(
      this.options.reconnectMs * this.reconnectAttempt,
      30000,
    );

    logger.warn("Scheduling turnstile reconnect", {
      attempt: this.reconnectAttempt,
      delayMs: delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch((error) => {
        logger.error("Turnstile reconnect failed", {
          message: (error as Error).message,
        });
        this.scheduleReconnect();
      });
    }, delay);
  }

  private executeCommand(
    payload: TurnstileCommandPayload,
    timeoutMs = this.options.commandTimeoutMs,
  ): Promise<TurnstileCommandResponse> {
    return new Promise<TurnstileCommandResponse>((resolve, reject) => {
      const expectedCmd = typeof payload.cmd === "string" ? payload.cmd : null;

      const command: PendingCommand = {
        payload,
        expectedCmd,
        timeoutMs,
        resolve,
        reject,
        timeoutHandle: null,
      };

      this.queue.push(command);
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.activeCommand || this.queue.length === 0) {
      return;
    }

    if (!this.isSocketConnected() || !this.socket) {
      void this.connect().catch((error) => {
        logger.error("Turnstile connection unavailable while processing queue", {
          message: (error as Error).message,
        });
        this.scheduleReconnect();
      });
      return;
    }

    const command = this.queue.shift();
    if (!command) {
      return;
    }

    this.activeCommand = command;

    command.timeoutHandle = setTimeout(() => {
      if (this.activeCommand !== command) {
        return;
      }

      this.clearActiveCommand();
      command.reject(
        new Error(
          `Turnstile command '${
            command.expectedCmd ?? "unknown"
          }' timed out after ${command.timeoutMs}ms`,
        ),
      );
      this.processQueue();
    }, command.timeoutMs);

    try {
      this.socket.send(JSON.stringify(command.payload));
    } catch (error) {
      this.clearActiveCommand();
      command.reject(
        new Error(`Failed to send command to turnstile: ${(error as Error).message}`),
      );
      this.processQueue();
    }
  }

  private clearActiveCommand(): void {
    if (!this.activeCommand) {
      return;
    }

    if (this.activeCommand.timeoutHandle) {
      clearTimeout(this.activeCommand.timeoutHandle);
      this.activeCommand.timeoutHandle = null;
    }

    this.activeCommand = null;
  }

  private ensureSuccess(
    commandName: string,
    response: TurnstileCommandResponse,
  ): void {
    const code = toInteger(response.code);
    if (code === 0) {
      return;
    }

    throw buildCommandError(commandName, response);
  }
}
