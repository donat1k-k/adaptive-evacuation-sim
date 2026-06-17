// Типы результатов сравнения алгоритмов (этап E9). Headless: не зависит от React.
// Формат сознательно «сырой» — данные, а не выводы (E13/E11 не входят).
import type { AlgorithmId, ScenarioId, Seed, SimulationConfig, SimulationMetrics } from '../models/index.ts'

/** Результат одного прогона: scenario × algorithm × seed + конфиг + метрики. */
export interface RunResult {
  readonly scenarioId: ScenarioId
  readonly scenarioName: string
  readonly scenarioVersion: string
  readonly algorithm: AlgorithmId
  readonly seed: Seed
  /** Полный конфиг прогона (воспроизводимость, SPEC §15). */
  readonly config: SimulationConfig
  readonly metrics: SimulationMetrics
}

/**
 * Агрегат по (scenario + algorithm) поверх набора seed'ов (SPEC §15–16).
 * Средние по makespan/времени берутся ТОЛЬКО по прогонам, где значение определено
 * (есть эвакуированные); если таких нет — null (см. DECISIONS).
 */
export interface AggregateSummary {
  readonly scenarioId: ScenarioId
  readonly scenarioName: string
  readonly algorithm: AlgorithmId
  /** Число прогонов (= число seed'ов для этой пары). */
  readonly runs: number
  readonly meanEvacuatedFraction: number
  readonly meanMakespan: number | null
  readonly meanEvacuationTime: number | null
  readonly meanTotalReroutes: number
  readonly meanStrandedCount: number
}

/** Метаданные сравнения (версия модели + дата генерации). */
export interface ComparisonMetadata {
  readonly modelVersion: string
  readonly generatedAt: string
  readonly scenarioIds: readonly ScenarioId[]
  readonly algorithms: readonly AlgorithmId[]
  readonly seeds: readonly Seed[]
}

/** Полный результат сравнения: метаданные + все прогоны + агрегаты. */
export interface ComparisonResult {
  readonly metadata: ComparisonMetadata
  readonly runs: readonly RunResult[]
  readonly aggregates: readonly AggregateSummary[]
}
