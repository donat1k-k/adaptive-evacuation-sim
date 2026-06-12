// Ядро симуляции: синхронный пошаговый движок с разрешением конфликтов по seed
// (SPEC §7–8, §15; PLAN §3 E3). HEADLESS — не импортирует React, прогоняется
// «вхолостую» для серийных экспериментов. Метрики НЕ считает (это E7) —
// движок производит только состояние. Маршрутизация подаётся как MovementPolicy
// (в E3 — временная заглушка; настоящие алгоритмы — E5).
import type {
  Agent,
  AgentId,
  Coordinate,
  Scenario,
  SimulationConfig,
} from '../models/index.ts'
import { createRng } from './rng.ts'
import type { SimulationState } from './state.ts'
import { openExitCellKeys } from './state.ts'
import type { MovementPolicy } from './policy.ts'
import { StubGreedyPolicy } from './policy.ts'
import { resolveConflicts } from './conflict.ts'
import type { Intents } from './conflict.ts'
import { applyDueEvents, sortEvents } from './events.ts'
import { coordKey, manhattan } from '../utils/geometry.ts'

export class SimulationEngine {
  private readonly scenario: Scenario
  private readonly config: SimulationConfig
  private readonly policy: MovementPolicy
  private state: SimulationState
  private readonly agentById: Map<AgentId, Agent>

  /**
   * @param policy стратегия движения. По умолчанию — временная заглушка E3.
   * @throws если allowChaining=true (движение цепочкой не реализовано в E3, D12)
   *         или стартовых клеток меньше, чем agentCount.
   */
  constructor(scenario: Scenario, config: SimulationConfig, policy: MovementPolicy = new StubGreedyPolicy()) {
    if (config.conflict.allowChaining) {
      throw new Error(
        'SimulationEngine: allowChaining=true не реализовано в E3 (см. DECISIONS D12). ' +
          'Движение цепочкой отложено; используйте allowChaining=false.',
      )
    }
    this.scenario = scenario
    this.config = config
    this.policy = policy
    this.agentById = new Map()
    this.state = this.buildInitialState()
  }

  /** Инициализация: размещение агентов по seed и подготовка состояния. */
  private buildInitialState(): SimulationState {
    const rng = createRng(this.config.seed)

    // Собрать уникальные клетки стартовых зон в детерминированном порядке.
    const seen = new Set<string>()
    const startCells: Coordinate[] = []
    for (const zone of this.scenario.map.startZones) {
      for (const c of zone.cells) {
        const key = coordKey(c)
        if (seen.has(key)) continue
        seen.add(key)
        startCells.push(c)
      }
    }

    if (startCells.length < this.scenario.agentCount) {
      throw new Error(
        `SimulationEngine: недостаточно стартовых клеток (${startCells.length}) ` +
          `для размещения ${this.scenario.agentCount} агентов. ` +
          'Расширьте стартовые зоны или уменьшите agentCount.',
      )
    }

    // Детерминированная тасовка → первые agentCount клеток получают агентов.
    rng.shuffle(startCells)

    const agents: Agent[] = []
    const occupancy = new Map<string, AgentId>()
    for (let i = 0; i < this.scenario.agentCount; i++) {
      const cell = startCells[i] as Coordinate
      const id: AgentId = `agent-${i}`
      const agent: Agent = {
        id,
        start: cell,
        pos: cell,
        targetExit: null,
        route: [],
        state: 'waiting',
        tStart: 0,
        tEvacuated: null,
        reroutes: 0,
        stuckTicks: 0,
        algorithm: this.config.algorithm,
      }
      agents.push(agent)
      this.agentById.set(id, agent)
      occupancy.set(coordKey(cell), id)
    }

    return {
      tick: 0,
      map: this.scenario.map,
      agents,
      occupancy,
      blockedCells: new Set<string>(),
      blockedExits: new Set(),
      hazards: [],
      // События упорядочены детерминированно (по тику, затем стабильному ключу).
      pendingEvents: sortEvents(this.scenario.events),
      rng,
      status: 'running',
    }
  }

  /** Выполнить один тик. Фазы — по PLAN §3 E3. No-op, если симуляция завершена. */
  step(): void {
    const state = this.state
    if (state.status === 'done') return

    // (1) Применить наступившие динамические события.
    applyDueEvents(state)

    // (2) Собрать намерения агентов (политика движения).
    const intents: Intents = new Map()
    const noMove = new Set<AgentId>() // агенты, для которых хода нет вовсе
    for (const agent of state.agents) {
      if (agent.state === 'evacuated') continue
      const next = this.policy.decideNext(agent, state)
      if (next === null) {
        // Только null означает «остаться на месте».
        noMove.add(agent.id)
        continue
      }
      // Защита контракта MovementPolicy: ход — ровно на одного 4-соседа
      // (manhattan === 1). Это инвариант движка (4-связность, 1 клетка/тик),
      // НЕ pathfinding. Несоседняя клетка или сама клетка агента (manhattan 0,
      // «сходить в себя») — нарушение контракта; стоять надо через null.
      if (manhattan(agent.pos, next) !== 1) {
        const why = manhattan(agent.pos, next) === 0 ? 'ту же клетку (стоять — только null)' : 'несоседнюю клетку'
        throw new Error(
          `SimulationEngine: политика "${this.policy.name}" вернула ${why} для агента ${agent.id}: ` +
            `pos=(${agent.pos.x},${agent.pos.y}) → next=(${next.x},${next.y}). ` +
            'Контракт MovementPolicy: ход только на 4-соседа (manhattan=1) либо null.',
        )
      }
      intents.set(agent.id, next)
    }

    // (3) Разрешить конфликты за клетки (seed-приоритет, без chaining).
    const winners = resolveConflicts(intents, state)

    // (4) Переместить победителей; (5) проигравшие остаются на месте.
    for (const [id, target] of winners) {
      const agent = this.agentById.get(id)
      if (!agent) continue
      state.occupancy.delete(coordKey(agent.pos))
      agent.pos = target
      state.occupancy.set(coordKey(target), id)
      // Если шли по заданному маршруту и шагнули на его голову — срезать голову.
      const head = agent.route[0]
      if (head && head.x === target.x && head.y === target.y) {
        agent.route = agent.route.slice(1)
      }
    }

    // (7) Отметить эвакуированных (попавших на открытую клетку выхода).
    const exitKeys = openExitCellKeys(state)
    for (const agent of state.agents) {
      if (agent.state === 'evacuated') continue
      if (exitKeys.has(coordKey(agent.pos))) {
        // Эвакуация фиксируется как наступившая ПОСЛЕ завершения шага → tick + 1.
        agent.tEvacuated = state.tick + 1
        agent.state = 'evacuated'
        state.occupancy.delete(coordKey(agent.pos))
      }
    }

    // (6, 8) Обновить состояния и счётчики ожидания/застревания для остальных.
    for (const agent of state.agents) {
      if (agent.state === 'evacuated') continue
      if (winners.has(agent.id)) {
        agent.state = 'moving'
        agent.stuckTicks = 0
      } else if (noMove.has(agent.id)) {
        // Хода нет (нет проходимого соседа к выходу) — диагностически blocked.
        agent.state = 'blocked'
        agent.stuckTicks += 1
      } else {
        // Хотел двигаться, но проиграл конфликт — ждёт; stuck — диагностический.
        agent.stuckTicks += 1
        agent.state = agent.stuckTicks >= this.config.stuckThreshold ? 'stuck' : 'waiting'
      }
    }

    // (9) Следующий тик + проверка горизонта/полной эвакуации.
    state.tick += 1
    if (state.tick >= this.config.maxTicks || this.allEvacuated()) {
      state.status = 'done'
    }
  }

  /** Прогнать симуляцию до завершения (T_max или полной эвакуации). */
  run(): SimulationState {
    while (this.state.status === 'running') this.step()
    return this.state
  }

  private allEvacuated(): boolean {
    for (const agent of this.state.agents) {
      if (agent.state !== 'evacuated') return false
    }
    return true
  }

  isDone(): boolean {
    return this.state.status === 'done'
  }

  getState(): SimulationState {
    return this.state
  }
}
