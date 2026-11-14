import { HomeAssistantStatisticsClient } from './statistics-client';
import {
    isDalUur,
    lokaleTijdNaarUtc,
    STANDAARD_DALUREN,
    type DalurenInstellingen,
} from '../daluren';
import type {
    HomeAssistantStatisticMetadata,
    HomeAssistantStatisticPoint,
    HomeAssistantStatisticsResult,
    StatisticsSyncLogger,
} from './types';
import { consoleStatisticsLogger } from './types';

const DEFAULT_MINIMUM_DATE = new Date('1970-01-01T00:00:00.000Z');

export interface StatisticsSyncOptions {
    /** Latest timestamp to request. Defaults to the current time. */
    endTime?: Date;
    /** Optional explicit beginning for an initial historical import. */
    startTime?: Date;
    /** Number of days per request, capped at 30. */
    chunkDays?: number;
    /** Number of statistic IDs per request. */
    statisticBatchSize?: number;
    /** Earliest date to inspect when discovering the available history. */
    minimumSearchDate?: Date;
}

export interface StatisticCheckpoint {
    statisticId: string;
    sourceId: string;
    lastSyncedAt: Date | null;
}

export interface StatisticValueInput {
    statisticId: string;
    timestamp: Date;
    state: number | null;
    sum: number | null;
    source: string;
}

export interface ConfiguredMetingType {
    id: number;
    code: string;
    haEntityId: string | null;
    haDailyReset: boolean;
    haSingleSourcePeak: boolean;
    haSingleSourceOffPeak: boolean;
}

export interface StatisticBaseline {
    state: number | null;
    sum: number | null;
}

export interface DagMetingInput {
    datum: Date;
    metingTypeId: number;
    waarde: number;
}

export interface StatisticsSyncRepository {
    saveMetadata(metadata: HomeAssistantStatisticMetadata): Promise<void>;
    getConfiguredMetingTypes(): Promise<ConfiguredMetingType[]>;
    getDalurenInstellingen(): Promise<DalurenInstellingen>;
    getSupportedStatistics(statisticIds: string[]): Promise<StatisticCheckpoint[]>;
    getPreviousStatisticValue(statisticId: string, before: Date): Promise<StatisticBaseline | null>;
    getStatisticValuesInRange(statisticId: string, start: Date, end: Date): Promise<StatisticValueInput[]>;
    upsertValue(value: StatisticValueInput): Promise<void>;
    upsertDagMeting(meting: DagMetingInput): Promise<void>;
    findMetingTypeByCode(code: string): Promise<{ id: number } | null>;
    setLastSyncedAt(statisticId: string, timestamp: Date): Promise<void>;
}

export interface StatisticsSyncSummary {
    mode: 'historical' | 'incremental' | 'day';
    statisticCount: number;
    chunkCount: number;
    valuesUpserted: number;
    dagMetingenUpserted: number;
    failedStatistics: number;
    oldestAvailable: string | null;
    durationMs: number;
}

export interface StatisticsDayDiagnostic {
    statisticId: string;
    name: string | null;
    unitOfMeasurement: string | null;
    points: HomeAssistantStatisticPoint[];
}

export interface StatisticsDayDiagnosticResult {
    date: string;
    startTime: string;
    endTime: string;
    statisticCount: number;
    pointCount: number;
    statistics: StatisticsDayDiagnostic[];
    errors: Array<{ statisticIds: string[]; message: string }>;
    durationMs: number;
}

interface ImportBatchResult {
    valuesUpserted: number;
    dagMetingenUpserted: number;
    failedStatisticIds: string[];
    oldestAvailable: Date | null;
}

/** Coordinates historical discovery, chunk imports and per-statistic retries. */
export class HomeAssistantStatisticsSyncService {
    private readonly logger: StatisticsSyncLogger;
    private configuredMetingTypes: ConfiguredMetingType[] = [];
    private dalurenInstellingen = STANDAARD_DALUREN;
    private readonly metingTypeIdsByCode = new Map<string, number | null>();

    constructor(
        private readonly client: Pick<HomeAssistantStatisticsClient, 'listStatisticMetadata' | 'statisticsDuringPeriod'>,
        private readonly repository: StatisticsSyncRepository,
        logger: StatisticsSyncLogger = consoleStatisticsLogger
    ) {
        this.logger = logger;
    }

    /** Imports all available supported long-term statistics that have no checkpoint. */
    async syncHistorical(options: StatisticsSyncOptions = {}): Promise<StatisticsSyncSummary> {
        const startedAt = Date.now();
        const { endTime, chunkDays, statisticBatchSize } = normalizeOptions(options);
        const metadata = await this.refreshMetadata();
        const supported = await this.repository.getSupportedStatistics(metadata.map((item) => item.statistic_id));
        const pendingIds = new Set(supported.filter((item) => !item.lastSyncedAt).map((item) => item.statisticId));
        const statisticIds = metadata
            .filter((item) => pendingIds.has(item.statistic_id))
            .map((item) => item.statistic_id);

        if (statisticIds.length === 0) {
            this.logger.info('Historical sync skipped; all supported statistics have checkpoints.');
            return this.summary('historical', 0, 0, 0, null, startedAt);
        }

        const searchFloor = options.startTime ?? options.minimumSearchDate ?? minimumSearchDateFromEnvironment();
        if (searchFloor >= endTime) throw new RangeError('Historical start time must be earlier than end time.');
        const historyStart = options.startTime ?? await this.findOldestAvailable(
            statisticIds,
            endTime,
            chunkDays,
            statisticBatchSize,
            searchFloor
        );
        if (!historyStart) {
            this.logger.warn('No historical statistics were returned for supported statistic IDs.', {
                statisticCount: statisticIds.length,
                searchFloor: searchFloor.toISOString(),
            });
            return this.summary('historical', statisticIds.length, 0, 0, null, startedAt);
        }

        const metadataById = new Map(metadata.map((item) => [item.statistic_id, item]));
        const ranges = createDateChunks(historyStart, endTime, chunkDays);
        let valuesUpserted = 0;
        let dagMetingenUpserted = 0;
        const failedStatisticIds = new Set<string>();
        let oldestImported: Date | null = null;

        for (let index = 0; index < ranges.length; index += 1) {
            const range = ranges[index];
            this.logger.info('Importing historical statistics chunk.', {
                chunk: index + 1,
                totalChunks: ranges.length,
                startTime: range.start.toISOString(),
                endTime: range.end.toISOString(),
                statisticCount: statisticIds.length,
            });
            const result = await this.importRange(
                range.start,
                range.end,
                statisticIds,
                metadataById,
                statisticBatchSize,
                failedStatisticIds
            );
            valuesUpserted += result.valuesUpserted;
            dagMetingenUpserted += result.dagMetingenUpserted;
            for (const statisticId of result.failedStatisticIds) failedStatisticIds.add(statisticId);
            if (result.oldestAvailable && (!oldestImported || result.oldestAvailable < oldestImported)) {
                oldestImported = result.oldestAvailable;
            }
        }

        if (!oldestImported) {
            this.logger.warn('No historical statistics were returned for supported statistic IDs.', {
                statisticCount: statisticIds.length,
                searchStart: historyStart.toISOString(),
            });
        }
        return this.summary(
            'historical',
            statisticIds.length,
            ranges.length,
            valuesUpserted,
            oldestImported,
            startedAt,
            failedStatisticIds.size,
            dagMetingenUpserted
        );
    }

    /** Fetches only ranges newer than each statistic's last successful checkpoint. */
    async syncIncremental(options: StatisticsSyncOptions = {}): Promise<StatisticsSyncSummary> {
        const startedAt = Date.now();
        const { endTime, chunkDays, statisticBatchSize } = normalizeOptions(options);
        let metadata = await this.refreshMetadata();
        let supported = await this.repository.getSupportedStatistics(metadata.map((item) => item.statistic_id));
        let historicalSummary: StatisticsSyncSummary | null = null;

        if (supported.some((item) => !item.lastSyncedAt)) {
            this.logger.info('New statistics found; running initial historical import before incremental sync.');
            historicalSummary = await this.syncHistorical(options);
            metadata = await this.refreshMetadata();
            supported = await this.repository.getSupportedStatistics(metadata.map((item) => item.statistic_id));
        }

        const metadataById = new Map(metadata.map((item) => [item.statistic_id, item]));
        const grouped = new Map<string, StatisticCheckpoint[]>();
        for (const statistic of supported) {
            if (!statistic.lastSyncedAt || statistic.lastSyncedAt >= endTime) continue;
            const key = statistic.lastSyncedAt.toISOString();
            grouped.set(key, [...(grouped.get(key) ?? []), statistic]);
        }

        let valuesUpserted = 0;
        let dagMetingenUpserted = 0;
        const failedStatisticIds = new Set<string>();
        let chunkCount = 0;

        for (const [checkpoint, statistics] of grouped) {
            const start = new Date(checkpoint);
            const ranges = createDateChunks(start, endTime, chunkDays);
            for (const range of ranges) {
                const remainingIds = statistics.map((item) => item.statisticId);
                for (const batch of chunkArray(remainingIds, statisticBatchSize)) {
                    const activeBatch = batch.filter((statisticId) => !failedStatisticIds.has(statisticId));
                    if (activeBatch.length === 0) continue;
                    chunkCount += 1;
                    this.logger.info('Importing incremental statistics chunk.', {
                        chunk: chunkCount,
                        startTime: range.start.toISOString(),
                        endTime: range.end.toISOString(),
                        statisticCount: activeBatch.length,
                    });
                    const result = await this.importBatch(range.start, range.end, activeBatch, metadataById);
                    valuesUpserted += result.valuesUpserted;
                    dagMetingenUpserted += result.dagMetingenUpserted;
                    for (const statisticId of result.failedStatisticIds) failedStatisticIds.add(statisticId);
                }
            }
        }

        const summary = this.summary(
            'incremental',
            supported.length,
            chunkCount,
            valuesUpserted,
            null,
            startedAt,
            failedStatisticIds.size,
            dagMetingenUpserted
        );
        if (!historicalSummary) return summary;

        const combined = {
            ...summary,
            chunkCount: summary.chunkCount + historicalSummary.chunkCount,
            valuesUpserted: summary.valuesUpserted + historicalSummary.valuesUpserted,
            dagMetingenUpserted: summary.dagMetingenUpserted + historicalSummary.dagMetingenUpserted,
            failedStatistics: summary.failedStatistics + historicalSummary.failedStatistics,
            oldestAvailable: historicalSummary.oldestAvailable,
            durationMs: Date.now() - startedAt,
        };
        this.logger.info('Initial and incremental sync totals.', combined);
        return combined;
    }

    /** Reimports one Belgian calendar day for configured statistics without moving their checkpoints. */
    async syncDay(date: string, options: StatisticsSyncOptions = {}): Promise<StatisticsSyncSummary> {
        const startedAt = Date.now();
        const { statisticBatchSize } = normalizeOptions(options);
        if (!isLocalDate(date)) throw new Error('date must use the valid YYYY-MM-DD format.');

        const metadata = await this.refreshMetadata();
        const statisticIds = metadata.map((item) => item.statistic_id);
        if (statisticIds.length === 0) {
            this.logger.warn('Daily statistics test skipped; no configured statistics are available.', { date });
            return this.summary('day', 0, 0, 0, null, startedAt);
        }

        const nextDate = new Date(`${date}T00:00:00.000Z`);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        const start = lokaleTijdNaarUtc(date, '00:00');
        const end = lokaleTijdNaarUtc(nextDate.toISOString().slice(0, 10), '00:00');
        const failedStatisticIds = new Set<string>();
        const result = await this.importRange(
            start,
            new Date(end.getTime() + 1),
            statisticIds,
            new Map(metadata.map((item) => [item.statistic_id, item])),
            statisticBatchSize,
            failedStatisticIds,
            false
        );

        return this.summary(
            'day',
            statisticIds.length,
            1,
            result.valuesUpserted,
            result.oldestAvailable,
            startedAt,
            failedStatisticIds.size,
            result.dagMetingenUpserted
        );
    }

    /** Fetches raw hourly statistics for one Belgian day without writing to the database. */
    async getStatisticsForDay(
        date: string,
        statisticId?: string,
        options: StatisticsSyncOptions = {}
    ): Promise<StatisticsDayDiagnosticResult> {
        const startedAt = Date.now();
        const { statisticBatchSize } = normalizeOptions(options);
        if (!isLocalDate(date)) throw new Error('date must use the valid YYYY-MM-DD format.');

        const metadata = await this.loadConfiguredMetadata();
        const selectedMetadata = statisticId
            ? metadata.filter((item) => item.statistic_id === statisticId)
            : metadata;
        if (statisticId && selectedMetadata.length === 0) {
            throw new Error(`Statistic ${statisticId} is not configured on a metertype or is not supported.`);
        }

        const nextDate = new Date(`${date}T00:00:00.000Z`);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        const start = lokaleTijdNaarUtc(date, '00:00');
        const end = lokaleTijdNaarUtc(nextDate.toISOString().slice(0, 10), '00:00');
        const requestEnd = new Date(end.getTime() + 1);
        const pointsByStatisticId = new Map<string, HomeAssistantStatisticPoint[]>();
        const errors: StatisticsDayDiagnosticResult['errors'] = [];

        for (const batch of chunkArray(selectedMetadata.map((item) => item.statistic_id), statisticBatchSize)) {
            try {
                const result = await this.client.statisticsDuringPeriod({
                    startTime: start,
                    endTime: requestEnd,
                    statisticIds: batch,
                });
                for (const id of batch) pointsByStatisticId.set(id, result[id] ?? []);
            } catch (error) {
                const message = errorMessage(error);
                errors.push({ statisticIds: batch, message });
                this.logger.error('Failed to retrieve daily statistics for diagnostic endpoint.', {
                    date,
                    statisticIds: batch,
                    error: message,
                });
                for (const id of batch) pointsByStatisticId.set(id, []);
            }
        }

        const statistics = selectedMetadata.map((metadata) => ({
            statisticId: metadata.statistic_id,
            name: metadata.name,
            unitOfMeasurement: metadata.unit_of_measurement,
            points: pointsByStatisticId.get(metadata.statistic_id) ?? [],
        }));

        return {
            date,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            statisticCount: statistics.length,
            pointCount: statistics.reduce((total, item) => total + item.points.length, 0),
            statistics,
            errors,
            durationMs: Date.now() - startedAt,
        };
    }

    private async loadConfiguredMetadata(): Promise<HomeAssistantStatisticMetadata[]> {
        const [availableMetadata, configuredMetingTypes, dalurenInstellingen] = await Promise.all([
            this.client.listStatisticMetadata(),
            this.repository.getConfiguredMetingTypes(),
            this.repository.getDalurenInstellingen(),
        ]);
        this.configuredMetingTypes = configuredMetingTypes;
        this.dalurenInstellingen = dalurenInstellingen ?? STANDAARD_DALUREN;
        const configuredStatisticIds = new Set(
            configuredMetingTypes
                .map((metingType) => metingType.haEntityId)
                .filter((statisticId): statisticId is string => Boolean(statisticId))
        );
        const supported = availableMetadata.filter(
            (item) => configuredStatisticIds.has(item.statistic_id) && (item.has_mean || item.has_sum)
        );
        this.logger.info('Loaded Home Assistant statistic metadata.', {
            discovered: availableMetadata.length,
            configured: configuredStatisticIds.size,
            supported: supported.length,
        });

        return supported;
    }

    private async refreshMetadata(): Promise<HomeAssistantStatisticMetadata[]> {
        const supported = await this.loadConfiguredMetadata();
        for (const item of supported) {
            try {
                await this.repository.saveMetadata(item);
            } catch (error) {
                this.logger.error('Failed to persist statistic metadata; skipping this statistic.', {
                    statisticId: item.statistic_id,
                    error: errorMessage(error),
                });
            }
        }
        return supported;
    }

    private async findOldestAvailable(
        statisticIds: string[],
        endTime: Date,
        chunkDays: number,
        batchSize: number,
        minimumDate: Date
    ): Promise<Date | null> {
        const pendingBatches = chunkArray(statisticIds, batchSize).map((ids) => ({ ids, active: true }));
        let cursor = endTime;
        let oldestAvailable: Date | null = null;
        let discoveryFailed = false;

        while (cursor > minimumDate && pendingBatches.some((batch) => batch.active)) {
            const start = maxDate(subtractDays(cursor, chunkDays), minimumDate);
            for (const batch of pendingBatches) {
                if (!batch.active) continue;
                try {
                    const result = await this.client.statisticsDuringPeriod({
                        startTime: start,
                        endTime: cursor,
                        statisticIds: batch.ids,
                    });
                    const timestamps = Object.values(result)
                        .flat()
                        .map((point) => statisticTimestamp(point.start))
                        .filter((timestamp): timestamp is Date => timestamp !== null);

                    if (timestamps.length === 0) {
                        batch.active = false;
                        continue;
                    }

                    for (const timestamp of timestamps) {
                        if (!oldestAvailable || timestamp < oldestAvailable) oldestAvailable = timestamp;
                    }
                } catch (error) {
                    discoveryFailed = true;
                    batch.active = false;
                    this.logger.error('Historical discovery request failed; falling back to the configured history floor.', {
                        startTime: start.toISOString(),
                        endTime: cursor.toISOString(),
                        statisticCount: batch.ids.length,
                        error: errorMessage(error),
                    });
                }
            }

            this.logger.info('Scanned historical discovery window.', {
                startTime: start.toISOString(),
                endTime: cursor.toISOString(),
                activeBatches: pendingBatches.filter((batch) => batch.active).length,
                oldestAvailable: oldestAvailable?.toISOString() ?? null,
            });
            cursor = start;
        }

        return discoveryFailed ? minimumDate : oldestAvailable;
    }

    private async importRange(
        start: Date,
        end: Date,
        statisticIds: string[],
        metadataById: Map<string, HomeAssistantStatisticMetadata>,
        batchSize: number,
        failedStatisticIds: Set<string>,
        advanceCheckpoint = true
    ): Promise<ImportBatchResult> {
        let valuesUpserted = 0;
        let dagMetingenUpserted = 0;
        let oldestAvailable: Date | null = null;
        for (const batch of chunkArray(statisticIds, batchSize)) {
            const activeBatch = batch.filter((statisticId) => !failedStatisticIds.has(statisticId));
            if (activeBatch.length === 0) continue;
            const result = await this.importBatch(start, end, activeBatch, metadataById, advanceCheckpoint);
            valuesUpserted += result.valuesUpserted;
            dagMetingenUpserted += result.dagMetingenUpserted;
            if (result.oldestAvailable && (!oldestAvailable || result.oldestAvailable < oldestAvailable)) {
                oldestAvailable = result.oldestAvailable;
            }
            for (const statisticId of result.failedStatisticIds) failedStatisticIds.add(statisticId);
        }
        return { valuesUpserted, dagMetingenUpserted, failedStatisticIds: [...failedStatisticIds], oldestAvailable };
    }

    private async importBatch(
        start: Date,
        end: Date,
        statisticIds: string[],
        metadataById: Map<string, HomeAssistantStatisticMetadata>,
        advanceCheckpoint = true
    ): Promise<ImportBatchResult> {
        let result: HomeAssistantStatisticsResult;
        try {
            result = await this.client.statisticsDuringPeriod({ startTime: start, endTime: end, statisticIds });
        } catch (error) {
            this.logger.error('Statistics request failed; the affected IDs will retry on a later sync.', {
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                statisticCount: statisticIds.length,
                error: errorMessage(error),
            });
            return { valuesUpserted: 0, dagMetingenUpserted: 0, failedStatisticIds: statisticIds, oldestAvailable: null };
        }

        let valuesUpserted = 0;
        let dagMetingenUpserted = 0;
        const failedStatisticIds: string[] = [];
        let oldestAvailable: Date | null = null;
        for (const statisticId of statisticIds) {
            let successful = true;
            const source = metadataById.get(statisticId)?.source ?? 'unknown';
            const points = (result[statisticId] ?? []).slice().sort((first, second) => {
                return (statisticTimestamp(first.start)?.getTime() ?? 0) - (statisticTimestamp(second.start)?.getTime() ?? 0);
            });
            const values = points
                .map((point) => toStatisticValue(statisticId, source, point))
                .filter((value): value is StatisticValueInput => value !== null);
            if (values.length !== points.length) successful = false;

            for (const value of values) {
                try {
                    await this.repository.upsertValue(value);
                    valuesUpserted += 1;
                    if (!oldestAvailable || value.timestamp < oldestAvailable) oldestAvailable = value.timestamp;
                } catch (error) {
                    successful = false;
                    this.logger.error('Failed to upsert statistic value; continuing with the remaining values.', {
                        statisticId,
                        timestamp: value.timestamp.toISOString(),
                        error: errorMessage(error),
                    });
                }
            }

            let dailyValues: DagMetingInput[] = [];
            if (successful && metadataById.get(statisticId)?.has_sum) {
                try {
                    dailyValues = await this.calculateDagMetingen(statisticId, values);
                } catch (error) {
                    successful = false;
                    this.logger.error('Failed to calculate daily metingen; continuing with other statistics.', {
                        statisticId,
                        error: errorMessage(error),
                    });
                }
            }
            for (const dailyValue of dailyValues) {
                try {
                    await this.repository.upsertDagMeting(dailyValue);
                    dagMetingenUpserted += 1;
                } catch (error) {
                    successful = false;
                    this.logger.error('Failed to upsert daily meting; continuing with the remaining daily values.', {
                        statisticId,
                        metingTypeId: dailyValue.metingTypeId,
                        datum: dailyValue.datum.toISOString(),
                        error: errorMessage(error),
                    });
                }
            }

            if (successful && advanceCheckpoint) {
                try {
                    await this.repository.setLastSyncedAt(statisticId, end);
                } catch (error) {
                    failedStatisticIds.push(statisticId);
                    this.logger.error('Failed to advance statistic checkpoint.', { statisticId, error: errorMessage(error) });
                    continue;
                }
            } else if (!successful) {
                failedStatisticIds.push(statisticId);
            }
        }
        return { valuesUpserted, dagMetingenUpserted, failedStatisticIds, oldestAvailable };
    }

    private async calculateDagMetingen(statisticId: string, values: StatisticValueInput[]): Promise<DagMetingInput[]> {
        const sourceTypes = this.configuredMetingTypes.filter((type) => type.haEntityId === statisticId);
        if (sourceTypes.length === 0 || values.length === 0) return [];
        const families = new Map<string, ConfiguredMetingType[]>();
        for (const sourceType of sourceTypes) {
            const familyCode = baseCode(sourceType.code);
            families.set(familyCode, [...(families.get(familyCode) ?? []), sourceType]);
        }

        const touchedDates = [...new Set(
            values
                .filter((value) => !isLokaleMiddernacht(value.timestamp))
                .map((value) => lokaleDatum(value.timestamp))
        )];
        const dailyValues: DagMetingInput[] = [];
        for (const dateKey of touchedDates) {
            const localMidnight = new Date(`${dateKey}T00:00:00.000Z`);
            const nextDate = new Date(localMidnight);
            nextDate.setUTCDate(nextDate.getUTCDate() + 1);
            const dayStart = lokaleTijdNaarUtc(dateKey, '00:00');
            const dayEnd = lokaleTijdNaarUtc(nextDate.toISOString().slice(0, 10), '00:00');
            const [previous, dayPoints] = await Promise.all([
                this.repository.getPreviousStatisticValue(statisticId, dayStart),
                this.repository.getStatisticValuesInRange(statisticId, dayStart, dayEnd),
            ]);
            const startBoundary = dayPoints.find((point) => point.timestamp.getTime() === dayStart.getTime());
            let previousValue = startBoundary?.sum ?? startBoundary?.state ?? previous?.sum ?? previous?.state ?? null;
            const resetDaily = sourceTypes.some((type) => type.haDailyReset);
            const totals = new Map<number, number>();
            const targetIdsByFamily = new Map<string, { peak: number | null; offPeak: number | null }>();

            for (const [familyCode, family] of families) {
                const singleSource = family.some((type) => type.haSingleSourcePeak || type.haSingleSourceOffPeak);
                if (!singleSource) {
                    for (const type of family) totals.set(type.id, 0);
                    continue;
                }

                const peakEnabled = family.some((type) => type.haSingleSourcePeak);
                const offPeakEnabled = family.some((type) => type.haSingleSourceOffPeak);
                const [peak, offPeak] = await Promise.all([
                    peakEnabled ? this.findMetingTypeId(`${familyCode}_PIEK`) : null,
                    offPeakEnabled ? this.findMetingTypeId(`${familyCode}_DAL`) : null,
                ]);
                if (peak !== null) totals.set(peak, 0);
                if (offPeak !== null) totals.set(offPeak, 0);
                targetIdsByFamily.set(familyCode, { peak, offPeak });
            }

            for (const point of dayPoints) {
                if (point.timestamp <= dayStart) continue;
                const currentValue = point.sum ?? point.state;
                if (currentValue === null) continue;

                let increment = 0;
                if (previousValue === null) {
                    if (resetDaily)
                        increment = Math.max(0, currentValue);
                } else if (currentValue < previousValue && resetDaily) {
                    increment = Math.max(0, currentValue);
                } else {
                    increment = Math.max(0, currentValue - previousValue);
                }
                if(statisticId === 'sensor.zp_productie_vandaag')
                console.log(`Calculating daily metingen for ${statisticId} on ${dateKey}: previous=${previousValue}, current=${currentValue}, increment=${increment}`);
                previousValue = currentValue;
                if (increment === 0) continue;

                for (const [familyCode, family] of families) {
                    if (!family.some((type) => type.haSingleSourcePeak || type.haSingleSourceOffPeak)) {
                        for (const type of family) totals.set(type.id, (totals.get(type.id) ?? 0) + increment);
                        continue;
                    }

                    const intervalEnd = new Date(point.timestamp.getTime() - 1);
                    const bucket = isDalUur(intervalEnd, this.dalurenInstellingen) ? 'offPeak' : 'peak';
                    const targetId = targetIdsByFamily.get(familyCode)?.[bucket] ?? null;
                    if (targetId !== null) totals.set(targetId, (totals.get(targetId) ?? 0) + increment);
                }
            }

            for (const [metingTypeId, waarde] of totals) {
                dailyValues.push({
                    datum: new Date(`${dateKey}T12:00:00.000Z`),
                    metingTypeId,
                    waarde: Math.round(waarde * 1000) / 1000,
                });
            }
        }

        return dailyValues;
    }

    private async findMetingTypeId(code: string): Promise<number | null> {
        if (this.metingTypeIdsByCode.has(code)) return this.metingTypeIdsByCode.get(code) ?? null;
        const metingType = await this.repository.findMetingTypeByCode(code);
        const id = metingType?.id ?? null;
        this.metingTypeIdsByCode.set(code, id);
        if (id === null) this.logger.warn('No metertype found for single-source statistic bucket.', { code });
        return id;
    }

    private summary(
        mode: StatisticsSyncSummary['mode'],
        statisticCount: number,
        chunkCount: number,
        valuesUpserted: number,
        oldestAvailable: Date | null,
        startedAt: number,
        failedStatistics = 0,
        dagMetingenUpserted = 0
    ): StatisticsSyncSummary {
        const summary = {
            mode,
            statisticCount,
            chunkCount,
            valuesUpserted,
            dagMetingenUpserted,
            failedStatistics,
            oldestAvailable: oldestAvailable?.toISOString() ?? null,
            durationMs: Date.now() - startedAt,
        };
        this.logger.info('Home Assistant statistics sync finished.', summary);
        return summary;
    }
}

/** Runs an initial import using HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN. */
export async function syncHistoricalStatistics(options: StatisticsSyncOptions = {}): Promise<StatisticsSyncSummary> {
    const client = createClient();
    try {
        const service = await createDefaultService(client);
        return await service.syncHistorical(options);
    } finally {
        client.close();
    }
}

/** Runs an incremental import, backfilling newly discovered statistic IDs first. */
export async function syncIncrementalStatistics(options: StatisticsSyncOptions = {}): Promise<StatisticsSyncSummary> {
    const client = createClient();
    try {
        const service = await createDefaultService(client);
        return await service.syncIncremental(options);
    } finally {
        client.close();
    }
}

/** Reimports one local calendar day for configured Home Assistant statistics. */
export async function syncStatisticsForDay(
    date: string,
    options: StatisticsSyncOptions = {}
): Promise<StatisticsSyncSummary> {
    const client = createClient();
    try {
        const service = await createDefaultService(client);
        return await service.syncDay(date, options);
    } finally {
        client.close();
    }
}

/** Retrieves raw hourly statistics for one local day without modifying database values or checkpoints. */
export async function getHomeAssistantStatisticsForDay(
    date: string,
    statisticId?: string,
    options: StatisticsSyncOptions = {}
): Promise<StatisticsDayDiagnosticResult> {
    const client = createClient();
    try {
        const service = await createDefaultService(client);
        return await service.getStatisticsForDay(date, statisticId, options);
    } finally {
        client.close();
    }
}

/** Creates consecutive non-overlapping date ranges no longer than 30 days. */
export function createDateChunks(start: Date, end: Date, days: number): Array<{ start: Date; end: Date }> {
    if (!Number.isInteger(days) || days < 1 || days > 30) throw new RangeError('chunkDays must be an integer from 1 to 30.');
    if (end <= start) return [];

    const chunks: Array<{ start: Date; end: Date }> = [];
    let cursor = start;
    while (cursor < end) {
        const next = minDate(addDays(cursor, days), end);
        chunks.push({ start: cursor, end: next });
        cursor = next;
    }
    return chunks;
}

/** Parses Home Assistant ISO timestamps or Unix-second timestamps to Date. */
export function statisticTimestamp(value: HomeAssistantStatisticPoint['start']): Date | null {
    const timestamp = typeof value === 'number'
        ? new Date(value < 1_000_000_000_000 ? value * 1_000 : value)
        : new Date(value);
    return Number.isFinite(timestamp.getTime()) ? timestamp : null;
}

function toStatisticValue(statisticId: string, source: string, point: HomeAssistantStatisticPoint): StatisticValueInput | null {
    const timestamp = statisticTimestamp(point.start);
    if (!timestamp) return null;
    const state = finiteOrNull(point.state);
    const sum = finiteOrNull(point.sum);
    if (state === null && sum === null) return null;
    return { statisticId, timestamp, state, sum, source };
}

function normalizeOptions(options: StatisticsSyncOptions) {
    const chunkDays = options.chunkDays ?? Number(process.env.HA_STATISTICS_CHUNK_DAYS ?? 30);
    if (!Number.isInteger(chunkDays) || chunkDays < 1 || chunkDays > 30) {
        throw new RangeError('HA_STATISTICS_CHUNK_DAYS must be an integer from 1 to 30.');
    }
    const statisticBatchSize = options.statisticBatchSize ?? Number(process.env.HA_STATISTICS_BATCH_SIZE ?? 25);
    if (!Number.isInteger(statisticBatchSize) || statisticBatchSize < 1) {
        throw new RangeError('HA_STATISTICS_BATCH_SIZE must be a positive integer.');
    }
    return { chunkDays, statisticBatchSize, endTime: options.endTime ?? new Date() };
}

function minimumSearchDateFromEnvironment(): Date {
    const configured = process.env.HA_STATISTICS_EARLIEST_DATE;
    const date = configured ? new Date(configured) : DEFAULT_MINIMUM_DATE;
    if (!Number.isFinite(date.getTime())) throw new Error('HA_STATISTICS_EARLIEST_DATE must be a valid ISO date.');
    return date;
}

function createClient(): HomeAssistantStatisticsClient {
    const url = process.env.HOME_ASSISTANT_WS_URL ?? process.env.HOME_ASSISTANT_URL;
    const accessToken = process.env.HOME_ASSISTANT_TOKEN;
    if (!url || !accessToken) throw new Error('HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN must be configured.');
    return new HomeAssistantStatisticsClient({ url, accessToken });
}

async function createDefaultService(client: HomeAssistantStatisticsClient): Promise<HomeAssistantStatisticsSyncService> {
    const { PrismaStatisticsSyncRepository } = await import('./statistics-repository');
    return new HomeAssistantStatisticsSyncService(client, new PrismaStatisticsSyncRepository());
}

function chunkArray<T>(values: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
    return result;
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1_000);
}

function subtractDays(date: Date, days: number): Date {
    return new Date(date.getTime() - days * 24 * 60 * 60 * 1_000);
}

function maxDate(first: Date, second: Date): Date {
    return first > second ? first : second;
}

function minDate(first: Date, second: Date): Date {
    return first < second ? first : second;
}

function finiteOrNull(value: number | null | undefined): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function lokaleDatum(timestamp: Date): string {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Brussels',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })
            .formatToParts(timestamp)
            .map((part) => [part.type, part.value])
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
}

function isLokaleMiddernacht(timestamp: Date): boolean {
    return timestamp.getTime() === lokaleTijdNaarUtc(lokaleDatum(timestamp), '00:00').getTime();
}

function isLocalDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function baseCode(code: string): string {
    return code.replace(/_(PIEK|DAL)$/i, '');
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}