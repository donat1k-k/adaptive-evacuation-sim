// Динамические события среды как ДАННЫЕ (SPEC §9). Применение/логика — в движке (E6).
import type { Coordinate, ExitId } from './grid.ts'

export const DYNAMIC_EVENT_TYPES = [
  'block-cell', // клетки становятся непроходимыми
  'block-exit', // выход закрывается
  'hazard-appear', // появление/усиление опасной зоны (Strong Version)
] as const
export type DynamicEventType = (typeof DYNAMIC_EVENT_TYPES)[number]

interface BaseEvent {
  /** Тик срабатывания события. */
  readonly tick: number
}

/** Блокировка набора клеток (коридор/проход). */
export interface BlockCellEvent extends BaseEvent {
  readonly type: 'block-cell'
  readonly cells: readonly Coordinate[]
}

/** Блокировка выхода. */
export interface BlockExitEvent extends BaseEvent {
  readonly type: 'block-exit'
  readonly exitId: ExitId
}

/** Появление/усиление опасной/задымлённой зоны (Strong Version). */
export interface HazardAppearEvent extends BaseEvent {
  readonly type: 'hazard-appear'
  readonly cells: readonly Coordinate[]
  readonly danger: number
  readonly smoke: number
}

/** Дискриминированное объединение по полю `type`. */
export type DynamicEvent = BlockCellEvent | BlockExitEvent | HazardAppearEvent
