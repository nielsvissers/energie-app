import {
  HomeAssistantWebSocket,
  HomeAssistantWebSocketError,
  type HomeAssistantWebSocketOptions,
} from './websocket';
import type {
  HomeAssistantListStatisticIdsResult,
  HomeAssistantStatisticMetadataEntries,
  HomeAssistantStatisticMetadata,
  HomeAssistantStatisticsResult,
  StatisticsDuringPeriodCommand,
  StatisticsSyncLogger,
} from './types';
import { consoleStatisticsLogger } from './types';

export interface HomeAssistantStatisticsClientOptions extends Omit<HomeAssistantWebSocketOptions, 'logger'> {
  logger?: StatisticsSyncLogger;
  maxRequestRetries?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
}

export interface StatisticsPeriodRequest {
  startTime: Date;
  endTime: Date;
  statisticIds: string[];
  period?: 'hour';
}

/** Typed client for Home Assistant's recorder statistics WebSocket commands. */
export class HomeAssistantStatisticsClient {
  private readonly socket: HomeAssistantWebSocket;
  private readonly logger: StatisticsSyncLogger;
  private readonly maxRequestRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly retryMaxDelayMs: number;
  private requestId = 1;

  constructor(options: HomeAssistantStatisticsClientOptions) {
    this.logger = options.logger ?? consoleStatisticsLogger;
    this.socket = new HomeAssistantWebSocket({ ...options, logger: this.logger });
    this.maxRequestRetries = options.maxRequestRetries ?? 4;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 1_000;
    this.retryMaxDelayMs = options.retryMaxDelayMs ?? 30_000;
  }

  /** Connects and authenticates the underlying WebSocket transport. */
  async connect(): Promise<void> {
    await this.socket.connect();
  }

  /** Returns supported long-term statistics and their Home Assistant metadata. */
  async listStatisticMetadata(): Promise<HomeAssistantStatisticMetadata[]> {
    const result = await this.requestWithRetry<HomeAssistantListStatisticIdsResult>(
      'recorder/list_statistic_ids',
      () => this.socket.request({ id: this.requestId++, type: 'recorder/list_statistic_ids' })
    );
    return normalizeStatisticMetadata(result);
  }

  /** Fetches hourly state and sum statistics for a bounded time range. */
  async statisticsDuringPeriod(request: StatisticsPeriodRequest): Promise<HomeAssistantStatisticsResult> {
    if (request.endTime <= request.startTime) throw new Error('endTime must be later than startTime.');
    if (request.statisticIds.length === 0) return {};

    const command: StatisticsDuringPeriodCommand = {
      id: this.requestId++,
      type: 'recorder/statistics_during_period',
      start_time: request.startTime.toISOString(),
      end_time: request.endTime.toISOString(),
      period: request.period ?? 'hour',
      statistic_ids: request.statisticIds,
      types: ['state', 'sum'],
    };

    return this.requestWithRetry('recorder/statistics_during_period', () =>
      this.socket.request<HomeAssistantStatisticsResult>(command)
    );
  }

  /** Closes the WebSocket client and cancels reconnect attempts. */
  close(): void {
    this.socket.close();
  }

  private async requestWithRetry<T>(operation: string, request: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRequestRetries; attempt += 1) {
      try {
        return await request();
      } catch (error) {
        lastError = error;
        const retryable = !(error instanceof HomeAssistantWebSocketError) || error.retryable;
        if (!retryable || attempt === this.maxRequestRetries) break;

        const waitMs = Math.min(this.retryBaseDelayMs * 2 ** (attempt - 1), this.retryMaxDelayMs);
        this.logger.warn('Retrying Home Assistant statistics request.', {
          operation,
          attempt,
          waitMs,
          error: error instanceof Error ? error.message : String(error),
        });
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    this.logger.error('Home Assistant statistics request failed.', {
      operation,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    });
    throw lastError instanceof Error ? lastError : new Error(`Request failed: ${operation}`);
  }
}

/** Normalizes Home Assistant's metadata map or list into a stable typed list. */
export function normalizeStatisticMetadata(
  result: HomeAssistantListStatisticIdsResult
): HomeAssistantStatisticMetadata[] {
  const entries: HomeAssistantStatisticMetadataEntries = Array.isArray(result)
    ? result
    : 'statistic_ids' in result
      ? (result as { statistic_ids: HomeAssistantStatisticMetadataEntries }).statistic_ids
      : result as Record<string, Partial<HomeAssistantStatisticMetadata>>;
  const metadata = Array.isArray(entries)
    ? entries.map((item) => [item.statistic_id, item] as const)
    : Object.entries(entries);

  return metadata.flatMap(([key, value]) => {
    const statisticId = value.statistic_id || key;
    if (!statisticId) return [];
    return [{
      statistic_id: statisticId,
      source: value.source ?? 'unknown',
      name: value.name ?? null,
      unit_of_measurement: value.unit_of_measurement ?? null,
      has_mean: value.has_mean ?? false,
      has_sum: value.has_sum ?? false,
    }];
  });
}