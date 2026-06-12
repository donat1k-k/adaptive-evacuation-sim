// Изменяемое состояние прогона симуляции (отдельно от пассивных моделей src/models).
// Карта (EnvironmentMap) остаётся readonly: блокировки и опасности накапливаются
// здесь, а не мутируют сценарий. Headless, не зависит от React.
import type {
  Agent,
  AgentId,
  Coordinate,
  EnvironmentMap,
  ExitId,
  DynamicEvent,
} from '../models/index.ts'
import type { Rng } from './rng.ts'
import { cellTypeAt, coordKey } from '../utils/geometry.ts'

/** Накопленная опасная зона (из события hazard-appear). В E3 без влияния на движение. */
export interface ActiveHazard {
  readonly cells: readonly Coordinate[]
  readonly danger: number
  readonly smoke: number
}

/** Статус прогона. */
export const SIMULATION_STATUSES = ['running', 'done'] as const
export type SimulationStatus = (typeof SIMULATION_STATUSES)[number]

/**
 * Полное runtime-состояние симуляции. Правит только движок (SimulationEngine).
 * `map` — неизменяемая ссылка; динамика среды живёт в blockedCells/blockedExits/hazards.
 */
export interface SimulationState {
  tick: number
  readonly map: EnvironmentMap
  readonly agents: Agent[]
  /** Кто занимает клетку: coordKey → id агента. Один агент на клетку (SPEC §8). */
  readonly occupancy: Map<string, AgentId>
  /** Заблокированные клетки (coordKey) — из событий block-cell/block-exit. */
  readonly blockedCells: Set<string>
  /** Заблокированные выходы (по id). */
  readonly blockedExits: Set<ExitId>
  /** Накопленные опасные зоны (hazard-appear); в E3 диагностические, без влияния. */
  readonly hazards: ActiveHazard[]
  /** Ещё не применённые события (упорядочены детерминированно при инициализации). */
  pendingEvents: DynamicEvent[]
  readonly rng: Rng
  status: SimulationStatus
}

/**
 * Проходима ли клетка для входа: в границах, тип floor/exit, не заблокирована.
 * Стена — всегда непроходима. Занятость клетки агентом проверяется отдельно
 * (в фазе разрешения конфликтов), т.к. зависит от контекста тика.
 */
export function isPassable(state: SimulationState, c: Coordinate): boolean {
  const type = cellTypeAt(state.map, c)
  if (type === undefined || type === 'wall') return false
  return !state.blockedCells.has(coordKey(c))
}

/** Множество клеток всех выходов (coordKey). Заблокированные выходы исключены. */
export function openExitCellKeys(state: SimulationState): Set<string> {
  const keys = new Set<string>()
  for (const exit of state.map.exits) {
    if (state.blockedExits.has(exit.id)) continue
    for (const cell of exit.cells) keys.add(coordKey(cell))
  }
  return keys
}
