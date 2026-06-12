// Стратегия движения за единым интерфейсом. Этот интерфейс — шов, в который на
// этапе E5 встанут настоящие алгоритмы (A1/A2/A4). В E3 здесь ТОЛЬКО временная
// заглушка для проверки движка. Headless, не зависит от React.
import type { Agent, Coordinate } from '../models/index.ts'
import type { SimulationState } from './state.ts'
import { isPassable } from './state.ts'
import { manhattan, neighbors4, coordEquals } from '../utils/geometry.ts'

/**
 * Интерфейс политики движения. Возвращает желаемую СЛЕДУЮЩУЮ клетку агента
 * (соседнюю, 4-связность) или null — «остаться на месте». Намерение может
 * конкурировать с другими; победитель определяется в фазе разрешения конфликтов.
 */
export interface MovementPolicy {
  readonly name: string
  decideNext(agent: Agent, state: SimulationState): Coordinate | null
}

/** Координаты клеток всех ОТКРЫТЫХ выходов (заблокированные исключены). */
function openExitCells(state: SimulationState): Coordinate[] {
  const cells: Coordinate[] = []
  for (const exit of state.map.exits) {
    if (state.blockedExits.has(exit.id)) continue
    for (const c of exit.cells) cells.push(c)
  }
  return cells
}

/** Минимальное манхэттен-расстояние от клетки до ближайшего открытого выхода. */
function distanceToNearestExit(from: Coordinate, exits: readonly Coordinate[]): number {
  let best = Infinity
  for (const e of exits) {
    const d = manhattan(from, e)
    if (d < best) best = d
  }
  return best
}

/**
 * ВРЕМЕННАЯ тестовая политика E3 (НЕ финальный алгоритм, DECISIONS D14).
 * Жадный спуск по манхэттену к ближайшему открытому выходу, БЕЗ поиска пути
 * (без BFS/A*). Правила:
 *  - если у агента задан `route`, шагнуть на её голову (если соседняя и проходимая);
 *  - иначе выбрать проходимого 4-соседа, строго уменьшающего расстояние до выхода;
 *  - tie-break — по фиксированному порядку соседей (up/down/left/right);
 *  - нет улучшающего соседа → null (агент стоит; может «застрять» в кармане).
 * Заглушка может застревать за стенами — это ожидаемо и заменяется в E5.
 */
export class StubGreedyPolicy implements MovementPolicy {
  readonly name = 'stub-greedy-e3'

  decideNext(agent: Agent, state: SimulationState): Coordinate | null {
    // 1. Готовый маршрут (если задан сценарием/будущим алгоритмом): шаг на голову.
    const head = agent.route[0]
    if (head !== undefined && manhattan(agent.pos, head) === 1 && isPassable(state, head)) {
      return head
    }

    // 2. Жадный спуск к ближайшему открытому выходу.
    const exits = openExitCells(state)
    if (exits.length === 0) return null

    const currentDist = distanceToNearestExit(agent.pos, exits)
    let bestCell: Coordinate | null = null
    let bestDist = currentDist
    for (const n of neighbors4(agent.pos)) {
      if (coordEquals(n, agent.pos)) continue
      if (!isPassable(state, n)) continue
      const d = distanceToNearestExit(n, exits)
      if (d < bestDist) {
        bestDist = d
        bestCell = n
      }
    }
    return bestCell
  }
}
