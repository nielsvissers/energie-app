import assert from 'node:assert/strict';
import test from 'node:test';
import { HomeAssistantStatisticsClient, normalizeStatisticMetadata } from './statistics-client';
import { backoffDelay, toWebSocketUrl } from './websocket';
import {
  createDateChunks,
  HomeAssistantStatisticsSyncService,
  type ConfiguredMetingType,
  type DagMetingInput,
  statisticTimestamp,
  type StatisticBaseline,
  type StatisticCheckpoint,
  type StatisticValueInput,
  type StatisticsSyncRepository,
} from './statistics-sync';
import type {
  HomeAssistantStatisticMetadata,
  HomeAssistantStatisticPoint,
  HomeAssistantStatisticsResult,
  StatisticsSyncLogger,
} from './types';

const silentLogger: StatisticsSyncLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

test('creates non-overlapping chunks no longer than 30 days', () => {
  const chunks = createDateChunks(
    new Date('2026-01-01T00:00:00.000Z'),
    new Date('2026-03-05T00:00:00.000Z'),
    30
  );

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].start.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(chunks[0].end.toISOString(), chunks[1].start.toISOString());
  assert.equal(chunks[2].end.toISOString(), '2026-03-05T00:00:00.000Z');
  assert.throws(() => createDateChunks(new Date(0), new Date(1), 31), RangeError);
});

test('normalizes Home Assistant metadata and Unix-second timestamps', () => {
  const metadata = normalizeStatisticMetadata({
    statistic_ids: {
      'sensor.zp_productie_vandaag': {
        source: 'recorder',
        name: 'Zonneproductie',
        unit_of_measurement: 'kWh',
        has_mean: false,
        has_sum: true,
      },
    },
  });

  assert.equal(metadata[0].statistic_id, 'sensor.zp_productie_vandaag');
  assert.equal(statisticTimestamp(1_767_225_600)?.toISOString(), '2026-01-01T00:00:00.000Z');

  const directMetadata = normalizeStatisticMetadata({
    'sensor.direct_energy': {
      source: 'recorder',
      name: 'Direct Energy',
      unit_of_measurement: 'kWh',
      has_mean: false,
      has_sum: true,
    },
  });
  assert.equal(directMetadata[0].statistic_id, 'sensor.direct_energy');
});

test('converts Home Assistant base URLs and applies capped exponential backoff', () => {
  assert.equal(toWebSocketUrl('http://homeassistant.local:8123'), 'ws://homeassistant.local:8123/api/websocket');
  assert.equal(toWebSocketUrl('https://homeassistant.local'), 'wss://homeassistant.local/api/websocket');
  assert.deepEqual([1, 2, 3, 5].map((attempt) => backoffDelay(attempt, 1_000, 4_000)), [1_000, 2_000, 4_000, 4_000]);
});

test('authenticates, retries a broken connection and sends typed recorder commands', async () => {
  const originalWebSocket = globalThis.WebSocket;
  MockWebSocket.connections = 0;
  MockWebSocket.sentMessages = [];
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: MockWebSocket });
  const client = new HomeAssistantStatisticsClient({
    url: 'http://homeassistant.local:8123',
    accessToken: 'test-token',
    connectAttempts: 2,
    reconnectBaseDelayMs: 0,
    requestTimeoutMs: 500,
    logger: silentLogger,
  });

  try {
    const metadata = await client.listStatisticMetadata();
    const result = await client.statisticsDuringPeriod({
      startTime: new Date('2026-01-01T00:00:00Z'),
      endTime: new Date('2026-01-02T00:00:00Z'),
      statisticIds: ['sensor.test_energy'],
    });

    assert.equal(MockWebSocket.connections, 2);
    assert.equal(metadata[0].statistic_id, 'sensor.test_energy');
    assert.equal(result['sensor.test_energy'][0].sum, 2);
    assert.deepEqual(MockWebSocket.sentMessages[0], { type: 'auth', access_token: 'test-token' });
    assert.equal(MockWebSocket.sentMessages[1].type, 'recorder/list_statistic_ids');
    assert.deepEqual(MockWebSocket.sentMessages[2].types, ['state', 'sum']);
    assert.deepEqual(MockWebSocket.sentMessages[2].statistic_ids, ['sensor.test_energy']);
  } finally {
    client.close();
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: originalWebSocket });
  }
});

test('imports history, reports the oldest point, and checkpoints each statistic', async () => {
  const points: HomeAssistantStatisticPoint[] = [
    { start: '2026-01-01T01:00:00.000Z', state: 1, sum: 1 },
    { start: '2026-01-02T01:00:00.000Z', state: 2, sum: 2 },
  ];
  const { service, repository } = createTestService(points);
  const summary = await service.syncHistorical({
    minimumSearchDate: new Date('2026-01-01T00:00:00.000Z'),
    endTime: new Date('2026-01-03T00:00:00.000Z'),
    chunkDays: 1,
  });

  assert.equal(summary.oldestAvailable, '2026-01-01T01:00:00.000Z');
  assert.equal(summary.valuesUpserted, 2);
  assert.equal(summary.dagMetingenUpserted, 2);
  assert.equal(repository.values.length, 2);
  assert.equal(repository.dagMetingen[0].waarde, 0);
  assert.equal(repository.dagMetingen[1].waarde, 1);
  assert.equal(repository.checkpoints.get('sensor.test_energy')?.toISOString(), '2026-01-03T00:00:00.000Z');
});

test('only requests configured statistic IDs and writes their daily total', async () => {
  const metadata = [
    statisticMetadata('sensor.configured_energy'),
    statisticMetadata('sensor.unconfigured_energy'),
  ];
  const client = new MemoryStatisticsClient(metadata, {
    'sensor.configured_energy': [
      { start: '2026-01-01T01:00:00Z', state: 10, sum: 10 },
      { start: '2026-01-01T02:00:00Z', state: 13, sum: 13 },
    ],
    'sensor.unconfigured_energy': [
      { start: '2026-01-01T01:00:00Z', state: 50, sum: 50 },
      { start: '2026-01-01T02:00:00Z', state: 70, sum: 70 },
    ],
  });
  const repository = new MemoryStatisticsRepository(undefined, ['sensor.configured_energy']);
  const service = new HomeAssistantStatisticsSyncService(client, repository, silentLogger);

  const summary = await service.syncHistorical({
    minimumSearchDate: new Date('2026-01-01T00:00:00Z'),
    endTime: new Date('2026-01-01T03:00:00Z'),
  });

  assert.ok(client.requests.length > 0);
  assert.ok(client.requests.every((request) => request.statisticIds.every((id) => id === 'sensor.configured_energy')));
  assert.equal(summary.statisticCount, 1);
  assert.equal(repository.values.length, 2);
  assert.equal(repository.values[0].statisticId, 'sensor.configured_energy');
  assert.equal(repository.dagMetingen.length, 1);
  assert.equal(repository.dagMetingen[0].waarde, 3);
});

test('rebuilds one daily total across chunk boundaries instead of overwriting partial totals', async () => {
  const { service, repository } = createTestService([
    { start: '2026-01-02T00:00:00Z', state: 10, sum: 10 },
    { start: '2026-01-02T10:00:00Z', state: 12, sum: 12 },
    { start: '2026-01-02T13:00:00Z', state: 15, sum: 15 },
  ]);

  const summary = await service.syncHistorical({
    startTime: new Date('2026-01-01T12:00:00Z'),
    endTime: new Date('2026-01-03T12:00:00Z'),
    chunkDays: 1,
  });

  assert.equal(summary.valuesUpserted, 3);
  assert.equal(repository.dagMetingen.length, 1);
  assert.equal(repository.dagMetingen[0].waarde, 5);
});

test('incremental sync starts at the saved per-statistic checkpoint', async () => {
  const { service, repository, requests } = createTestService([
    { start: '2026-01-03T01:00:00.000Z', state: 3, sum: 3 },
  ]);
  repository.checkpoints.set('sensor.test_energy', new Date('2026-01-03T00:00:00.000Z'));

  const summary = await service.syncIncremental({ endTime: new Date('2026-01-04T00:00:00.000Z'), chunkDays: 1 });

  assert.equal(summary.mode, 'incremental');
  assert.equal(requests[0].startTime.toISOString(), '2026-01-03T00:00:00.000Z');
  assert.equal(repository.values.length, 1);
  assert.equal(repository.checkpoints.get('sensor.test_energy')?.toISOString(), '2026-01-04T00:00:00.000Z');
});

test('reimports one local day across daylight saving time without moving checkpoints', async () => {
  const { service, repository, requests } = createTestService([
    { start: '2026-03-29T00:00:00Z', state: 10, sum: 10 },
  ]);
  const checkpoint = new Date('2026-04-01T00:00:00Z');
  repository.checkpoints.set('sensor.test_energy', checkpoint);

  const summary = await service.syncDay('2026-03-29');

  assert.equal(summary.mode, 'day');
  assert.equal(requests[0].startTime.toISOString(), '2026-03-28T23:00:00.000Z');
  assert.equal(requests[0].endTime.toISOString(), '2026-03-29T22:00:00.001Z');
  assert.equal(repository.checkpoints.get('sensor.test_energy')?.toISOString(), checkpoint.toISOString());
  assert.equal(repository.values.length, 1);
});

test('uses the following midnight point as the previous day end value without counting it twice', async () => {
  const { service, repository, requests } = createTestService([
    { start: '2026-08-15T22:00:00Z', state: 1_000, sum: 100 },
    { start: '2026-08-15T23:00:00Z', state: 1_010, sum: 110 },
    { start: '2026-08-16T22:00:00Z', state: 1_060, sum: 160 },
  ]);

  const summary = await service.syncDay('2026-08-16');

  assert.equal(requests[0].endTime.toISOString(), '2026-08-16T22:00:00.001Z');
  assert.equal(summary.valuesUpserted, 3);
  assert.equal(repository.dagMetingen.length, 1);
  assert.equal(repository.dagMetingen[0].datum.toISOString(), '2026-08-16T12:00:00.000Z');
  assert.equal(repository.dagMetingen[0].waarde, 60);
});

test('returns raw daily HA points without writing values or checkpoints', async () => {
  const rawPoint = { start: '2026-11-11T12:00:00Z', state: 42, sum: 1024 };
  const endBoundary = { start: '2026-11-11T23:00:00Z', state: 50, sum: 1032 };
  const { service, repository, requests } = createTestService([rawPoint, endBoundary]);

  const result = await service.getStatisticsForDay('2026-11-11');

  assert.equal(result.statisticCount, 1);
  assert.equal(result.pointCount, 2);
  assert.deepEqual(result.statistics[0].points[0], rawPoint);
  assert.deepEqual(result.statistics[0].points[1], endBoundary);
  assert.equal(requests[0].endTime.toISOString(), '2026-11-11T23:00:00.001Z');
  assert.deepEqual(requests[0].statisticIds, ['sensor.test_energy']);
  assert.equal(repository.values.length, 0);
  assert.equal(repository.dagMetingen.length, 0);
  assert.equal(repository.checkpoints.size, 0);
});

test('continues importing other statistics when one statistic fails', async () => {
  const metadata: HomeAssistantStatisticMetadata[] = [
    statisticMetadata('sensor.bad_energy'),
    statisticMetadata('sensor.good_energy'),
  ];
  const repository = new MemoryStatisticsRepository('sensor.bad_energy', ['sensor.bad_energy', 'sensor.good_energy']);
  const client = new MemoryStatisticsClient(metadata, {
    'sensor.bad_energy': [{ start: '2026-01-01T01:00:00.000Z', state: 1, sum: 1 }],
    'sensor.good_energy': [{ start: '2026-01-01T01:00:00.000Z', state: 1, sum: 1 }],
  });
  const service = new HomeAssistantStatisticsSyncService(client, repository, silentLogger);

  const summary = await service.syncHistorical({
    startTime: new Date('2026-01-01T00:00:00.000Z'),
    endTime: new Date('2026-01-02T00:00:00.000Z'),
  });

  assert.equal(summary.failedStatistics, 1);
  assert.equal(repository.values.length, 1);
  assert.equal(repository.checkpoints.get('sensor.bad_energy'), undefined);
  assert.equal(repository.checkpoints.get('sensor.good_energy')?.toISOString(), '2026-01-02T00:00:00.000Z');
});

function createTestService(points: HomeAssistantStatisticPoint[]) {
  const metadata = [statisticMetadata('sensor.test_energy')];
  const sourceResults: HomeAssistantStatisticsResult = { 'sensor.test_energy': points };
  const client = new MemoryStatisticsClient(metadata, sourceResults);
  const repository = new MemoryStatisticsRepository();
  const service = new HomeAssistantStatisticsSyncService(client, repository, silentLogger);
  return { service, repository, requests: client.requests };
}

function statisticMetadata(statisticId: string): HomeAssistantStatisticMetadata {
  return {
    statistic_id: statisticId,
    source: 'recorder',
    name: statisticId,
    unit_of_measurement: 'kWh',
    has_mean: false,
    has_sum: true,
  };
}

class MemoryStatisticsRepository implements StatisticsSyncRepository {
  readonly values: StatisticValueInput[] = [];
  readonly dagMetingen: DagMetingInput[] = [];
  readonly checkpoints = new Map<string, Date>();
  private readonly metadata = new Map<string, StatisticCheckpoint>();
  private readonly configuredTypes: ConfiguredMetingType[];

  constructor(private readonly failStatisticId?: string, configuredStatisticIds = ['sensor.test_energy']) {
    this.configuredTypes = configuredStatisticIds.map((haEntityId, index) => ({
      id: index + 1,
      code: `TYPE_${index + 1}`,
      haEntityId,
      haDailyReset: false,
      haSingleSourcePeak: false,
      haSingleSourceOffPeak: false,
    }));
  }

  async saveMetadata(item: HomeAssistantStatisticMetadata): Promise<void> {
    if (!this.metadata.has(item.statistic_id)) {
      this.metadata.set(item.statistic_id, {
        statisticId: item.statistic_id,
        sourceId: item.source,
        lastSyncedAt: null,
      });
    }
  }

  async getConfiguredMetingTypes(): Promise<ConfiguredMetingType[]> {
    return this.configuredTypes;
  }

  async getDalurenInstellingen() {
    return { start: '22:00', einde: '06:00', weekends: true };
  }

  async getSupportedStatistics(statisticIds: string[]): Promise<StatisticCheckpoint[]> {
    return [...this.metadata.values()].filter((item) => statisticIds.includes(item.statisticId)).map((item) => ({
      ...item,
      lastSyncedAt: this.checkpoints.get(item.statisticId) ?? null,
    }));
  }

  async getPreviousStatisticValue(statisticId: string, before: Date): Promise<StatisticBaseline | null> {
    const previous = this.values
      .filter((value) => value.statisticId === statisticId && value.timestamp < before)
      .sort((first, second) => second.timestamp.getTime() - first.timestamp.getTime())[0];
    return previous ? { state: previous.state, sum: previous.sum } : null;
  }

  async getStatisticValuesInRange(statisticId: string, start: Date, end: Date): Promise<StatisticValueInput[]> {
    return this.values
      .filter((value) => value.statisticId === statisticId && value.timestamp >= start && value.timestamp <= end)
      .sort((first, second) => first.timestamp.getTime() - second.timestamp.getTime());
  }

  async upsertValue(value: StatisticValueInput): Promise<void> {
    if (value.statisticId === this.failStatisticId) throw new Error('test database failure');
    const existing = this.values.findIndex((item) => item.statisticId === value.statisticId && item.timestamp.getTime() === value.timestamp.getTime());
    if (existing < 0) this.values.push(value);
    else this.values[existing] = value;
  }

  async upsertDagMeting(meting: DagMetingInput): Promise<void> {
    const existing = this.dagMetingen.findIndex((value) => value.datum.getTime() === meting.datum.getTime() && value.metingTypeId === meting.metingTypeId);
    if (existing < 0) this.dagMetingen.push(meting);
    else this.dagMetingen[existing] = meting;
  }

  async findMetingTypeByCode(code: string): Promise<{ id: number } | null> {
    const type = this.configuredTypes.find((item) => item.code === code);
    return type ? { id: type.id } : null;
  }

  async setLastSyncedAt(statisticId: string, timestamp: Date): Promise<void> {
    this.checkpoints.set(statisticId, timestamp);
  }
}

class MemoryStatisticsClient {
  readonly requests: Array<{ startTime: Date; endTime: Date; statisticIds: string[] }> = [];

  constructor(
    private readonly metadata: HomeAssistantStatisticMetadata[],
    private readonly results: HomeAssistantStatisticsResult
  ) {}

  async listStatisticMetadata(): Promise<HomeAssistantStatisticMetadata[]> {
    return this.metadata;
  }

  async statisticsDuringPeriod(request: { startTime: Date; endTime: Date; statisticIds: string[] }): Promise<HomeAssistantStatisticsResult> {
    this.requests.push(request);
    return Object.fromEntries(request.statisticIds.map((statisticId) => [
      statisticId,
      (this.results[statisticId] ?? []).filter((point) => {
        const timestamp = typeof point.start === 'number'
          ? new Date(point.start < 1_000_000_000_000 ? point.start * 1_000 : point.start)
          : new Date(point.start);
        return timestamp >= request.startTime && timestamp < request.endTime;
      }),
    ]));
  }
}

class MockWebSocket extends EventTarget {
  static OPEN = 1;
  static connections = 0;
  static sentMessages: Array<Record<string, unknown>> = [];
  readyState = 0;

  constructor(_url: string) {
    super();
    MockWebSocket.connections += 1;
    const shouldFail = MockWebSocket.connections === 1;
    queueMicrotask(() => {
      this.readyState = MockWebSocket.OPEN;
      this.dispatchEvent(new Event('open'));
      if (shouldFail) {
        this.dispatchEvent(new Event('error'));
        this.emitClose(1006);
        return;
      }
      this.emitMessage({ type: 'auth_required', ha_version: '2026.11.1' });
    });
  }

  send(rawMessage: string): void {
    const message = JSON.parse(rawMessage) as Record<string, unknown>;
    MockWebSocket.sentMessages.push(message);
    if (message.type === 'auth') {
      queueMicrotask(() => this.emitMessage({ type: 'auth_ok', ha_version: '2026.11.1' }));
      return;
    }

    const result = message.type === 'recorder/list_statistic_ids'
      ? {
          statistic_ids: {
            'sensor.test_energy': {
              source: 'recorder',
              name: 'Test Energy',
              unit_of_measurement: 'kWh',
              has_mean: false,
              has_sum: true,
            },
          },
        }
      : { 'sensor.test_energy': [{ start: '2026-01-01T00:00:00Z', state: 2, sum: 2 }] };

    queueMicrotask(() => this.emitMessage({ id: message.id, type: 'result', success: true, result }));
  }

  close(code = 1000): void {
    this.readyState = 3;
    this.emitClose(code);
  }

  private emitMessage(data: Record<string, unknown>): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  private emitClose(code: number): void {
    const event = new Event('close');
    Object.defineProperty(event, 'code', { value: code });
    this.dispatchEvent(event);
  }
}