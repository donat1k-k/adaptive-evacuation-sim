// A4 — Adaptive Weighted A* (SPEC §10–11). Главный исследуемый алгоритм.
//
// Стоимость входа в клетку (E5, уточнено автором):
//   cost(c) = base + α·density(c) + β·danger(c) + γ·smoke(c)
// где α=densityWeight, β=dangerWeight, γ=smokeWeight, base=adaptiveWeights.base.
// density — число агентов в манхэттен-окрестности радиуса densityRadius (из
// occupancy); danger/smoke — из уже накопленного state.hazards (новых событий E5
// не добавляет). δ·exitLoad и A3 — НЕ реализуются в E5 (Future/Strong). Заблокированная
// клетка = +∞ (через isPassable, исключена из поиска).
//
// Пересчёт — НЕ каждый тик: немедленно при закрытии выхода/разрыве (база), иначе
// не чаще раза в K тиков (revisionPeriod) — это и cooldown, и гистерезис против
// осцилляции. После cooldown пересчёт делается при заметной плотности у маршрута
// (> θ_density·(1+margin)) либо как редкая периодическая ревизия (каждые 2K) —
// чтобы на разреженной карте A4 не «дёргался» и сходился к A2.
//
// Сильнее A2 в плотных/динамических условиях, но НЕ магический: жадная эгоистичная
// маршрутизация на глобальной информации, склонна к осцилляции, коэффициенты —
// черновые (подбор и выводы — E12).
import type { Agent, AgentId, Coordinate } from '../models/index.ts'
import type { SimulationState } from '../simulation/index.ts'
import { isPassable } from '../simulation/index.ts'
import { coordKey } from '../utils/geometry.ts'
import { aStar } from './pathfinding.ts'
import {
  RoutingPolicyBase,
  collectOpenExits,
  buildDensityField,
  buildHazardField,
} from './routingShared.ts'
import type { RoutePlan, HazardValue } from './routingShared.ts'

/** Настройки A4 (берутся из SimulationConfig: adaptiveWeights + rerouteThresholds + densityRadius). */
export interface AdaptiveParams {
  readonly base: number
  readonly densityWeight: number
  readonly dangerWeight: number
  readonly smokeWeight: number
  readonly densityRadius: number
  /** θ_density — порог плотности у маршрута для досрочного пересчёта. */
  readonly densityThreshold: number
  /** K — минимальный интервал между пересчётами (cooldown) и период ревизии. */
  readonly revisionPeriod: number
}

/** Кэш полей плотности/опасности на один тик (поля стабильны в фазе намерений). */
interface FieldCache {
  tick: number
  density: Map<string, number>
  hazard: Map<string, HazardValue>
}

/** Сколько первых клеток маршрута считать «ближайшим участком» для триггера плотности. */
const NEAR_SEGMENT = 3
/** Запас гистерезиса над порогом плотности (чтобы не «качаться» у границы). */
const DENSITY_MARGIN = 0.25

export class AdaptiveWeightedAStarPolicy extends RoutingPolicyBase {
  readonly name = 'A4-adaptive-weighted-a-star'
  private readonly p: AdaptiveParams
  private readonly lastReroute = new Map<AgentId, number>()
  private readonly fieldCache = new WeakMap<SimulationState, FieldCache>()

  constructor(params: AdaptiveParams) {
    super()
    this.p = params
  }

  /** Поля плотности/опасности с кэшем на тик (одно построение на тик для всех агентов). */
  private fields(state: SimulationState): FieldCache {
    const cached = this.fieldCache.get(state)
    if (cached !== undefined && cached.tick === state.tick) return cached
    const fresh: FieldCache = {
      tick: state.tick,
      density: buildDensityField(state, this.p.densityRadius),
      hazard: buildHazardField(state),
    }
    this.fieldCache.set(state, fresh)
    return fresh
  }

  /** Стоимость входа в клетку: base + α·density + β·danger + γ·smoke. */
  private enterCost(c: Coordinate, f: FieldCache): number {
    const key = coordKey(c)
    const density = f.density.get(key) ?? 0
    const h = f.hazard.get(key)
    const danger = h?.danger ?? 0
    const smoke = h?.smoke ?? 0
    return this.p.base + this.p.densityWeight * density + this.p.dangerWeight * danger + this.p.smokeWeight * smoke
  }

  protected extraReplanTriggers(agent: Agent, state: SimulationState): boolean {
    // Закрытие целевого выхода — немедленный пересчёт (как A2).
    if (agent.targetExit !== null && state.blockedExits.has(agent.targetExit)) return true

    const last = this.lastReroute.get(agent.id)
    const gap = last === undefined ? Infinity : state.tick - last
    const k = Math.max(1, this.p.revisionPeriod)
    if (gap < k) return false // cooldown/гистерезис: не чаще раза в K тиков

    // После cooldown: пересчёт при заметной плотности у ближайшего участка маршрута…
    const { density } = this.fields(state)
    let maxNear = 0
    const near = agent.route.slice(0, NEAR_SEGMENT)
    for (const c of near) {
      const d = density.get(coordKey(c)) ?? 0
      if (d > maxNear) maxNear = d
    }
    if (maxNear > this.p.densityThreshold * (1 + DENSITY_MARGIN)) return true

    // …иначе редкая периодическая ревизия (каждые 2K) — поймать смену среды/hazard.
    return gap >= 2 * k
  }

  protected plan(agent: Agent, state: SimulationState): RoutePlan {
    // Зафиксировать тик пересчёта (cooldown/гистерезис в extraReplanTriggers).
    this.lastReroute.set(agent.id, state.tick)
    const f = this.fields(state)
    const open = collectOpenExits(state)
    const result = aStar({
      start: agent.pos,
      goals: open.cells,
      size: state.map.size,
      passable: (c) => isPassable(state, c),
      enterCost: (c) => this.enterCost(c, f),
      base: this.p.base,
    })
    if (result === null) return { targetExit: null, path: [] }
    const targetExit = open.exitIdByKey.get(coordKey(result.goal)) ?? null
    return { targetExit, path: [...result.path] }
  }
}
