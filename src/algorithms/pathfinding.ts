// Общая основа поиска пути для алгоритмов маршрутизации E5 (SPEC §10–11).
// Многоцелевой A* с параметризуемой стоимостью входа в клетку: один код-путь для
// A2 (равные веса) и A4 (взвешенная стоимость) — без дублирования и без отдельного
// BFS (A* с cost=base ≡ BFS по числу шагов). HEADLESS: не зависит от React.
//
// Детерминизм (SPEC §15): порядок соседей фиксирован (neighbors4), tie-break в
// куче строго упорядочен (f → g → coordKey → порядковый номер вставки). Один и тот
// же вход → бит-идентичный путь.
import type { Coordinate, GridSize } from '../models/index.ts'
import { coordKey, inBounds, manhattan, neighbors4 } from '../utils/geometry.ts'

/** Параметры одного запуска A*. */
export interface AStarParams {
  /** Стартовая клетка (текущая позиция агента). */
  readonly start: Coordinate
  /** Целевые клетки (открытые клетки выходов). Пусто → пути нет. */
  readonly goals: readonly Coordinate[]
  readonly size: GridSize
  /** Проходима ли клетка для входа (границы/стена/блокировка). */
  readonly passable: (c: Coordinate) => boolean
  /** Стоимость ВХОДА в клетку (> 0). Для A2 — base; для A4 — base+α·density+…. */
  readonly enterCost: (c: Coordinate) => number
  /** Масштаб эвристики = base (минимальная стоимость ребра). Должен быть ≤ min enterCost. */
  readonly base: number
}

/** Результат A*: путь без стартовой клетки (последняя — достигнутый выход). */
export interface AStarPath {
  /** Клетки от первого шага до клетки выхода (НЕ включая start). */
  readonly path: readonly Coordinate[]
  /** Достигнутая клетка выхода. */
  readonly goal: Coordinate
  /** Суммарная стоимость пути. */
  readonly totalCost: number
}

interface HeapNode {
  readonly key: string
  readonly coord: Coordinate
  readonly g: number
  readonly f: number
  readonly seq: number
}

/**
 * Детерминированное сравнение узлов кучи: меньший f, при равенстве — меньший g
 * (ближе к цели по факту), затем стабильно по coordKey, затем по порядку вставки.
 * Возвращает true, если `a` приоритетнее `b` (должен всплыть выше).
 */
function less(a: HeapNode, b: HeapNode): boolean {
  if (a.f !== b.f) return a.f < b.f
  if (a.g !== b.g) return a.g < b.g
  if (a.key !== b.key) return a.key < b.key
  return a.seq < b.seq
}

/** Бинарная min-куча для A* (без внешних зависимостей). */
class MinHeap {
  private readonly items: HeapNode[] = []

  get size(): number {
    return this.items.length
  }

  push(node: HeapNode): void {
    const items = this.items
    items.push(node)
    let i = items.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (less(items[i] as HeapNode, items[parent] as HeapNode)) {
        const tmp = items[i] as HeapNode
        items[i] = items[parent] as HeapNode
        items[parent] = tmp
        i = parent
      } else break
    }
  }

  pop(): HeapNode | undefined {
    const items = this.items
    const n = items.length
    if (n === 0) return undefined
    const top = items[0] as HeapNode
    const last = items.pop() as HeapNode
    if (n > 1) {
      items[0] = last
      let i = 0
      for (;;) {
        const left = 2 * i + 1
        const right = 2 * i + 2
        let smallest = i
        if (left < items.length && less(items[left] as HeapNode, items[smallest] as HeapNode)) smallest = left
        if (right < items.length && less(items[right] as HeapNode, items[smallest] as HeapNode)) smallest = right
        if (smallest === i) break
        const tmp = items[i] as HeapNode
        items[i] = items[smallest] as HeapNode
        items[smallest] = tmp
        i = smallest
      }
    }
    return top
  }
}

/** Минимальная манхэттен-дистанция от `from` до ближайшей из целей × base (допустима). */
function heuristic(from: Coordinate, goals: readonly Coordinate[], base: number): number {
  let best = Infinity
  for (const g of goals) {
    const d = manhattan(from, g)
    if (d < best) best = d
  }
  return best === Infinity ? Infinity : best * base
}

/**
 * Многоцелевой A*. Находит путь минимальной суммарной стоимости от `start` до
 * ЛЮБОЙ из целевых клеток. Возвращает путь без стартовой клетки или null, если
 * ни одна цель недостижима (или целей нет).
 *
 * Стартовая клетка не обязана быть `passable` (агент уже стоит на ней); соседи —
 * только проходимые. Если `start` уже является целью — путь пустой (агент на выходе).
 */
export function aStar(params: AStarParams): AStarPath | null {
  const { start, goals, size, passable, enterCost, base } = params
  if (goals.length === 0) return null

  const goalKeys = new Set(goals.map(coordKey))
  const startKey = coordKey(start)
  if (goalKeys.has(startKey)) {
    return { path: [], goal: start, totalCost: 0 }
  }

  const gScore = new Map<string, number>()
  const cameFrom = new Map<string, Coordinate>()
  const closed = new Set<string>()
  const heap = new MinHeap()
  let seq = 0

  gScore.set(startKey, 0)
  heap.push({ key: startKey, coord: start, g: 0, f: heuristic(start, goals, base), seq: seq++ })

  while (heap.size > 0) {
    const current = heap.pop() as HeapNode
    if (closed.has(current.key)) continue // устаревшая запись (ленивое удаление)
    closed.add(current.key)

    if (goalKeys.has(current.key)) {
      return reconstruct(cameFrom, current.coord, startKey, current.g)
    }

    const g = current.g
    for (const n of neighbors4(current.coord)) {
      if (!inBounds(n, size)) continue
      const nKey = coordKey(n)
      if (closed.has(nKey)) continue
      if (!passable(n)) continue
      const tentative = g + enterCost(n)
      const known = gScore.get(nKey)
      if (known === undefined || tentative < known) {
        gScore.set(nKey, tentative)
        cameFrom.set(nKey, current.coord)
        heap.push({ key: nKey, coord: n, g: tentative, f: tentative + heuristic(n, goals, base), seq: seq++ })
      }
    }
  }

  return null
}

/** Восстановить путь от цели к старту по cameFrom; вернуть без стартовой клетки. */
function reconstruct(
  cameFrom: Map<string, Coordinate>,
  goal: Coordinate,
  startKey: string,
  totalCost: number,
): AStarPath {
  const reversed: Coordinate[] = []
  let cur: Coordinate | undefined = goal
  while (cur !== undefined && coordKey(cur) !== startKey) {
    reversed.push(cur)
    cur = cameFrom.get(coordKey(cur))
  }
  reversed.reverse()
  return { path: reversed, goal, totalCost }
}
