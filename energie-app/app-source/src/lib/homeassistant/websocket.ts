import type {
  HomeAssistantAuthMessage,
  HomeAssistantCommandEnvelope,
  HomeAssistantCommandResponse,
  HomeAssistantServerMessage,
  StatisticsSyncLogger,
} from './types';
import { consoleStatisticsLogger } from './types';

export interface HomeAssistantWebSocketOptions {
  url: string;
  accessToken: string;
  logger?: StatisticsSyncLogger;
  requestTimeoutMs?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  connectAttempts?: number;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class HomeAssistantWebSocketError extends Error {
  constructor(message: string, readonly retryable = true) {
    super(message);
    this.name = 'HomeAssistantWebSocketError';
  }
}

export class HomeAssistantWebSocket {
  private readonly url: string;
  private readonly accessToken: string;
  private readonly logger: StatisticsSyncLogger;
  private readonly requestTimeoutMs: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private readonly connectAttempts: number;
  private socket: WebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private nextId = 1;
  private isAuthenticated = false;
  private isClosed = false;
  private readonly pending = new Map<number, PendingRequest>();

  constructor(options: HomeAssistantWebSocketOptions) {
    this.url = toWebSocketUrl(options.url);
    this.accessToken = options.accessToken;
    this.logger = options.logger ?? consoleStatisticsLogger;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? 1_000;
    this.reconnectMaxDelayMs = options.reconnectMaxDelayMs ?? 30_000;
    this.connectAttempts = options.connectAttempts ?? 5;
  }

  /** Opens and authenticates a WebSocket connection, retrying transient failures. */
  async connect(): Promise<void> {
    if (this.isAuthenticated && this.socket?.readyState === WebSocket.OPEN) return;
    if (this.isClosed) throw new HomeAssistantWebSocketError('WebSocket client is closed.', false);
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connecting) return this.connecting;

    this.connecting = this.connectWithRetry();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  /** Sends a Home Assistant command and resolves its typed result. */
  async request<T>(command: HomeAssistantCommandEnvelope): Promise<T> {
    await this.connect();
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      throw new HomeAssistantWebSocketError('WebSocket connection is not authenticated.');
    }

    const id = this.nextId++;
    const message = { ...command, id };

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new HomeAssistantWebSocketError(`Home Assistant request ${id} timed out.`));
      }, this.requestTimeoutMs);

      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeout,
      });

      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(new HomeAssistantWebSocketError(`Failed to send request ${id}: ${errorMessage(error)}`));
      }
    });
  }

  /** Closes the connection and prevents automatic reconnection. */
  close(): void {
    this.isClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.isAuthenticated = false;
    this.rejectPending(new HomeAssistantWebSocketError('WebSocket client closed.', false));
    this.socket?.close(1000, 'Client shutdown');
    this.socket = null;
  }

  private async connectWithRetry(): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.connectAttempts; attempt += 1) {
      try {
        await this.connectOnce();
        this.reconnectAttempt = 0;
        this.logger.info('WebSocket authenticated.', { attempt });
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn('WebSocket connection attempt failed.', {
          attempt,
          maxAttempts: this.connectAttempts,
          error: errorMessage(error),
        });
        if (error instanceof HomeAssistantWebSocketError && !error.retryable) break;
        if (attempt < this.connectAttempts) {
          await delay(backoffDelay(attempt, this.reconnectBaseDelayMs, this.reconnectMaxDelayMs));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new HomeAssistantWebSocketError('Unable to connect to Home Assistant.');
  }

  private connectOnce(): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let authSent = false;
      const socket = new WebSocket(this.url);
      this.socket = socket;
      this.isAuthenticated = false;

      const timeout = setTimeout(() => {
        finish(new HomeAssistantWebSocketError('Timed out waiting for Home Assistant authentication.'));
        socket.close();
      }, this.requestTimeoutMs);

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      };

      socket.addEventListener('open', () => {
        this.logger.info('WebSocket opened; waiting for auth_required.');
      });

      socket.addEventListener('message', (event) => {
        let message: HomeAssistantServerMessage;
        try {
          message = JSON.parse(String(event.data)) as HomeAssistantServerMessage;
        } catch (error) {
          this.logger.warn('Ignoring invalid WebSocket message.', { error: errorMessage(error) });
          return;
        }

        if (message.type === 'auth_required' && !authSent) {
          authSent = true;
          const auth: HomeAssistantAuthMessage = { type: 'auth', access_token: this.accessToken };
          try {
            socket.send(JSON.stringify(auth));
          } catch (error) {
            finish(new HomeAssistantWebSocketError(`Failed to send authentication: ${errorMessage(error)}`));
            socket.close();
          }
          return;
        }

        if (message.type === 'auth_ok') {
          this.isAuthenticated = true;
          finish();
          return;
        }

        if (message.type === 'auth_invalid') {
          finish(new HomeAssistantWebSocketError(`Home Assistant authentication failed: ${message.message}`, false));
          socket.close(4001, 'Authentication failed');
          return;
        }

        if ('id' in message && typeof message.id === 'number') {
          this.resolveResponse(message as HomeAssistantCommandResponse<unknown>);
        }
      });

      socket.addEventListener('error', () => {
        finish(new HomeAssistantWebSocketError('WebSocket connection error.'));
        socket.close();
      });

      socket.addEventListener('close', (event) => {
        const wasAuthenticated = this.isAuthenticated;
        this.isAuthenticated = false;
        if (this.socket === socket) this.socket = null;
        if (!settled) finish(new HomeAssistantWebSocketError(`WebSocket closed before authentication (code ${event.code}).`));
        this.rejectPending(new HomeAssistantWebSocketError(`WebSocket closed (code ${event.code}).`));
        if (!this.isClosed && wasAuthenticated) this.scheduleReconnect();
      });
    });
  }

  private resolveResponse(response: HomeAssistantCommandResponse<unknown>): void {
    const request = this.pending.get(response.id);
    if (!request) {
      this.logger.warn('Received a response for an unknown or expired request.', { id: response.id });
      return;
    }
    clearTimeout(request.timeout);
    this.pending.delete(response.id);

    if (!response.success) {
      request.reject(new HomeAssistantWebSocketError(
        `Home Assistant command failed (${response.error.code}): ${response.error.message}`,
        false
      ));
      return;
    }
    request.resolve(response.result);
  }

  private rejectPending(error: Error): void {
    for (const [id, request] of this.pending) {
      clearTimeout(request.timeout);
      request.reject(error);
      this.pending.delete(id);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isClosed) return;
    this.reconnectAttempt += 1;
    const waitMs = backoffDelay(this.reconnectAttempt, this.reconnectBaseDelayMs, this.reconnectMaxDelayMs);
    this.logger.warn('Scheduling WebSocket reconnect.', { attempt: this.reconnectAttempt, waitMs });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch((error: unknown) => {
        this.logger.error('WebSocket reconnect failed.', { error: errorMessage(error) });
        this.scheduleReconnect();
      });
    }, waitMs);
  }
}

/** Converts a Home Assistant HTTP(S) base URL to its WebSocket endpoint. */
export function toWebSocketUrl(homeAssistantUrl: string): string {
  const url = new URL(homeAssistantUrl);
  if (url.protocol === 'http:') url.protocol = 'ws:';
  else if (url.protocol === 'https:') url.protocol = 'wss:';
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error('HOME_ASSISTANT_URL must use http(s):// or ws(s)://.');
  }
  url.pathname = '/api/websocket';
  url.search = '';
  url.hash = '';
  return url.toString();
}

/** Returns the capped exponential retry delay for a one-based attempt number. */
export function backoffDelay(attempt: number, baseMs: number, maxMs: number): number {
  return Math.min(baseMs * 2 ** Math.max(0, attempt - 1), maxMs);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}