// A2 — Shortest Path A* (SPEC §10). Оптимум по графу без учёта загрузки.
//
// Выход выбирается по ДОСТИЖИМОСТИ ПО ГРАФУ (с учётом стен), а не по геометрии:
// многоцелевой A* по всем открытым выходам — достигнутый выход и есть ближайший
// по числу шагов. При пересчёте выход переизбирается заново — этим A2 отличается
// от упрямого A1. Пересчёт — при разрыве маршрута ИЛИ закрытии целевого выхода.
//
// Слабость (намеренная): не учитывает плотность → все идут одним оптимальным
// коридором → пробка (виден на S2, E8).
import type { Agent } from '../models/index.ts'
import type { SimulationState } from '../simulation/index.ts'
import { isPassable } from '../simulation/index.ts'
import { coordKey } from '../utils/geometry.ts'
import { aStar } from './pathfinding.ts'
import { RoutingPolicyBase, collectOpenExits } from './routingShared.ts'
import type { RoutePlan } from './routingShared.ts'

export class ShortestPathAStarPolicy extends RoutingPolicyBase {
  readonly name = 'A2-shortest-path-a-star'
  private readonly base: number

  constructor(base = 1) {
    super()
    this.base = base
  }

  /** Переизбрать выход, если выбранный закрылся (block-exit). Разрыв ловит база. */
  protected extraReplanTriggers(agent: Agent, state: SimulationState): boolean {
    return agent.targetExit !== null && state.blockedExits.has(agent.targetExit)
  }

  protected plan(agent: Agent, state: SimulationState): RoutePlan {
    const open = collectOpenExits(state)
    const result = aStar({
      start: agent.pos,
      goals: open.cells,
      size: state.map.size,
      passable: (c) => isPassable(state, c),
      enterCost: () => this.base,
      base: this.base,
    })
    if (result === null) return { targetExit: null, path: [] }
    const targetExit = open.exitIdByKey.get(coordKey(result.goal)) ?? null
    return { targetExit, path: [...result.path] }
  }
}
