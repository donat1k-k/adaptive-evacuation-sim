// Карта / среда как 2D-сетка-граф (SPEC §5). Все типы здесь — неизменяемые данные сценария.

/** Целочисленная координата клетки: 0 ≤ x < width, 0 ≤ y < height. */
export interface Coordinate {
  readonly x: number
  readonly y: number
}

/** Размер сетки в клетках. */
export interface GridSize {
  readonly width: number
  readonly height: number
}

/** Базовый тип клетки. Опасность/задымление — отдельными зонами (HazardZone). */
export const CELL_TYPES = ['floor', 'wall', 'exit'] as const
export type CellType = (typeof CELL_TYPES)[number]

/** Клетка как объект (для итерации/визуализации). Сетка хранится компактно как CellType[][]. */
export interface Cell {
  readonly pos: Coordinate
  readonly type: CellType
}

export type ExitId = string
export type ZoneId = string

/** Выход: одна или несколько целевых клеток (ширина выхода = число клеток). */
export interface ExitSpec {
  readonly id: ExitId
  readonly cells: readonly Coordinate[]
}

/** Стартовая зона: область появления агентов. */
export interface StartZone {
  readonly id: ZoneId
  readonly cells: readonly Coordinate[]
}

/** Опасная/задымлённая зона (Strong Version): повышает стоимость прохода клеток. */
export interface HazardZone {
  readonly id: ZoneId
  readonly cells: readonly Coordinate[]
  /** Уровень опасности (danger ≥ 0). */
  readonly danger: number
  /** Уровень задымления (smoke ≥ 0). */
  readonly smoke: number
}

/** Блокировка: набор клеток, ставших непроходимыми (как данные; применение — в движке E3/E6). */
export interface Blockage {
  readonly cells: readonly Coordinate[]
}

/** Карта/среда целиком. Сетка `cells` — row-major: cells[y][x]. */
export interface EnvironmentMap {
  readonly size: GridSize
  readonly cells: readonly (readonly CellType[])[]
  readonly exits: readonly ExitSpec[]
  readonly startZones: readonly StartZone[]
  readonly hazardZones: readonly HazardZone[]
}
