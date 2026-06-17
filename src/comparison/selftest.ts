// Sanity-проверки comparison runner (этап E9). ЭКСПОРТИРУЕМЫЕ хелперы, НЕ
// авто-suite (как E3/E5/E6/E7; без тестового фреймворка). Чистые, детерминированные;
// не зависят от React.
import { MVP_ALGORITHMS } from '../models/index.ts'
import { FINAL_SCENARIOS } from '../scenarios/index.ts'
import { runScenarioComparison } from './runComparison.ts'

export interface ComparisonSelfCheckResult {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

/** Стабильная сериализация метрик прогона для сравнения на детерминизм. */
function metricsKey(run: { scenarioId: string; algorithm: string; seed: number; metrics: unknown }): string {
  return `${run.scenarioId}|${run.algorithm}|${run.seed}|${JSON.stringify(run.metrics)}`
}

export function runComparisonSelfChecks(): ComparisonSelfCheckResult[] {
  const results: ComparisonSelfCheckResult[] = []
  const algorithms = MVP_ALGORITHMS
  const scenarios = FINAL_SCENARIOS

  // 1. Runner прогоняет S1/S2/S3 × A1/A2/A4 хотя бы на одном seed.
  {
    const res = runScenarioComparison({ scenarios, algorithms, seeds: [1] })
    const expected = scenarios.length * algorithms.length // 3 × 3 = 9
    const passed = res.runs.length === expected
    results.push({
      name: 'runs-all-scenarios-x-algorithms',
      passed,
      detail: `${res.runs.length} прогонов (ожидалось ${expected})`,
    })
  }

  // 2. Каждый прогон содержит метрики; totalAgents совпадает с agentCount сценария.
  {
    const res = runScenarioComparison({ scenarios, algorithms, seeds: [1] })
    let ok = true
    let detail = 'у всех прогонов есть метрики'
    for (const run of res.runs) {
      const scn = scenarios.find((s) => s.id === run.scenarioId)
      if (!run.metrics || !scn || run.metrics.totalAgents !== scn.agentCount) {
        ok = false
        detail = `прогон ${run.scenarioId}/${run.algorithm}: totalAgents=${run.metrics?.totalAgents}`
        break
      }
    }
    results.push({ name: 'every-run-has-metrics', passed: ok, detail })
  }

  // 3. Повтор того же scenario+algorithm+seed → идентичные метрики (детерминизм).
  {
    const a = runScenarioComparison({ scenarios, algorithms, seeds: [1, 2] })
    const b = runScenarioComparison({ scenarios, algorithms, seeds: [1, 2] })
    const ka = a.runs.map(metricsKey).join('\n')
    const kb = b.runs.map(metricsKey).join('\n')
    const passed = ka === kb
    results.push({
      name: 'repeated-comparison-deterministic',
      passed,
      detail: passed ? 'два прогона дали идентичные метрики' : 'метрики разошлись между прогонами',
    })
  }

  // 4. Aggregate runs count корректен (= число seed'ов на пару).
  {
    const seeds = [1, 2, 3]
    const res = runScenarioComparison({ scenarios, algorithms, seeds })
    const expectedPairs = scenarios.length * algorithms.length
    const allCorrect = res.aggregates.every((a) => a.runs === seeds.length)
    const passed = res.aggregates.length === expectedPairs && allCorrect
    results.push({
      name: 'aggregate-runs-count',
      passed,
      detail: `${res.aggregates.length} пар, runs/пара ${allCorrect ? `= ${seeds.length}` : '≠ seeds'}`,
    })
  }

  // 5. Алгоритмы не мутируют сценарий между прогонами.
  {
    const before = scenarios.map((s) => JSON.stringify(s))
    runScenarioComparison({ scenarios, algorithms, seeds: [1, 2] })
    const after = scenarios.map((s) => JSON.stringify(s))
    const passed = before.every((b, i) => b === after[i])
    results.push({
      name: 'scenarios-not-mutated',
      passed,
      detail: passed ? 'сценарии не изменились после прогонов' : 'сценарий был мутирован',
    })
  }

  // 6. Парное сравнение (SPEC §15): при одном seed стартовые позиции идентичны для
  //    всех алгоритмов (старты зависят только от seed+сценарий). Проверяем через
  //    exitLoads-сумму? Нет — проверяем напрямую: totalAgents равны и сценарий один.
  //    Идентичность стартов гарантируется размещением до любой по-тиковой случайности
  //    (D13); здесь подтверждаем, что разные алгоритмы дают сопоставимые прогоны.
  {
    const res = runScenarioComparison({ scenarios: [scenarios[0]!], algorithms, seeds: [7] })
    const totals = new Set(res.runs.map((r) => r.metrics.totalAgents))
    const passed = totals.size === 1 && res.runs.length === algorithms.length
    results.push({
      name: 'paired-seed-same-agent-count',
      passed,
      detail: passed ? `все алгоритмы: totalAgents=${[...totals][0]}` : 'разное число агентов между алгоритмами',
    })
  }

  return results
}
