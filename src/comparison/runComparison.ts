// Headless comparison runner (этап E9): прогон scenario × algorithm × seed(s).
// HEADLESS — не зависит от React и от UI. Детерминирован (один {scenario, config,
// seed} → бит-идентичный прогон). Каждый прогон получает СВЕЖИЕ engine/state/policy;
// сценарий — неизменяемые данные и движком не мутируется (он строит своё состояние).
// Парное сравнение (SPEC §15): при фиксированном seed стартовые позиции зависят
// только от seed+сценарий, поэтому все алгоритмы стартуют из идентичных позиций.
import type { AlgorithmId, Scenario, Seed, SimulationConfig } from '../models/index.ts'
import { MODEL_VERSION } from '../models/index.ts'
import { SimulationEngine } from '../simulation/index.ts'
import { createPolicy } from '../algorithms/index.ts'
import { computeMetrics } from '../metrics/index.ts'
import { createScenarioConfig } from '../scenarios/index.ts'
import { aggregateRuns } from './aggregate.ts'
import type { ComparisonResult, RunResult } from './types.ts'

/** Как построить конфиг для прогона. По умолчанию — createScenarioConfig. */
export type ConfigFactory = (scenario: Scenario, algorithm: AlgorithmId, seed: Seed) => SimulationConfig

export interface ComparisonOptions {
  readonly scenarios: readonly Scenario[]
  readonly algorithms: readonly AlgorithmId[]
  readonly seeds: readonly Seed[]
  /** Опциональная фабрика конфига (по умолчанию createScenarioConfig). */
  readonly makeConfig?: ConfigFactory
}

/** Прогнать один run: scenario × algorithm × seed. Свежие engine/state/policy. */
function runOne(scenario: Scenario, algorithm: AlgorithmId, seed: Seed, makeConfig: ConfigFactory): RunResult {
  const config = makeConfig(scenario, algorithm, seed)
  const policy = createPolicy(algorithm, config)
  const engine = new SimulationEngine(scenario, config, policy)
  const state = engine.run()
  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    scenarioVersion: scenario.version,
    algorithm,
    seed,
    config,
    metrics: computeMetrics(state),
  }
}

/**
 * Прогнать полную решётку scenario × algorithm × seed и агрегировать.
 * Порядок прогонов — сценарий → алгоритм → seed (детерминирован).
 */
export function runScenarioComparison(options: ComparisonOptions): ComparisonResult {
  const makeConfig = options.makeConfig ?? createScenarioConfig
  const runs: RunResult[] = []
  for (const scenario of options.scenarios) {
    for (const algorithm of options.algorithms) {
      for (const seed of options.seeds) {
        runs.push(runOne(scenario, algorithm, seed, makeConfig))
      }
    }
  }
  return {
    metadata: {
      modelVersion: MODEL_VERSION,
      generatedAt: new Date().toISOString(),
      scenarioIds: options.scenarios.map((s) => s.id),
      algorithms: [...options.algorithms],
      seeds: [...options.seeds],
    },
    runs,
    aggregates: aggregateRuns(runs),
  }
}

/** Удобный диапазон seed'ов 1..n (для серий). */
export function seedRange(n: number): number[] {
  const seeds: number[] = []
  for (let i = 1; i <= n; i++) seeds.push(i)
  return seeds
}
