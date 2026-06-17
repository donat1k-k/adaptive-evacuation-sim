// Sanity-проверки метрик (SPEC §13–14). ЭКСПОРТИРУЕМЫЕ хелперы, НЕ авто-suite
// (как E3/E5/E6, без тестового фреймворка и новых зависимостей). Чистые,
// детерминированные; не зависят от React.
import type {
  CellType,
  Coordinate,
  EnvironmentMap,
  ExitSpec,
  Scenario,
  SimulationConfig,
  AlgorithmId,
} from '../models/index.ts'
import { SimulationEngine } from '../simulation/index.ts'
import { createPolicy } from '../algorithms/index.ts'
import { coordKey } from '../utils/geometry.ts'
import { computeMetrics } from './computeMetrics.ts'

export interface MetricsSelfCheckResult {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

function makeMap(
  width: number,
  height: number,
  walls: readonly Coordinate[],
  exits: readonly ExitSpec[],
  startCells: readonly Coordinate[],
): EnvironmentMap {
  const wallKeys = new Set(walls.map(coordKey))
  const exitKeys = new Set(exits.flatMap((e) => e.cells.map(coordKey)))
  const cells: CellType[][] = []
  for (let y = 0; y < height; y++) {
    const row: CellType[] = []
    for (let x = 0; x < width; x++) {
      const key = coordKey({ x, y })
      row.push(exitKeys.has(key) ? 'exit' : wallKeys.has(key) ? 'wall' : 'floor')
    }
    cells.push(row)
  }
  return { size: { width, height }, cells, exits, startZones: [{ id: 's', cells: [...startCells] }], hazardZones: [] }
}

function makeConfig(algorithm: AlgorithmId, seed: number, maxTicks: number): SimulationConfig {
  return {
    algorithm,
    seed,
    maxTicks,
    adaptiveWeights: { base: 1, densityWeight: 0.8, dangerWeight: 6, smokeWeight: 3, exitLoadWeight: 0 },
    rerouteThresholds: { densityThreshold: 2, exitLoadThreshold: 0, revisionPeriod: 5 },
    densityRadius: 1,
    stuckThreshold: 5,
    conflict: { allowChaining: false },
  }
}

function scenario(
  id: string,
  map: EnvironmentMap,
  agentCount: number,
  events: Scenario['events'],
  seed: number,
  maxTicks: number,
): Scenario {
  return { id, name: id, description: 'metrics fixture', version: '0.1.0', map, agentCount, events, seed, maxTicks }
}

function runMetrics(algo: AlgorithmId, scn: Scenario, maxTicks: number) {
  const cfg = makeConfig(algo, scn.seed, maxTicks)
  const state = new SimulationEngine(scn, cfg, createPolicy(algo, cfg)).run()
  return { metrics: computeMetrics(state), state }
}

/** Карта 7×4, два выхода L/R; старт у R; block-exit R на тике 1 (E6 fixture). */
function e6BlockExitScenario(): Scenario {
  const left: ExitSpec = { id: 'L', cells: [{ x: 0, y: 0 }] }
  const right: ExitSpec = { id: 'R', cells: [{ x: 6, y: 0 }] }
  const map = makeMap(7, 4, [], [left, right], [{ x: 6, y: 3 }])
  return scenario('m-e6', map, 1, [{ type: 'block-exit', exitId: 'R', tick: 1 }], 5, 100)
}

export function runMetricsSelfChecks(): MetricsSelfCheckResult[] {
  const results: MetricsSelfCheckResult[] = []
  const exit: ExitSpec = { id: 'E', cells: [{ x: 4, y: 0 }] }

  // 1. Все эвакуированы → evacuatedCount=total, доля=1, время не null.
  {
    const map = makeMap(5, 5, [], [exit], [{ x: 0, y: 4 }, { x: 1, y: 4 }])
    const { metrics: m } = runMetrics('shortest-path-a-star', scenario('all', map, 2, [], 3, 100), 100)
    const passed =
      m.totalAgents === 2 &&
      m.evacuatedCount === 2 &&
      m.evacuatedFraction === 1 &&
      m.strandedCount === 0 &&
      m.meanEvacuationTime !== null &&
      m.makespan !== null
    results.push({
      name: 'all-evacuated',
      passed,
      detail: passed ? `2/2, доля=1, makespan=${m.makespan}` : `evac=${m.evacuatedCount}, доля=${m.evacuatedFraction}`,
    })
  }

  // 2. Никто не эвакуирован (выход закрыт на тике 0) → 0, время null, без NaN.
  {
    const map = makeMap(5, 5, [], [exit], [{ x: 0, y: 4 }])
    const { metrics: m } = runMetrics('shortest-path-a-star', scenario('none', map, 1, [{ type: 'block-exit', exitId: 'E', tick: 0 }], 3, 50), 50)
    const passed =
      m.evacuatedCount === 0 &&
      m.evacuatedFraction === 0 &&
      m.makespan === null &&
      m.meanEvacuationTime === null &&
      m.minEvacuationTime === null &&
      m.maxEvacuationTime === null &&
      m.strandedCount === 1
    results.push({
      name: 'none-evacuated-time-null',
      passed,
      detail: passed ? 'evac=0, время=null, stranded=1' : `evac=${m.evacuatedCount}, mean=${m.meanEvacuationTime}`,
    })
  }

  // 3. Частичная эвакуация: один агент заперт стенами (карман), другой выходит.
  {
    const walls: Coordinate[] = [{ x: 0, y: 3 }, { x: 1, y: 4 }] // запирают угол (0,4)
    const map = makeMap(5, 5, walls, [exit], [{ x: 0, y: 4 }, { x: 4, y: 4 }])
    const { metrics: m } = runMetrics('nearest-exit', scenario('part', map, 2, [], 9, 100), 100)
    const passed = m.totalAgents === 2 && m.evacuatedCount === 1 && m.strandedCount === 1
    results.push({
      name: 'partial-evacuation-stranded',
      passed,
      detail: passed ? '1 вышел, 1 заперт (stranded=1)' : `evac=${m.evacuatedCount}, stranded=${m.strandedCount}`,
    })
  }

  // 4. evacuationCurve монотонно неубывающая; финал = evacuatedCount.
  {
    const map = makeMap(5, 5, [], [exit], [{ x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }])
    const { metrics: m } = runMetrics('shortest-path-a-star', scenario('curve', map, 3, [], 4, 100), 100)
    let monotone = true
    for (let i = 1; i < m.evacuationCurve.length; i++) {
      const prev = m.evacuationCurve[i - 1]
      const cur = m.evacuationCurve[i]
      if (prev !== undefined && cur !== undefined && cur.evacuatedCount < prev.evacuatedCount) monotone = false
    }
    const last = m.evacuationCurve[m.evacuationCurve.length - 1]
    const passed = monotone && last !== undefined && last.evacuatedCount === m.evacuatedCount && m.evacuationCurve[0]?.evacuatedCount === 0
    results.push({
      name: 'evacuation-curve-monotone',
      passed,
      detail: passed ? `монотонна, финал=${m.evacuatedCount}` : `monotone=${monotone}`,
    })
  }

  // 5. Сумма exitLoads == evacuatedCount.
  {
    const left: ExitSpec = { id: 'L', cells: [{ x: 0, y: 0 }] }
    const right: ExitSpec = { id: 'R', cells: [{ x: 4, y: 0 }] }
    const map = makeMap(5, 5, [], [left, right], [{ x: 0, y: 4 }, { x: 4, y: 4 }, { x: 2, y: 4 }])
    const { metrics: m } = runMetrics('shortest-path-a-star', scenario('loads', map, 3, [], 6, 100), 100)
    const sum = m.exitLoads.reduce((acc, e) => acc + e.evacuatedCount, 0)
    const passed = sum === m.evacuatedCount && m.evacuatedCount > 0
    results.push({
      name: 'exit-loads-sum-equals-evacuated',
      passed,
      detail: passed ? `ΣexitLoads=${sum}=evac` : `Σ=${sum}, evac=${m.evacuatedCount}`,
    })
  }

  // 6. totalReroutes == сумма reroutes агентов (A2 на E6 fixture → ≥1).
  {
    const { metrics: m, state } = runMetrics('shortest-path-a-star', e6BlockExitScenario(), 100)
    const manual = state.agents.reduce((acc, a) => acc + a.reroutes, 0)
    const passed = m.totalReroutes === manual && m.totalReroutes >= 1
    results.push({
      name: 'total-reroutes-matches-agents',
      passed,
      detail: passed ? `totalReroutes=${m.totalReroutes}=Σagents` : `metric=${m.totalReroutes}, manual=${manual}`,
    })
  }

  // 7. Sanity поведения (НЕ исследовательский вывод): на E6 fixture A1 имеет
  //    меньший evacuationRate, чем A2 и A4 (A1 упрямо застревает на закрытом выходе).
  {
    const a1 = runMetrics('nearest-exit', e6BlockExitScenario(), 100).metrics
    const a2 = runMetrics('shortest-path-a-star', e6BlockExitScenario(), 100).metrics
    const a4 = runMetrics('adaptive-weighted-a-star', e6BlockExitScenario(), 100).metrics
    const passed = a1.evacuatedFraction < a2.evacuatedFraction && a1.evacuatedFraction < a4.evacuatedFraction
    results.push({
      name: 'a1-rate-lower-than-a2-a4-on-block',
      passed,
      detail: `A1=${a1.evacuatedFraction} A2=${a2.evacuatedFraction} A4=${a4.evacuatedFraction}`,
    })
  }

  // 8. 0 агентов → без падения/NaN: доля=0, время=null, кривая существует.
  {
    const map = makeMap(3, 3, [], [exit], [])
    const { metrics: m } = runMetrics('nearest-exit', scenario('zero', map, 0, [], 1, 20), 20)
    const passed =
      m.totalAgents === 0 &&
      m.evacuatedCount === 0 &&
      m.evacuatedFraction === 0 &&
      m.meanEvacuationTime === null &&
      m.meanReroutes === 0 &&
      m.evacuationCurve.length > 0
    results.push({
      name: 'zero-agents-no-nan',
      passed,
      detail: passed ? 'доля=0, время=null, без NaN' : `agents=${m.totalAgents}, доля=${m.evacuatedFraction}`,
    })
  }

  return results
}
