// Геометрия сетки-графа (SPEC §5): манхэттен, 4-соседи, границы, ключ клетки.
// Чистые функции без состояния. Переиспользуются движком (E3), stub-policy,
// будущими алгоритмами (E5) и метриками (E7). Не зависят от React.
import type { Coordinate, GridSize, CellType, EnvironmentMap } from '../models/index.ts'

/** Манхэттенское расстояние между клетками (SPEC §5, 4-связность). */
export function manhattan(a: Coordinate, b: Coordinate): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/**
 * 4-соседи клетки в ФИКСИРОВАННОМ порядке: вверх, вниз, влево, вправо.
 * Порядок детерминирован — это важно для воспроизводимых tie-break'ов.
 */
export function neighbors4(c: Coordinate): Coordinate[] {
  return [
    { x: c.x, y: c.y - 1 }, // up
    { x: c.x, y: c.y + 1 }, // down
    { x: c.x - 1, y: c.y }, // left
    { x: c.x + 1, y: c.y }, // right
  ]
}

/** Клетка внутри сетки: 0 ≤ x < width, 0 ≤ y < height. */
export function inBounds(c: Coordinate, size: GridSize): boolean {
  return c.x >= 0 && c.x < size.width && c.y >= 0 && c.y < size.height
}

/** Стабильный строковый ключ клетки для Map/Set (НЕ полагаться на порядок обхода). */
export function coordKey(c: Coordinate): string {
  return `${c.x},${c.y}`
}

/** Тип клетки по координате; undefined — вне границ. Сетка row-major: cells[y][x]. */
export function cellTypeAt(map: EnvironmentMap, c: Coordinate): CellType | undefined {
  if (!inBounds(c, map.size)) return undefined
  return map.cells[c.y]?.[c.x]
}

/** Равенство координат. */
export function coordEquals(a: Coordinate, b: Coordinate): boolean {
  return a.x === b.x && a.y === b.y
}
