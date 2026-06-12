// Идентификаторы алгоритмов маршрутизации и их настраиваемые параметры (SPEC §10–11).
// Здесь только типы и константы — сами алгоритмы реализуются на этапе E5 (src/algorithms).

/** Алгоритмы MVP (SPEC §10). */
export const MVP_ALGORITHMS = [
  'nearest-exit',
  'shortest-path-a-star',
  'adaptive-weighted-a-star',
] as const

/** Алгоритм Strong Version / Future Work — НЕ реализуется в MVP (SPEC §10, §21). */
export const STRONG_ALGORITHMS = ['load-aware-exit-distribution'] as const

export const ALL_ALGORITHMS = [...MVP_ALGORITHMS, ...STRONG_ALGORITHMS] as const

export type MvpAlgorithmId = (typeof MVP_ALGORITHMS)[number]
export type StrongAlgorithmId = (typeof STRONG_ALGORITHMS)[number]
export type AlgorithmId = (typeof ALL_ALGORITHMS)[number]

/**
 * Коэффициенты стоимости входа в клетку для Adaptive Weighted A* (SPEC §11):
 * cost = base + α·density + β·danger + γ·smoke + δ·exitLoad.
 * В MVP активны base, α (density), δ (exitLoad); β, γ — Strong Version.
 */
export interface AdaptiveWeights {
  /** base — базовая стоимость прохода обычной клетки (например, 1). */
  readonly base: number
  /** α — вес плотности (density). */
  readonly densityWeight: number
  /** β — вес опасной зоны (danger). Strong Version. */
  readonly dangerWeight: number
  /** γ — вес задымления (smoke). Strong Version. */
  readonly smokeWeight: number
  /** δ — вес перегрузки выхода (exitLoad). */
  readonly exitLoadWeight: number
}

/** Пороги и период пересчёта маршрута для адаптивного алгоритма (SPEC §11). */
export interface RerouteThresholds {
  /** θ_density — порог плотности на участке маршрута для пересчёта. */
  readonly densityThreshold: number
  /** θ_exit — порог перегрузки выбранного выхода для пересчёта. */
  readonly exitLoadThreshold: number
  /** K — период периодической ревизии маршрута (в тиках). */
  readonly revisionPeriod: number
}
