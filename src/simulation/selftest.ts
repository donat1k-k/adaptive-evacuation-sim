// Sanity-проверки движка (SPEC §18). ВАЖНО: это ЭКСПОРТИРУЕМЫЕ хелперы-проверки,
// а НЕ автоматически запускаемый test suite. Тестовый фреймворк (Vitest/tsx) на
// E3 сознательно НЕ добавлен (без новых зависимостей). Эти функции — чистые,
// детерминированные; их можно вызвать вручную или подключить к раннеру позже
// (E-later). Не зависят от React.
import type {
  Agent,
  AgentId,
  Coordinate,
  CellType,
  DynamicEvent,
  EnvironmentMap,
  ExitSpec,
  Scenario,
  SimulationConfig,
  AlgorithmId,
} from '../models/index.ts'
import { SimulationEngine } from './SimulationEngine.ts'
import type { SimulationState } from './state.ts'
import { isPassable, openExitCellKeys } from './state.ts'
import { createRng } from './rng.ts'
import { resolveConflicts } from './conflict.ts'
import type { Intents } from './conflict.ts'
import { sortEvents } from './events.ts'
import type { MovementPolicy } from './policy.ts'
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

/** Минимальный агент в позиции `pos` (поля по умолчанию для unit-проверок). */
function makeAgent(id: AgentId, pos: Coordinate): Agent {
  return {
    id,
    start: pos,
    pos,
    targetExit: null,
    route: [],
    state: 'moving',
    tStart: 0,
    tEvacuated: null,
    reroutes: 0,
    stuckTicks: 0,
    algorithm: 'nearest-exit',
  }
}

/**
 * Собрать валидный `SimulationState` из карты и агентов — для unit-проверок
 * `resolveConflicts` без прогона всего движка. occupancy строится из позиций;
 * blocked/hazards/события пусты; ГПСЧ от `seed`.
 */
function makeState(map: EnvironmentMap, agents: Agent[], seed: number): SimulationState {
  const occupancy = new Map<string, AgentId>()
  for (const a of agents) occupancy.set(coordKey(a.pos), a.id)
  return {
    tick: 0,
    map,
    agents,
    occupancy,
    blockedCells: new Set<string>(),
    blockedExits: new Set(),
    hazards: [],
    pendingEvents: [],
    rng: createRng(seed),
    status: 'running',
  }
}

/** Политика, нарушающая контракт: ходит в несоседнюю клетку (для проверки guard'а). */
class BadTeleportPolicy implements MovementPolicy {
  readonly name = 'bad-teleport-test'
  decideNext(agent: Agent): Coordinate | null {
    // Прыжок на 2 клетки вправо — не 4-сосед (manhattan=2).
    return { x: agent.pos.x + 2, y: agent.pos.y }
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

  // 6. Конфликт: один победитель, проигравший остаётся (на пустой 3×1 карте).
  {
    const line = makeMap(3, 1, [], [], [])
    // A в (0,0) и B в (2,0) оба претендуют на свободную (1,0).
    const a = makeAgent('agent-a', { x: 0, y: 0 })
    const b = makeAgent('agent-b', { x: 2, y: 0 })
    const state = makeState(line, [a, b], 99)
    const intents: Intents = new Map([
      ['agent-a', { x: 1, y: 0 }],
      ['agent-b', { x: 1, y: 0 }],
    ])
    const winners = resolveConflicts(intents, state)
    const passed = winners.size === 1
    results.push({
      name: 'conflict-single-winner',
      passed,
      detail: passed ? 'ровно 1 победитель за спорную клетку' : `победителей: ${winners.size}`,
    })
  }

  // 7. Эвакуированный освобождает клетку (его клетки нет в occupancy).
  {
    const single = makeMap(5, 5, [], [exit], [{ x: 0, y: 4 }])
    const state = new SimulationEngine(makeScenario(single, 1, 1, 100), makeConfig(1, 100)).run()
    const ag = state.agents[0]
    const freed = ag !== undefined && ag.state === 'evacuated' && !state.occupancy.has(coordKey(ag.pos))
    results.push({
      name: 'evacuated-frees-cell',
      passed: freed,
      detail: freed ? 'клетка эвакуированного освобождена' : 'клетка не освобождена',
    })
  }

  // 8. Нет прохода сквозь (head-on swap): два смежных агента меняются местами.
  {
    const line = makeMap(2, 1, [], [], [])
    const a = makeAgent('agent-a', { x: 0, y: 0 })
    const b = makeAgent('agent-b', { x: 1, y: 0 })
    const state = makeState(line, [a, b], 5)
    const intents: Intents = new Map([
      ['agent-a', { x: 1, y: 0 }], // занята B на старте
      ['agent-b', { x: 0, y: 0 }], // занята A на старте
    ])
    const winners = resolveConflicts(intents, state)
    const passed = winners.size === 0
    results.push({
      name: 'no-swap-through',
      passed,
      detail: passed ? 'обмен местами запрещён (no chaining)' : `прошли сквозь: winners=${winners.size}`,
    })
  }

  // 9. После block-exit через закрытый выход никто не эвакуируется (SPEC §18.6).
  {
    const single = makeMap(5, 5, [], [exit], [{ x: 0, y: 4 }])
    const scenario: Scenario = {
      ...makeScenario(single, 1, 1, 100),
      events: [{ type: 'block-exit', exitId: 'E', tick: 0 }],
    }
    const state = new SimulationEngine(scenario, makeConfig(1, 100)).run()
    const evac = state.agents.filter((a) => a.state === 'evacuated').length
    results.push({
      name: 'block-exit-no-evacuation',
      passed: evac === 0,
      detail: evac === 0 ? 'закрытый выход никого не выпустил' : `эвакуировано через закрытый выход: ${evac}`,
    })
  }

  // 10. Adjacency guard: политика с несоседним ходом → движок бросает.
  {
    const line = makeMap(5, 1, [], [{ id: 'E', cells: [{ x: 4, y: 0 }] }], [{ x: 0, y: 0 }])
    const engine = new SimulationEngine(makeScenario(line, 1, 1, 100), makeConfig(1, 100), new BadTeleportPolicy())
    let threw = false
    try {
      engine.step()
    } catch {
      threw = true
    }
    results.push({
      name: 'adjacency-guard-throws',
      passed: threw,
      detail: threw ? 'несоседний ход отвергнут guard\'ом' : 'guard не сработал',
    })
  }

  // 11. E6: порядок событий детерминирован независимо от порядка во входном массиве.
  {
    const evs: DynamicEvent[] = [
      { type: 'block-exit', exitId: 'B', tick: 3 },
      { type: 'block-cell', cells: [{ x: 1, y: 1 }], tick: 3 },
      { type: 'hazard-appear', cells: [{ x: 2, y: 2 }], danger: 1, smoke: 0, tick: 3 },
      { type: 'block-exit', exitId: 'A', tick: 1 },
    ]
    const order1 = sortEvents(evs).map((e) => `${e.tick}:${e.type}`).join(',')
    const order2 = sortEvents([...evs].reverse()).map((e) => `${e.tick}:${e.type}`).join(',')
    const passed = order1 === order2
    results.push({
      name: 'event-ordering-deterministic',
      passed,
      detail: passed ? `стабильный порядок: ${order1}` : `разошлось: ${order1} ≠ ${order2}`,
    })
  }

  // 12. E6: block-cell делает клетку непроходимой и физически перекрывает путь.
  {
    const line = makeMap(3, 1, [], [{ id: 'E', cells: [{ x: 2, y: 0 }] }], [{ x: 0, y: 0 }])
    const scenario: Scenario = {
      ...makeScenario(line, 1, 1, 50),
      events: [{ type: 'block-cell', cells: [{ x: 1, y: 0 }], tick: 0 }],
    }
    const state = new SimulationEngine(scenario, makeConfig(1, 50)).run()
    const blocked = !isPassable(state, { x: 1, y: 0 })
    const notEvac = state.agents[0]?.state !== 'evacuated'
    const passed = blocked && notEvac
    results.push({
      name: 'block-cell-blocks-movement',
      passed,
      detail: passed ? 'клетка непроходима, путь перекрыт, агент не вышел' : `blocked=${blocked}, state=${state.agents[0]?.state}`,
    })
  }

  // 13. E6: block-exit закрывает выход — id в blockedExits, все его клетки непроходимы.
  {
    const single = makeMap(5, 5, [], [exit], [{ x: 0, y: 4 }])
    const scenario: Scenario = {
      ...makeScenario(single, 1, 1, 50),
      events: [{ type: 'block-exit', exitId: 'E', tick: 0 }],
    }
    const engine = new SimulationEngine(scenario, makeConfig(1, 50))
    engine.step() // применить событие тика 0
    const state = engine.getState()
    const cell = exit.cells[0] as Coordinate
    const closed =
      state.blockedExits.has('E') && !isPassable(state, cell) && !openExitCellKeys(state).has(coordKey(cell))
    results.push({
      name: 'block-exit-closes-exit',
      passed: closed,
      detail: closed ? 'выход закрыт: blockedExits+blockedCells+openExitCellKeys согласованы' : 'выход закрыт не полностью',
    })
  }

  // 14. E6: hazard-appear добавляет зону в state.hazards с верными danger/smoke.
  {
    const single = makeMap(5, 5, [], [exit], [{ x: 0, y: 4 }])
    const scenario: Scenario = {
      ...makeScenario(single, 1, 1, 50),
      events: [{ type: 'hazard-appear', cells: [{ x: 2, y: 2 }], danger: 3, smoke: 2, tick: 0 }],
    }
    const engine = new SimulationEngine(scenario, makeConfig(1, 50))
    engine.step()
    const state = engine.getState()
    const h = state.hazards.find((z) => z.cells.some((c) => coordKey(c) === coordKey({ x: 2, y: 2 })))
    const passed = h !== undefined && h.danger === 3 && h.smoke === 2
    results.push({
      name: 'hazard-appear-in-state',
      passed,
      detail: passed ? 'hazard добавлен (danger=3, smoke=2)' : `hazards=${state.hazards.length}`,
    })
  }

  // 15. E6: повторные/перекрывающиеся события не ломают state (Set идемпотентен).
  {
    const single = makeMap(5, 5, [], [exit], [{ x: 0, y: 4 }])
    const scenario: Scenario = {
      ...makeScenario(single, 1, 1, 50),
      events: [
        { type: 'block-cell', cells: [{ x: 2, y: 2 }], tick: 0 },
        { type: 'block-cell', cells: [{ x: 2, y: 2 }, { x: 2, y: 3 }], tick: 0 }, // перекрытие
        { type: 'block-exit', exitId: 'E', tick: 1 },
        { type: 'block-exit', exitId: 'E', tick: 2 }, // дубликат
      ],
    }
    let threw = false
    let state: SimulationState | undefined
    try {
      state = new SimulationEngine(scenario, makeConfig(1, 50)).run()
    } catch {
      threw = true
    }
    const passed =
      !threw &&
      state !== undefined &&
      state.agents.length === 1 &&
      state.blockedExits.size === 1 &&
      state.blockedCells.has(coordKey({ x: 2, y: 2 }))
    results.push({
      name: 'repeated-overlapping-events-safe',
      passed,
      detail: passed ? 'дубликаты/перекрытия идемпотентны, state цел' : `threw=${threw}`,
    })
  }

  return results
}
