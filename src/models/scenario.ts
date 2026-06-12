// Сценарий — самодостаточные данные эксперимента (SPEC §16–17). Без редактора, как JSON/код.
import type { EnvironmentMap } from './grid.ts'
import type { DynamicEvent } from './event.ts'
import type { Seed } from './reproducibility.ts'

export type ScenarioId = string

/**
 * Сценарий. Стартовые зоны и выходы хранятся внутри `map`
 * (map.startZones / map.exits), чтобы не дублировать и не рассинхронизировать.
 */
export interface Scenario {
  readonly id: ScenarioId
  readonly name: string
  readonly description: string
  /** Версия сценария — для воспроизводимости (SPEC §15). */
  readonly version: string
  readonly map: EnvironmentMap
  /** Число агентов, размещаемых по стартовым зонам. */
  readonly agentCount: number
  /** Динамические события (могут быть пустыми — статический сценарий). */
  readonly events: readonly DynamicEvent[]
  /** Seed по умолчанию; в сериях переопределяется набором seed'ов. */
  readonly seed: Seed
  /** Горизонт симуляции T_max (SPEC §7). */
  readonly maxTicks: number
}
