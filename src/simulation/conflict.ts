// Разрешение конфликтов за клетку (SPEC §8, DECISIONS D4, D12).
// Двухфазная синхронная модель: намерения → разрешение. Один агент на клетку.
// E3 — БЕЗ движения цепочкой (allowChaining=false): клетка, занятая на начало
// тика, недоступна; агент ждёт. Победитель за свободную клетку — по seed-приоритету.
// Headless, не зависит от React.
import type { AgentId, Coordinate } from '../models/index.ts'
import type { SimulationState } from './state.ts'
import { isPassable } from './state.ts'
import { coordKey } from '../utils/geometry.ts'

/** Намерения: id агента → желаемая соседняя клетка. */
export type Intents = Map<AgentId, Coordinate>

/**
 * Разрешить конфликты и вернуть победителей: id агента → клетка, в которую он
 * перемещается. Только проходимые и НЕ занятые на начало тика клетки доступны
 * (без chaining). На спорную клетку претендентов разводит seed-приоритет;
 * проигравшие отсутствуют в результате (остаются на месте).
 *
 * Детерминизм: спорные клетки обрабатываются в отсортированном порядке ключей,
 * претенденты — в порядке id; ГПСЧ расходуется только при реальной конкуренции.
 */
export function resolveConflicts(intents: Intents, state: SimulationState): Map<AgentId, Coordinate> {
  // Сгруппировать валидные намерения по целевой клетке.
  const byTarget = new Map<string, { coord: Coordinate; contenders: AgentId[] }>()
  for (const [agentId, target] of intents) {
    const key = coordKey(target)
    if (!isPassable(state, target)) continue // стена/блокировка
    if (state.occupancy.has(key)) continue // занята на начало тика (no chaining)
    const group = byTarget.get(key)
    if (group) group.contenders.push(agentId)
    else byTarget.set(key, { coord: target, contenders: [agentId] })
  }

  const winners = new Map<AgentId, Coordinate>()
  // Детерминированный порядок обработки спорных клеток.
  const targetKeys = [...byTarget.keys()].sort()
  for (const key of targetKeys) {
    const group = byTarget.get(key)
    if (!group) continue
    const contenders = [...group.contenders].sort()
    if (contenders.length === 1) {
      winners.set(contenders[0] as AgentId, group.coord)
      continue
    }
    // Конкуренция: каждому претенденту — приоритет от ГПСЧ; выигрывает максимум.
    let winner = contenders[0] as AgentId
    let bestPriority = -1
    for (const id of contenders) {
      const priority = state.rng.nextU32()
      if (priority > bestPriority) {
        bestPriority = priority
        winner = id
      }
    }
    winners.set(winner, group.coord)
  }

  return winners
}
