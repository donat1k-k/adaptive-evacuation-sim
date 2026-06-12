// Общие хелперы и базовый класс политик маршрутизации E5 (SPEC §10–11).
// Сюда вынесено всё, что делят A1/A2/A4: открытые выходы, выбор выхода, поле
// плотности и опасности (для A4), конвенция маршрута и адаптер decideNext.
//
// Конвенция маршрута (согласовано с движком, SimulationEngine.ts:158): agent.route
// хранит клетки БЕЗ текущей позиции — [next, …, exitCell]; decideNext отдаёт
// route[0] (4-сосед) или null. Движок срезает голову при успешном ходе.
//
// Владение полями (DECISIONS, решение автора): политика пишет agent.route /
// targetExit / reroutes; движок владеет pos/state/tEvacuated/stuckTicks/occupancy/tick.
// HEADLESS: не импортирует React.
import type { Agent, Coordinate, ExitId } from '../models/index.ts'
import type { SimulationState, MovementPolicy } from '../simulation/index.ts'
import { isPassable } from '../simulation/index.ts'
import { coordKey, manhattan } from '../utils/geometry.ts'

/** Открытые клетки выходов + обратный индекс «клетка → id выхода». */
export interface OpenExits {
  /** Все открытые клетки выходов (цели для A*). */
  readonly cells: Coordinate[]
  /** coordKey клетки выхода → id выхода (для определения достигнутого выхода). */
  readonly exitIdByKey: Map<string, ExitId>
}

/** Собрать открытые (не заблокированные) клетки выходов из состояния. */
export function collectOpenExits(state: SimulationState): OpenExits {
  const cells: Coordinate[] = []
  const exitIdByKey = new Map<string, ExitId>()
  for (const exit of state.map.exits) {
    if (state.blockedExits.has(exit.id)) continue
    for (const c of exit.cells) {
      if (!isPassable(state, c)) continue // отдельная блокировка клетки
      cells.push(c)
      exitIdByKey.set(coordKey(c), exit.id)
    }
  }
  return { cells, exitIdByKey }
}

/** Открытые клетки конкретного выхода (для A1 — фиксированный выход). */
export function openCellsOfExit(state: SimulationState, exitId: ExitId): Coordinate[] {
  if (state.blockedExits.has(exitId)) return []
  const exit = state.map.exits.find((e) => e.id === exitId)
  if (exit === undefined) return []
  return exit.cells.filter((c) => isPassable(state, c))
}

/**
 * Выбор выхода по геометрии (A1): id выхода с минимальным манхэттен-расстоянием
 * от `from` до ближайшей его ОТКРЫТОЙ клетки. Стены при выборе игнорируются — это
 * намеренная слабость baseline (SPEC §10). null — открытых выходов нет.
 * Tie-break — по id выхода (детерминизм).
 */
export function chooseExitByManhattan(from: Coordinate, state: SimulationState): ExitId | null {
  let bestId: ExitId | null = null
  let bestDist = Infinity
  for (const exit of state.map.exits) {
    if (state.blockedExits.has(exit.id)) continue
    let d = Infinity
    for (const c of exit.cells) {
      if (!isPassable(state, c)) continue
      const dist = manhattan(from, c)
      if (dist < d) d = dist
    }
    if (d === Infinity) continue
    if (d < bestDist || (d === bestDist && bestId !== null && exit.id < bestId)) {
      bestDist = d
      bestId = exit.id
    }
  }
  return bestId
}

/** Голова маршрута пригодна: существует, соседняя (manhattan=1) и проходима. */
export function routeHeadUsable(agent: Agent, state: SimulationState): boolean {
  const head = agent.route[0]
  return head !== undefined && manhattan(agent.pos, head) === 1 && isPassable(state, head)
}

// --- Поля плотности и опасности (для A4) -------------------------------------

/** Значения danger/smoke в клетке. */
export interface HazardValue {
  readonly danger: number
  readonly smoke: number
}

/**
 * Поле плотности: coordKey → число агентов в манхэттен-окрестности радиуса `radius`.
 * Считается из occupancy (не-эвакуированные агенты). Каждый агент добавляет +1 во
 * все клетки своей окрестности. Радиус 0 → плотность = занятость самой клетки.
 */
export function buildDensityField(state: SimulationState, radius: number): Map<string, number> {
  const field = new Map<string, number>()
  for (const agent of state.agents) {
    if (agent.state === 'evacuated') continue
    const { x, y } = agent.pos
    for (let dy = -radius; dy <= radius; dy++) {
      const rem = radius - Math.abs(dy)
      for (let dx = -rem; dx <= rem; dx++) {
        const key = `${x + dx},${y + dy}`
        field.set(key, (field.get(key) ?? 0) + 1)
      }
    }
  }
  return field
}

/**
 * Поле опасности: coordKey → {danger, smoke}, суммированные по пересекающимся
 * зонам state.hazards (накопленным из событий hazard-appear; новых событий E5 не
 * добавляет — только чтение). Пусто, если зон нет (demoE4, S1–S3).
 */
export function buildHazardField(state: SimulationState): Map<string, HazardValue> {
  const field = new Map<string, HazardValue>()
  for (const h of state.hazards) {
    for (const c of h.cells) {
      const key = coordKey(c)
      const prev = field.get(key)
      if (prev === undefined) field.set(key, { danger: h.danger, smoke: h.smoke })
      else field.set(key, { danger: prev.danger + h.danger, smoke: prev.smoke + h.smoke })
    }
  }
  return field
}

// --- Базовый класс политики --------------------------------------------------

/** План маршрута: выбранный выход и путь (без текущей клетки). Пустой path → нет хода. */
export interface RoutePlan {
  readonly targetExit: ExitId | null
  readonly path: Coordinate[]
}

/**
 * Базовый класс политик маршрутизации. Инкапсулирует адаптер decideNext →
 * route[0]|null, управление полями агента и условие пересчёта. Подклассы задают:
 *  - plan(): как построить маршрут (выбор выхода + A*);
 *  - extraReplanTriggers(): доп. условия пересчёта сверх структурного разрыва.
 *
 * Структурный разрыв (route пуст / голова непригодна) всегда вызывает пересчёт.
 * Каждый пересчёт после первого (агент уже имел выход/маршрут) и давший непустой
 * путь увеличивает agent.reroutes (метрика осцилляции, SPEC §11).
 */
export abstract class RoutingPolicyBase implements MovementPolicy {
  abstract readonly name: string

  protected abstract plan(agent: Agent, state: SimulationState): RoutePlan
  protected abstract extraReplanTriggers(agent: Agent, state: SimulationState): boolean

  private needsReplan(agent: Agent, state: SimulationState): boolean {
    if (agent.route.length === 0) return true
    if (!routeHeadUsable(agent, state)) return true
    return this.extraReplanTriggers(agent, state)
  }

  decideNext(agent: Agent, state: SimulationState): Coordinate | null {
    if (agent.state === 'evacuated') return null

    if (this.needsReplan(agent, state)) {
      const hadRoute = agent.targetExit !== null || agent.route.length > 0
      const planned = this.plan(agent, state)
      agent.targetExit = planned.targetExit
      agent.route = planned.path
      if (planned.path.length > 0 && hadRoute) agent.reroutes += 1
    }

    const head = agent.route[0]
    if (head === undefined) return null
    // Финальная страховка: голова обязана быть соседней и проходимой (контракт
    // MovementPolicy + adjacency guard движка). Иначе — стоим (стоять только null).
    if (manhattan(agent.pos, head) !== 1 || !isPassable(state, head)) {
      agent.route = []
      return null
    }
    return head
  }
}

/** Узнать id выхода, которому принадлежит клетка плана (для записи targetExit). */
export function exitOwnerOfPath(path: Coordinate[], open: OpenExits): ExitId | null {
  const last = path[path.length - 1]
  if (last === undefined) return null
  return open.exitIdByKey.get(coordKey(last)) ?? null
}
