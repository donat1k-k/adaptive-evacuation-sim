// A1 — Nearest Exit Baseline (SPEC §10). Честный, но намеренно слабый baseline.
//
// Выход выбирается ОДИН РАЗ по манхэттен-расстоянию от стартовой клетки и НИКОГДА
// не пересматривается (ни при перегрузке, ни при блокировке именно этого выхода).
// Путь к выходу — настоящий A* с учётом стен/блокировок (агент не «бьётся в стену»).
// Пересчёт — ТОЛЬКО при физическом разрыве маршрута, и всегда к ТОМУ ЖЕ выходу.
//
// Слабость (намеренная, не баг): если выбранный выход закрылся и пути к нему нет —
// A* вернёт пусто, агент стоит и деградирует в blocked/stuck. Так baseline честно
// проигрывает на динамической блокировке (SPEC §10, риск E6 «A1 застревает»).
import type { Agent } from '../models/index.ts'
import type { SimulationState } from '../simulation/index.ts'
import { isPassable } from '../simulation/index.ts'
import { aStar } from './pathfinding.ts'
import { RoutingPolicyBase, chooseExitByManhattan, openCellsOfExit } from './routingShared.ts'
import type { RoutePlan } from './routingShared.ts'

export class NearestExitPolicy extends RoutingPolicyBase {
  readonly name = 'A1-nearest-exit'
  private readonly base: number

  constructor(base = 1) {
    super()
    this.base = base
  }

  /** A1 не пересматривает выход: дополнительных триггеров сверх разрыва нет. */
  protected extraReplanTriggers(): boolean {
    return false
  }

  protected plan(agent: Agent, state: SimulationState): RoutePlan {
    // Выход выбирается один раз и сохраняется навсегда (даже если позже закроется).
    const exitId = agent.targetExit ?? chooseExitByManhattan(agent.start, state)
    if (exitId === null) return { targetExit: null, path: [] }

    // Путь — A* с равными весами (base) к клеткам ИМЕННО этого выхода.
    const goals = openCellsOfExit(state, exitId)
    const result = aStar({
      start: agent.pos,
      goals,
      size: state.map.size,
      passable: (c) => isPassable(state, c),
      enterCost: () => this.base,
      base: this.base,
    })

    // Выход сохраняем в любом случае (упрямство baseline); путь — пуст, если выход
    // недостижим (закрыт/замурован) → агент стоит.
    return { targetExit: exitId, path: result ? [...result.path] : [] }
  }
}
