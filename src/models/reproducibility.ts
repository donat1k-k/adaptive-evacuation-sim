// Типы воспроизводимости: seed и метаданные запуска (SPEC §15).

/** Seed ГПСЧ — целое число; один seed → одна детерминированная реализация. */
export type Seed = number

/** Версия модели/симулятора. Повышается при изменениях, влияющих на результат. */
export const MODEL_VERSION = '0.1.0' as const

/** Метаданные запуска — сохраняются вместе с результатом для воспроизводимости. */
export interface RunMetadata {
  /** Уникальный идентификатор запуска. */
  readonly runId: string
  readonly scenarioId: string
  readonly scenarioVersion: string
  /** Дата/время запуска в формате ISO 8601. */
  readonly startedAt: string
  /** Версия модели/симулятора на момент запуска (MODEL_VERSION). */
  readonly modelVersion: string
}
