// Хелпер построения EnvironmentMap для финальных сценариев S1–S3 (этап E8).
// Без редактора карт: карта собирается из списков стен/выходов/зон как данные.
// Чистая функция, не зависит от React.
import type {
  CellType,
  Coordinate,
  EnvironmentMap,
  ExitSpec,
  HazardZone,
  StartZone,
} from '../models/index.ts'
import { coordKey } from '../utils/index.ts'

export interface MapSpec {
  readonly width: number
  readonly height: number
  readonly walls: readonly Coordinate[]
  readonly exits: readonly ExitSpec[]
  readonly startZones: readonly StartZone[]
  readonly hazardZones?: readonly HazardZone[]
}

/** Построить карту: пол всюду, заданные клетки помечаются как стены/выходы. */
export function buildEnvironmentMap(spec: MapSpec): EnvironmentMap {
  const wallKeys = new Set(spec.walls.map(coordKey))
  const exitKeys = new Set(spec.exits.flatMap((e) => e.cells.map(coordKey)))
  const cells: CellType[][] = []
  for (let y = 0; y < spec.height; y++) {
    const row: CellType[] = []
    for (let x = 0; x < spec.width; x++) {
      const key = coordKey({ x, y })
      row.push(exitKeys.has(key) ? 'exit' : wallKeys.has(key) ? 'wall' : 'floor')
    }
    cells.push(row)
  }
  return {
    size: { width: spec.width, height: spec.height },
    cells,
    exits: spec.exits,
    startZones: spec.startZones,
    hazardZones: spec.hazardZones ?? [],
  }
}

/** Прямоугольная стартовая зона [x0..x1] × [y0..y1] (включительно). */
export function rectStartZone(id: string, x0: number, x1: number, y0: number, y1: number): StartZone {
  const cells: Coordinate[] = []
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) cells.push({ x, y })
  }
  return { id, cells }
}
