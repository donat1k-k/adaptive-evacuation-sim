// Результаты прогона и метрики — выходные данные (SPEC §13–14, §19). Только типы.
// Важно (SPEC §14): время эвакуации считается ТОЛЬКО по эвакуированным агентам;
// процент эвакуации отчитывается всегда рядом со временем.
import type { AgentId, AgentState } from './agent.ts'
import type { ExitId } from './grid.ts'
import type { AlgorithmId } from './algorithm.ts'
import type { SimulationConfig } from './simulation.ts'
import type { RunMetadata } from './reproducibility.ts'

/** Итог по одному агенту. */
export interface AgentResult {
  readonly id: AgentId
  readonly algorithm: AlgorithmId
  readonly evacuated: boolean
  /** Тик эвакуации; null — не эвакуирован. */
  readonly tEvacuated: number | null
  readonly tStart: number
  /** Время эвакуации = tEvacuated − tStart; null — не эвакуирован. */
  readonly evacuationTime: number | null
  readonly reroutes: number
  /** Выход, через который вышел; null — не вышел. */
  readonly exitUsed: ExitId | null
  /** Состояние на момент T_max. */
  readonly finalState: AgentState
}

/** Нагрузка на один выход (SPEC §13). */
export interface ExitLoad {
  readonly exitId: ExitId
  readonly evacuatedCount: number
}

/** Точка кривой эвакуации: доля эвакуированных к данному тику (SPEC §19). */
export interface EvacuationCurvePoint {
  readonly tick: number
  readonly evacuatedCount: number
  readonly evacuatedFraction: number
}

/** Агрегированные метрики одного прогона (SPEC §13). */
export interface SimulationMetrics {
  /** makespan — тик выхода последнего эвакуированного; null, если никто не вышел. */
  readonly makespan: number | null
  /** Среднее время эвакуации (только по эвакуированным); null, если никто не вышел. */
  readonly meanEvacuationTime: number | null
  /** Минимальное время эвакуации (только по эвакуированным); null, если никто не вышел. */
  readonly minEvacuationTime: number | null
  /** Максимальное время эвакуации (только по эвакуированным); null, если никто не вышел. */
  readonly maxEvacuationTime: number | null
  /** Тик завершения прогона (state.tick при status=done): T_max или полная эвакуация. */
  readonly finishedTick: number
  readonly totalAgents: number
  readonly evacuatedCount: number
  /** Доля эвакуированных [0..1] — всегда отчитывается рядом со временем. */
  readonly evacuatedFraction: number
  /** Число неэвакуированных (totalAgents − evacuatedCount; SPEC §14: к T_max не вышли). */
  readonly strandedCount: number
  /** Из них в явном состоянии blocked/stuck на момент T_max (подмножество stranded). */
  readonly blockedOrStuckCount: number
  readonly exitLoads: readonly ExitLoad[]
  readonly totalReroutes: number
  readonly meanReroutes: number
  /** Средняя плотность в критических зонах (опц. метрика). */
  readonly meanDensity: number | null
  /** Максимальная плотность в критических зонах (опц. метрика). */
  readonly maxDensity: number | null
  readonly evacuationCurve: readonly EvacuationCurvePoint[]
}

/** Полный результат одного запуска: конфиг + метаданные + метрики + агенты. */
export interface SimulationResult {
  readonly metadata: RunMetadata
  readonly config: SimulationConfig
  readonly metrics: SimulationMetrics
  readonly agents: readonly AgentResult[]
}

/**
 * Плоская строка для экспорта в CSV/JSON (SPEC §15, §19): один прогон = одна строка.
 * Несёт идентификацию + конфиг + ключевые метрики, чтобы результат воспроизводился.
 */
export interface ExportRow {
  readonly runId: string
  readonly scenarioId: string
  readonly scenarioVersion: string
  readonly algorithm: AlgorithmId
  readonly seed: number
  readonly maxTicks: number
  readonly totalAgents: number
  readonly evacuatedCount: number
  readonly evacuatedFraction: number
  readonly strandedCount: number
  readonly makespan: number | null
  readonly meanEvacuationTime: number | null
  readonly maxEvacuationTime: number | null
  readonly totalReroutes: number
  readonly meanReroutes: number
}
