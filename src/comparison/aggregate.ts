// Агрегация прогонов по (scenario + algorithm) (этап E9). Headless, чистые функции.
import type { AggregateSummary, RunResult } from './types.ts'

/** Среднее по числам; пустой массив → 0. */
function mean(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, v) => acc + v, 0) / values.length
}

/**
 * Среднее по значениям, часть которых может быть null (makespan/время без
 * эвакуированных). Усредняем ТОЛЬКО определённые значения; если все null → null
 * (SPEC §14: время только по эвакуированным; нет данных ≠ ноль). См. DECISIONS.
 */
function meanNullable(values: readonly (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null)
  if (present.length === 0) return null
  return mean(present)
}

/** Стабильный ключ пары (scenario, algorithm). */
function pairKey(scenarioId: string, algorithm: string): string {
  return `${scenarioId}::${algorithm}`
}

/**
 * Сгруппировать прогоны по (scenario + algorithm) и посчитать средние.
 * Порядок агрегатов — порядок первого появления пары в runs (детерминирован).
 */
export function aggregateRuns(runs: readonly RunResult[]): AggregateSummary[] {
  const order: string[] = []
  const groups = new Map<string, RunResult[]>()
  for (const run of runs) {
    const key = pairKey(run.scenarioId, run.algorithm)
    let bucket = groups.get(key)
    if (!bucket) {
      bucket = []
      groups.set(key, bucket)
      order.push(key)
    }
    bucket.push(run)
  }

  return order.map((key) => {
    const bucket = groups.get(key) as RunResult[]
    const first = bucket[0] as RunResult
    return {
      scenarioId: first.scenarioId,
      scenarioName: first.scenarioName,
      algorithm: first.algorithm,
      runs: bucket.length,
      meanEvacuatedFraction: mean(bucket.map((r) => r.metrics.evacuatedFraction)),
      meanMakespan: meanNullable(bucket.map((r) => r.metrics.makespan)),
      meanEvacuationTime: meanNullable(bucket.map((r) => r.metrics.meanEvacuationTime)),
      meanTotalReroutes: mean(bucket.map((r) => r.metrics.totalReroutes)),
      meanStrandedCount: mean(bucket.map((r) => r.metrics.strandedCount)),
    }
  })
}
