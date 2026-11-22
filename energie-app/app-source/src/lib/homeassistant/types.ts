export interface HomeAssistantAuthRequiredMessage {
  type: 'auth_required';
  ha_version?: string;
}

export interface HomeAssistantAuthMessage {
  type: 'auth';
  access_token: string;
}

export interface HomeAssistantAuthOkMessage {
  type: 'auth_ok';
  ha_version: string;
}

export interface HomeAssistantAuthInvalidMessage {
  type: 'auth_invalid';
  message: string;
}

export interface HomeAssistantCommandEnvelope {
  id: number;
  type: string;
  [key: string]: unknown;
}

export interface HomeAssistantSuccessResponse<T> {
  id: number;
  type: 'result';
  success: true;
  result: T;
}

export interface HomeAssistantErrorResponse {
  id: number;
  type: 'result';
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type HomeAssistantCommandResponse<T> =
  | HomeAssistantSuccessResponse<T>
  | HomeAssistantErrorResponse;

export interface HomeAssistantStatisticMetadata {
  statistic_id: string;
  source: string;
  name: string | null;
  unit_of_measurement: string | null;
  has_mean: boolean;
  has_sum: boolean;
}

export type HomeAssistantStatisticMetadataEntries =
  | Record<string, Partial<HomeAssistantStatisticMetadata>>
  | HomeAssistantStatisticMetadata[];

export type HomeAssistantListStatisticIdsResult =
  | { statistic_ids: HomeAssistantStatisticMetadataEntries }
  | HomeAssistantStatisticMetadataEntries;

export interface HomeAssistantStatisticPoint {
  start: string | number;
  end?: string | number;
  state?: number | null;
  sum?: number | null;
  mean?: number | null;
  min?: number | null;
  max?: number | null;
}

export type HomeAssistantStatisticsResult = Record<string, HomeAssistantStatisticPoint[]>;

export interface ListStatisticIdsCommand extends HomeAssistantCommandEnvelope {
  type: 'recorder/list_statistic_ids';
}

export interface StatisticsDuringPeriodCommand extends HomeAssistantCommandEnvelope {
  type: 'recorder/statistics_during_period';
  start_time: string;
  end_time: string;
  period: 'hour' | 'day' | '5minute';
  statistic_ids: string[];
  types: Array<'state'>;
}

export type HomeAssistantStatisticsCommand =
  | ListStatisticIdsCommand
  | StatisticsDuringPeriodCommand;

export type HomeAssistantServerMessage =
  | HomeAssistantAuthRequiredMessage
  | HomeAssistantAuthOkMessage
  | HomeAssistantAuthInvalidMessage
  | HomeAssistantCommandResponse<unknown>
  | { id?: number; type: string;[key: string]: unknown };

export interface StatisticsSyncLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export const consoleStatisticsLogger: StatisticsSyncLogger = {
  info: (message, context) => console.info(`[HA statistics] ${message}`, context ?? ''),
  warn: (message, context) => console.warn(`[HA statistics] ${message}`, context ?? ''),
  error: (message, context) => console.error(`[HA statistics] ${message}`, context ?? ''),
};