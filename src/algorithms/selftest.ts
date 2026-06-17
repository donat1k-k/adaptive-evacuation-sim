// Sanity-проверки алгоритмов маршрутизации (SPEC §18, план E5 §9). ВАЖНО: это
// ЭКСПОРТИРУЕМЫЕ хелперы, а НЕ авто-запускаемый test suite (как E3, DECISIONS D14).
// Тестовый фреймворк сознательно НЕ добавлен (без новых зависимостей). Чистые,
// детерминированные функции; не зависят от React.
import type {
  Agent,
  AgentId,
  Coordinate,
  CellType,
  EnvironmentMap,
  ExitSpec,
  Scenario,
  SimulationConfig,
  AlgorithmId,
} from '../models/index.ts'
import { SimulationEngine, createRng, isPassable } from '../simulation/index.ts'
import type { SimulationState } from '../simulation/index.ts'
import { cellTypeAt, coordKey, manhattan } from '../utils/geometry.ts'
import { aStar } from './pathfinding.ts'
import { ShortestPathAStarPolicy } from './shortestPathAStar.ts'
import { AdaptiveWeightedAStarPolicy } from './adaptiveWeightedAStar.ts'
import { createPolicy } from './createPolicy.ts'

export interface AlgorithmSelfCheckResult {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

// --- Фикстуры ----------------------------------------------------------------

function makeMap(
  width: number,
  height: number,
  walls: readonly Coordinate[],
  exits: readonly ExitSpec[],
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
  return { size: { width, height }, cells, exits, startZones: [], hazardZones: [] }
}

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

interface StateOverrides {
  readonly blockedCells?: readonly Coordinate[]
  readonly blockedExits?: readonly string[]
  readonly hazards?: readonly { cells: readonly Coordinate[]; danger: number; smoke: number }[]
}

function makeState(map: EnvironmentMap, agents: Agent[], seed: number, ov: StateOverrides = {}): SimulationState {
  const occupancy = new Map<string, AgentId>()
  for (const a of agents) occupancy.set(coordKey(a.pos), a.id)
  return {
    tick: 0,
    map,
    agents,
    occupancy,
    blockedCells: new Set((ov.blockedCells ?? []).map(coordKey)),
    blockedExits: new Set(ov.blockedExits ?? []),
    hazards: (ov.hazards ?? []).map((h) => ({ cells: h.cells, danger: h.danger, smoke: h.smoke })),
    pendingEvents: [],
    rng: createRng(seed),
    status: 'running',
  }
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

function routeKeys(agent: Agent): string {
  return agent.route.map(coordKey).join('>')
}

function snapshot(state: SimulationState): string {
  return [...state.agents]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((a) => `${a.id}:${a.pos.x},${a.pos.y}:${a.state}:${a.tEvacuated}`)
    .join('|')
}

// --- Набор проверок ----------------------------------------------------------

export function runAlgorithmSelfChecks(): AlgorithmSelfCheckResult[] {
  const results: AlgorithmSelfCheckResult[] = []

  // 1. A* на пустой карте: длина пути == манхэттен (SPEC §18.1).
  {
    const exit: ExitSpec = { id: 'E', cells: [{ x: 6, y: 0 }] }
    const map = makeMap(7, 5, [], [exit])
    const start: Coordinate = { x: 0, y: 4 }
    const res = aStar({
      start,
      goals: exit.cells,
      size: map.size,
      passable: (c) => cellTypeAt(map, c) !== undefined && cellTypeAt(map, c) !== 'wall',
      enterCost: () => 1,
      base: 1,
    })
    const expected = manhattan(start, exit.cells[0] as Coordinate)
    const passed = res !== null && res.path.length === expected
    results.push({
      name: 'astar-empty-equals-manhattan',
      passed,
      detail: passed ? `длина ${res?.path.length} == манхэттен ${expected}` : `длина ${res?.path.length}, ожидалось ${expected}`,
    })
  }

  // 2. A* не проходит сквозь стены.
  {
    // Вертикальная стена x=3 с щелью в y=0; путь обязан огибать.
    const walls: Coordinate[] = [
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
    ]
    const exit: ExitSpec = { id: 'E', cells: [{ x: 6, y: 4 }] }
    const map = makeMap(7, 5, walls, [exit])
    const agent = makeAgent('a', { x: 0, y: 4 })
    const state = makeState(map, [agent], 1)
    new ShortestPathAStarPolicy(1).decideNext(agent, state)
    const allPassable = agent.route.length > 0 && agent.route.every((c) => isPassable(state, c) && cellTypeAt(map, c) !== 'wall')
    results.push({
      name: 'astar-no-walls',
      passed: allPassable,
      detail: allPassable ? `путь длиной ${agent.route.length} огибает стену` : 'путь пуст или пересекает стену',
    })
  }

  // 3. A2 не идёт в заблокированный выход.
  {
    const left: ExitSpec = { id: 'L', cells: [{ x: 0, y: 0 }] }
    const right: ExitSpec = { id: 'R', cells: [{ x: 6, y: 0 }] }
    const map = makeMap(7, 3, [], [left, right])
    // Агент ближе к R, но R заблокирован → A2 обязан выбрать L.
    const agent = makeAgent('a', { x: 5, y: 2 })
    const blockedExitCell: Coordinate = { x: 6, y: 0 }
    const state = makeState(map, [agent], 2, { blockedExits: ['R'], blockedCells: [blockedExitCell] })
    new ShortestPathAStarPolicy(1).decideNext(agent, state)
    const usesBlocked = agent.route.some((c) => coordKey(c) === coordKey(blockedExitCell))
    const passed = agent.targetExit === 'L' && !usesBlocked && agent.route.length > 0
    results.push({
      name: 'a2-avoids-blocked-exit',
      passed,
      detail: passed ? 'выбран открытый выход L' : `targetExit=${agent.targetExit}, usesBlocked=${usesBlocked}`,
    })
  }

  // 4. A4 при большом densityWeight избегает плотного коридора (отличие от A2).
  {
    const exit: ExitSpec = { id: 'E', cells: [{ x: 4, y: 1 }] }
    const map = makeMap(5, 3, [], [exit])
    // Плотность вдоль прямого ряда y=1.
    const crowd = [
      makeAgent('c1', { x: 1, y: 1 }),
      makeAgent('c2', { x: 2, y: 1 }),
      makeAgent('c3', { x: 3, y: 1 }),
    ]
    const mover = makeAgent('m', { x: 0, y: 1 })
    const a2agent = makeAgent('m', { x: 0, y: 1 })

    const stateA2 = makeState(map, [a2agent, ...crowd.map((c) => makeAgent(c.id, c.pos))], 3)
    new ShortestPathAStarPolicy(1).decideNext(a2agent, stateA2)

    const stateA4 = makeState(map, [mover, ...crowd], 3)
    new AdaptiveWeightedAStarPolicy({
      base: 1,
      densityWeight: 50,
      dangerWeight: 0,
      smokeWeight: 0,
      densityRadius: 1,
      densityThreshold: 2,
      revisionPeriod: 5,
    }).decideNext(mover, stateA4)

    const differ = routeKeys(a2agent) !== routeKeys(mover) && mover.route.length > 0
    results.push({
      name: 'a4-avoids-density',
      passed: differ,
      detail: differ ? `A2=${routeKeys(a2agent)} ≠ A4=${routeKeys(mover)}` : `совпали: ${routeKeys(mover)}`,
    })
  }

  // 4b. A4 при большом danger/smoke weight избегает hazard-зоны (отличие от A2).
  {
    const exit: ExitSpec = { id: 'E', cells: [{ x: 4, y: 1 }] }
    const map = makeMap(5, 3, [], [exit])
    const hazardCells: Coordinate[] = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ]
    const a2agent = makeAgent('m', { x: 0, y: 1 })
    const stateA2 = makeState(map, [a2agent], 4)
    new ShortestPathAStarPolicy(1).decideNext(a2agent, stateA2)

    const a4agent = makeAgent('m', { x: 0, y: 1 })
    const stateA4 = makeState(map, [a4agent], 4, { hazards: [{ cells: hazardCells, danger: 50, smoke: 0 }] })
    new AdaptiveWeightedAStarPolicy({
      base: 1,
      densityWeight: 0,
      dangerWeight: 50,
      smokeWeight: 50,
      densityRadius: 1,
      densityThreshold: 2,
      revisionPeriod: 5,
    }).decideNext(a4agent, stateA4)

    const avoidsHazard = a4agent.route.length > 0 && !a4agent.route.some((c) => hazardCells.some((h) => coordKey(h) === coordKey(c)))
    const differ = routeKeys(a2agent) !== routeKeys(a4agent)
    const passed = avoidsHazard && differ
    results.push({
      name: 'a4-avoids-hazard',
      passed,
      detail: passed ? `A4 обходит hazard: ${routeKeys(a4agent)}` : `A2=${routeKeys(a2agent)} A4=${routeKeys(a4agent)}`,
    })
  }

  // 5. Policy всегда возвращает соседнюю клетку или null (контракт MovementPolicy).
  {
    const exit: ExitSpec = { id: 'E', cells: [{ x: 4, y: 0 }] }
    const map = makeMap(5, 4, [{ x: 2, y: 1 }, { x: 2, y: 2 }], [exit])
    let bad = ''
    for (const algo of ['nearest-exit', 'shortest-path-a-star', 'adaptive-weighted-a-star'] as const) {
      const agent = makeAgent('a', { x: 0, y: 3 })
      const others = [makeAgent('b', { x: 1, y: 3 }), makeAgent('d', { x: 3, y: 3 })]
      const state = makeState(map, [agent, ...others], 7)
      const policy = createPolicy(algo, makeConfig(algo, 7, 50))
      for (let t = 0; t < 6; t++) {
        const next = policy.decideNext(agent, state)
        if (next !== null && manhattan(agent.pos, next) !== 1) {
          bad = `${algo}: несоседний ход (${agent.pos.x},${agent.pos.y})→(${next.x},${next.y})`
          break
        }
        if (next !== null && isPassable(state, next)) {
          state.occupancy.delete(coordKey(agent.pos))
          agent.pos = next
          state.occupancy.set(coordKey(next), agent.id)
          if (agent.route[0] && coordKey(agent.route[0]) === coordKey(next)) agent.route = agent.route.slice(1)
        }
        state.tick += 1
      }
      if (bad) break
    }
    results.push({
      name: 'policy-returns-neighbor-or-null',
      passed: bad === '',
      detail: bad === '' ? 'все ходы — 4-соседи или null' : bad,
    })
  }

  // 6. Детерминизм: один seed+scenario+algorithm → идентичный результат (A2 и A4).
  {
    const exit: ExitSpec = { id: 'E', cells: [{ x: 5, y: 0 }] }
    const map = makeMap(6, 5, [{ x: 3, y: 1 }, { x: 3, y: 2 }], [exit])
    const scenario: Scenario = {
      id: 'algo-determinism',
      name: 'algo-determinism',
      description: 'fixture',
      version: '0.1.0',
      map: { ...map, startZones: [{ id: 's', cells: [{ x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }] }] },
      agentCount: 3,
      events: [],
      seed: 11,
      maxTicks: 100,
    }
    let allOk = true
    let detail = ''
    for (const algo of ['shortest-path-a-star', 'adaptive-weighted-a-star'] as const) {
      const cfg = makeConfig(algo, 11, 100)
      const s1 = new SimulationEngine(scenario, cfg, createPolicy(algo, cfg)).run()
      const s2 = new SimulationEngine(scenario, cfg, createPolicy(algo, cfg)).run()
      if (snapshot(s1) !== snapshot(s2)) {
        allOk = false
        detail = `${algo}: прогоны разошлись`
        break
      }
    }
    results.push({
      name: 'determinism-per-algorithm',
      passed: allOk,
      detail: allOk ? 'A2 и A4 детерминированы по seed' : detail,
    })
  }

  // 7. Все три алгоритма прогоняются движком без нарушения adjacency guard.
  {
    const exit: ExitSpec = { id: 'E', cells: [{ x: 5, y: 0 }] }
    const map = makeMap(6, 5, [{ x: 3, y: 1 }, { x: 3, y: 2 }], [exit])
    const scenario: Scenario = {
      id: 'algo-run',
      name: 'algo-run',
      description: 'fixture',
      version: '0.1.0',
      map: { ...map, startZones: [{ id: 's', cells: [{ x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 0, y: 3 }] }] },
      agentCount: 4,
      events: [],
      seed: 21,
      maxTicks: 100,
    }
    let ok = true
    let detail = ''
    for (const algo of ['nearest-exit', 'shortest-path-a-star', 'adaptive-weighted-a-star'] as const) {
      const cfg = makeConfig(algo, 21, 100)
      try {
        new SimulationEngine(scenario, cfg, createPolicy(algo, cfg)).run()
      } catch (e) {
        ok = false
        detail = `${algo}: ${e instanceof Error ? e.message : String(e)}`
        break
      }
    }
    results.push({
      name: 'all-algorithms-run-engine',
      passed: ok,
      detail: ok ? 'A1/A2/A4 прогнаны движком без ошибок guard' : detail,
    })
  }

  // 8. E6 fixture: два выхода; A1 выбирает ближайший (правый) → правый блокируется
  //    на тике 1 → A1 упрямо стоит (deg/blocked, не уходит на левый), A2/A4
  //    перенацеливаются на левый и эвакуируются. (SPEC §18.6.)
  {
    const left: ExitSpec = { id: 'L', cells: [{ x: 0, y: 0 }] }
    const right: ExitSpec = { id: 'R', cells: [{ x: 6, y: 0 }] }
    const map = makeMap(7, 4, [], [left, right])
    // Старт (6,3): манхэттен до R=3 < до L=9 → все алгоритмы сперва целятся в R.
    const makeScn = (): Scenario => ({
      id: 'e6-block-exit',
      name: 'e6-block-exit',
      description: 'fixture: nearest exit blocked at tick 1',
      version: '0.1.0',
      map: { ...map, startZones: [{ id: 's', cells: [{ x: 6, y: 3 }] }] },
      agentCount: 1,
      events: [{ type: 'block-exit', exitId: 'R', tick: 1 }],
      seed: 5,
      maxTicks: 100,
    })
    const runOne = (algo: AlgorithmId): Agent => {
      const cfg = makeConfig(algo, 5, 100)
      const state = new SimulationEngine(makeScn(), cfg, createPolicy(algo, cfg)).run()
      return state.agents[0] as Agent
    }

    const a1 = runOne('nearest-exit')
    const a1Passed = a1.state !== 'evacuated' && a1.tEvacuated === null && a1.targetExit === 'R'
    results.push({
      name: 'a1-stuck-after-own-exit-blocked',
      passed: a1Passed,
      detail: a1Passed
        ? `A1 упрямо держит R и застрял (state=${a1.state})`
        : `state=${a1.state}, targetExit=${a1.targetExit}, tEvac=${a1.tEvacuated}`,
    })

    const a2 = runOne('shortest-path-a-star')
    const a2Passed = a2.state === 'evacuated' && a2.targetExit === 'L' && a2.reroutes >= 1
    results.push({
      name: 'a2-reroutes-after-target-exit-blocked',
      passed: a2Passed,
      detail: a2Passed
        ? `A2 переизбрал L и вышел (reroutes=${a2.reroutes})`
        : `state=${a2.state}, targetExit=${a2.targetExit}, reroutes=${a2.reroutes}`,
    })

    const a4 = runOne('adaptive-weighted-a-star')
    const a4Passed = a4.state === 'evacuated' && a4.targetExit === 'L' && a4.reroutes >= 1
    results.push({
      name: 'a4-reroutes-after-target-exit-blocked',
      passed: a4Passed,
      detail: a4Passed
        ? `A4 переизбрал L и вышел (reroutes=${a4.reroutes})`
        : `state=${a4.state}, targetExit=${a4.targetExit}, reroutes=${a4.reroutes}`,
    })
  }

  return results
}
