// Конфигурация одного прогона симуляции (вход движка E3). Только данные.
import type { AlgorithmId, AdaptiveWeights, RerouteThresholds } from './algorithm.ts'
import type { Seed } from './reproducibility.ts'

/** Настройки разрешения конфликтов за клетку (SPEC §8). */
export interface ConflictSettings {
  /**
   * Движение цепочкой (SPEC §8 п.5): true — агент может войти в клетку,
   * освобождаемую в этом же тике; false (MVP-упрощение) — занятая клетка
   * недоступна, агент ждёт тик. Выбор фиксируется в DECISIONS.md на E3.
   */
  readonly allowChaining: boolean
}

/**
 * Полная конфигурация прогона: вместе с seed она однозначно определяет
 * детерминированную реализацию (SPEC §15). Сохраняется рядом с результатом.
 */
export interface SimulationConfig {
  readonly algorithm: AlgorithmId
  readonly seed: Seed
  readonly maxTicks: number
  /** Коэффициенты стоимости A4 (используются только адаптивным алгоритмом). */
  readonly adaptiveWeights: AdaptiveWeights
  /** Пороги/период пересчёта маршрута A4. */
  readonly rerouteThresholds: RerouteThresholds
  /** Радиус окрестности для расчёта плотности (в клетках). */
  readonly densityRadius: number
  /** Порог застревания N_stuck: тиков без продвижения до состояния stuck (SPEC §8). */
  readonly stuckThreshold: number
  readonly conflict: ConflictSettings
}
