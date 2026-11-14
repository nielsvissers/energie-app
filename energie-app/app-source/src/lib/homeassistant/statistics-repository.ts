import { prisma } from '../prisma';
import { parseDalurenInstellingen } from '../daluren';
import type { HomeAssistantStatisticMetadata } from './types';
import type {
  ConfiguredMetingType,
  DagMetingInput,
  StatisticBaseline,
  StatisticCheckpoint,
  StatisticValueInput,
  StatisticsSyncRepository,
} from './statistics-sync';

/** Prisma-backed persistence adapter for Home Assistant statistics sync. */
export class PrismaStatisticsSyncRepository implements StatisticsSyncRepository {
  /** Persists a source and its latest metadata without changing its sync checkpoint. */
  async saveMetadata(metadata: HomeAssistantStatisticMetadata): Promise<void> {
    await prisma.statisticSource.upsert({
      where: { id: metadata.source },
      update: { name: metadata.source },
      create: { id: metadata.source, name: metadata.source },
    });

    await prisma.statisticMetadata.upsert({
      where: { statisticId: metadata.statistic_id },
      update: {
        sourceId: metadata.source,
        name: metadata.name,
        unitOfMeasurement: metadata.unit_of_measurement,
        hasMean: metadata.has_mean,
        hasSum: metadata.has_sum,
      },
      create: {
        statisticId: metadata.statistic_id,
        sourceId: metadata.source,
        name: metadata.name,
        unitOfMeasurement: metadata.unit_of_measurement,
        hasMean: metadata.has_mean,
        hasSum: metadata.has_sum,
      },
    });
  }

  /** Lists only metering types explicitly connected to a Home Assistant entity. */
  async getConfiguredMetingTypes(): Promise<ConfiguredMetingType[]> {
    return prisma.metingType.findMany({
      where: { haEntityId: { not: null } },
      select: {
        id: true,
        code: true,
        haEntityId: true,
        haDailyReset: true,
        haSingleSourcePeak: true,
        haSingleSourceOffPeak: true,
      },
    });
  }

  /** Loads dal-hour configuration, defaulting when it has not been saved yet. */
  async getDalurenInstellingen() {
    const instelling = await prisma.instelling.findUnique({ where: { sleutel: 'daluren_schema' } });
    return parseDalurenInstellingen(instelling?.waarde);
  }

  /** Lists checkpoints only for the configured Home Assistant statistic IDs. */
  async getSupportedStatistics(statisticIds: string[]): Promise<StatisticCheckpoint[]> {
    if (statisticIds.length === 0) return [];
    return prisma.statisticMetadata.findMany({
      where: {
        statisticId: { in: statisticIds },
        OR: [{ hasMean: true }, { hasSum: true }],
      },
      select: { statisticId: true, sourceId: true, lastSyncedAt: true },
      orderBy: { statisticId: 'asc' },
    });
  }

  /** Gets the last stored point before a range to calculate its first increment. */
  async getPreviousStatisticValue(statisticId: string, before: Date): Promise<StatisticBaseline | null> {
    return prisma.statisticValue.findFirst({
      where: { statisticId, timestamp: { lt: before } },
      orderBy: { timestamp: 'desc' },
      select: { state: true, sum: true },
    });
  }

  /** Loads hourly points from the day start through its exact end boundary. */
  async getStatisticValuesInRange(statisticId: string, start: Date, end: Date): Promise<StatisticValueInput[]> {
    return prisma.statisticValue.findMany({
      where: { statisticId, timestamp: { gte: start, lte: end } },
      orderBy: { timestamp: 'asc' },
      select: { statisticId: true, timestamp: true, state: true, sum: true, source: true },
    });
  }

  /** Idempotently inserts or updates one hourly statistics point. */
  async upsertValue(value: StatisticValueInput): Promise<void> {
    await prisma.statisticValue.upsert({
      where: {
        statisticId_timestamp: {
          statisticId: value.statisticId,
          timestamp: value.timestamp,
        },
      },
      update: { state: value.state, sum: value.sum, source: value.source },
      create: value,
    });
  }

  /** Saves a daily HA total using the existing date, metertype and origin key. */
  async upsertDagMeting(meting: DagMetingInput): Promise<void> {
    await prisma.dagMeting.upsert({
      where: {
        datum_metingTypeId_herkomst: {
          datum: meting.datum,
          metingTypeId: meting.metingTypeId,
          herkomst: 'HOME_ASSISTANT',
        },
      },
      update: { waarde: meting.waarde },
      create: {
        ...meting,
        herkomst: 'HOME_ASSISTANT',
      },
    });
  }

  /** Looks up a destination metertype for a single-source peak/off-peak reading. */
  async findMetingTypeByCode(code: string): Promise<{ id: number } | null> {
    return prisma.metingType.findUnique({ where: { code }, select: { id: true } });
  }

  /** Advances the per-statistic checkpoint after a complete time chunk succeeds. */
  async setLastSyncedAt(statisticId: string, timestamp: Date): Promise<void> {
    await prisma.statisticMetadata.update({
      where: { statisticId },
      data: { lastSyncedAt: timestamp },
    });
  }
}