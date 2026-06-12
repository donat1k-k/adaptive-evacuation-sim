// Sanity-проверки движка (SPEC §18). ВАЖНО: это ЭКСПОРТИРУЕМЫЕ хелперы-проверки,
// а НЕ автоматически запускаемый test suite. Тестовый фреймворк (Vitest/tsx) на
// E3 сознательно НЕ добавлен (без новых зависимостей). Эти функции — чистые,
// детерминированные; их можно вызвать вручную или подключить к раннеру позже
// (E-later). Не зависят от React.
import type {
  Coordinate,
  CellType,
  EnvironmentMap,
  ExitSpec,
  Scenario,
  SimulationConfig,
  AlgorithmId,
} from '../models/index.ts'
import { SimulationEngine } from './SimulationEngine.ts'
import type { SimulationState } from './state.ts'
import { cellTypeAt, coordKey } from '../utils/geometry.ts'

export interface SelfCheckResult {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

// --- Фикстуры (минимальные карты как данные) ---------------------------------

/** Построить прямоугольную карту: пол всюду, заданные стены и клетки-выходы. */
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
  return {
    size: { width, height },
    cells,
    exits,
    startZones: [{ id: 'start', cells: [...startCells] }],
    hazardZones: [],
  }
}

/** Конфиг с разумными значениями по умолчанию (allowChaining=false для E3). */
function makeConfig(seed: number, maxTicks: number, algorithm: AlgorithmId = 'nearest-exit'): SimulationConfig {
  return {
    algorithm,
    seed,
    maxTicks,
    adaptiveWeights: { base: 1, densityWeight: 0, dangerWeight: 0, smokeWeight: 0, exitLoadWeight: 0 },
    rerouteThresholds: { densityThreshold: 0, exitLoadThreshold: 0, revisionPeriod: 1 },
    densityRadius: 1,
    stuckThreshold: 5,
    conflict: { allowChaining: false },
  }
}

function makeScenario(map: EnvironmentMap, agentCount: number, seed: number, maxTicks: number): Scenario {
  return {
    id: 'selftest',
    name: 'selftest',
    description: 'fixture for sanity checks',
    version: '0.1.0',
    map,
    agentCount,
    events: [],
    seed,
    maxTicks,
  }
}

// --- Снимок для сравнения детерминизма ----------------------------------------

function snapshot(state: SimulationState): string {
  const rows = [...state.agents]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((a) => `${a.id}:${a.pos.x},${a.pos.y}:${a.state}:${a.tEvacuated}:${a.stuckTicks}`)
  return rows.join('|')
}

// --- Инвариантные проверки на каждом тике -------------------------------------

/** Прогнать движок, проверяя на каждом тике эксклюзивность клетки и стены. */
function runWithInvariants(engine: SimulationEngine): { ok: boolean; detail: string } {
  let guard = 0
  while (!engine.isDone() && guard < 100000) {
    engine.step()
    guard++
    const state = engine.getState()
    const seen = new Set<string>()
    for (const agent of state.agents) {
      if (agent.state === 'evacuated') continue
      const key = coordKey(agent.pos)
      // Эксклюзивность клетки.
      if (seen.has(key)) {
        return { ok: false, detail: `две клетки заняты на тике ${state.tick}: ${key}` }
      }
      seen.add(key)
      // Непроходимость стен.
      if (cellTypeAt(state.map, agent.pos) === 'wall') {
        return { ok: false, detail: `агент ${agent.id} в стене на тике ${state.tick}` }
      }
    }
  }
  return { ok: true, detail: `завершено за ${engine.getState().tick} тиков` }
}

// --- Набор проверок -----------------------------------------------------------

/**
 * Запустить sanity-проверки движка (SPEC §18: детерминизм, сохранение агентов,
 * эксклюзивность клетки, непроходимость стен, достижение выхода одиночкой).
 * Возвращает список результатов. НЕ бросает на провале — провал в `passed=false`.
 */
export function runSimulationSelfChecks(): SelfCheckResult[] {
  const results: SelfCheckResult[] = []

  // Карта 5×5, выход в углу (4,0), стартовая зона — несколько клеток.
  const exit: ExitSpec = { id: 'E', cells: [{ x: 4, y: 0 }] }
  const startCells: Coordinate[] = [
    { x: 0, y: 4 },
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 0, y: 3 },
    { x: 1, y: 3 },
  ]
  const map = makeMap(5, 5, [], [exit], startCells)

  // 1. Детерминизм по seed.
  {
    const s1 = new SimulationEngine(makeScenario(map, 3, 42, 100), makeConfig(42, 100)).run()
    const s2 = new SimulationEngine(makeScenario(map, 3, 42, 100), makeConfig(42, 100)).run()
    const passed = snapshot(s1) === snapshot(s2)
    results.push({
      name: 'determinism',
      passed,
      detail: passed ? 'два прогона идентичны' : 'прогоны разошлись',
    })
  }

  // 2. Сохранение агентов: число постоянно, id уникальны.
  {
    const state = new SimulationEngine(makeScenario(map, 4, 7, 100), makeConfig(7, 100)).run()
    const ids = new Set(state.agents.map((a) => a.id))
    const passed = state.agents.length === 4 && ids.size === 4
    results.push({
      name: 'agent-conservation',
      passed,
      detail: passed ? '4 уникальных агента сохранены' : `нарушено: ${state.agents.length} агентов, ${ids.size} id`,
    })
  }

  // 3+4. Эксклюзивность клетки и непроходимость стен (на каждом тике).
  {
    const walls: Coordinate[] = [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
    ]
    const wmap = makeMap(5, 5, walls, [exit], startCells)
    const inv = runWithInvariants(new SimulationEngine(makeScenario(wmap, 5, 13, 200), makeConfig(13, 200)))
    results.push({ name: 'cell-exclusivity-and-walls', passed: inv.ok, detail: inv.detail })
  }

  // 5. Одиночный агент на пустой карте достигает выхода.
  {
    const single = makeMap(5, 5, [], [exit], [{ x: 0, y: 4 }])
    const state = new SimulationEngine(makeScenario(single, 1, 1, 100), makeConfig(1, 100)).run()
    const agent = state.agents[0]
    const passed = agent !== undefined && agent.state === 'evacuated' && agent.tEvacuated !== null
    results.push({
      name: 'single-agent-reaches-exit',
      passed,
      detail: passed ? `эвакуирован на тике ${agent?.tEvacuated}` : 'не эвакуирован',
    })
  }

  return results
}
