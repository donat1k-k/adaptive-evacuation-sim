// Модель агента — пассивные данные (SPEC §6). Поведение (движение) — в движке E3.
import type { Coordinate, ExitId } from './grid.ts'
import type { AlgorithmId } from './algorithm.ts'

export type AgentId = string

/** Маршрут — последовательность клеток от текущей позиции к выходу. */
export type Route = readonly Coordinate[]

/** Состояния агента (SPEC §6). */
export const AGENT_STATES = [
  'waiting', // ожидает начала движения
  'moving', // движется
  'evacuated', // вышел
  'blocked', // нет доступного маршрута
  'stuck', // длительно не может продвинуться
] as const
export type AgentState = (typeof AGENT_STATES)[number]

/** Агент в момент симуляции. Изменяемые поля помечены — их правит только движок (E3). */
export interface Agent {
  readonly id: AgentId
  /** Стартовая позиция (фиксирована seed'ом). */
  readonly start: Coordinate
  /** Текущая позиция. */
  pos: Coordinate
  /** Выбранный выход; null — ещё не выбран. */
  targetExit: ExitId | null
  /** Текущий маршрут. */
  route: Route
  state: AgentState
  /** Тик начала движения. */
  readonly tStart: number
  /** Тик эвакуации; null — пока не эвакуирован. */
  tEvacuated: number | null
  /** Счётчик пересчётов маршрута (метрика и индикатор осцилляции). */
  reroutes: number
  /** Счётчик подряд тиков без продвижения (для порога застревания N_stuck). */
  stuckTicks: number
  /** Алгоритм, по которому движется агент. */
  readonly algorithm: AlgorithmId
}
