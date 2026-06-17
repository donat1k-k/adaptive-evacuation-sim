// S3 — Dynamic blockage / hazard (SPEC §9, §17). Цель — динамическое изменение
// среды. Два выхода (L слева, R справа); агенты стартуют справа, поэтому сперва
// целятся в ближний выход R. По ходу прогона:
//   • tick 2 — hazard-appear: задымлённая полоса в центре (danger/smoke > 0);
//   • tick 4 — block-exit: правый выход R закрывается.
// Ожидаемое различие алгоритмов (поведение, не вывод):
//   • A1 фиксирует R и деградирует (не переизбирает выход) → застревает;
//   • A2 переизбирает доступный выход L, но идёт сквозь hazard (кратчайший путь);
//   • A4 переизбирает L И обходит hazard через danger/smoke-cost.
// Данные, без редактора карт. Не зависит от React.
import type { Coordinate, ExitSpec, Scenario, Seed } from '../models/index.ts'
import { buildEnvironmentMap, rectStartZone } from './buildMap.ts'

const WIDTH = 13
const HEIGHT = 7

/** Два одиночных выхода в верхних углах. */
const EXITS: readonly ExitSpec[] = [
  { id: 'exit-l', cells: [{ x: 0, y: 0 }] },
  { id: 'exit-r', cells: [{ x: 12, y: 0 }] },
]

/** Полоса задымления в центре (x=6, y=0..3): встаёт на пути к левому выходу. */
const HAZARD_CELLS: readonly Coordinate[] = [
  { x: 6, y: 0 },
  { x: 6, y: 1 },
  { x: 6, y: 2 },
  { x: 6, y: 3 },
]

const DEFAULT_SEED: Seed = 1
const MAX_TICKS = 120

/**
 * S3. Сетка 13×7 без стен, два выхода. 8 агентов стартуют справа (x=9..11,
 * y=2..5 → 12 клеток), ближний выход — R. Динамика: дым в центре (tick 2) и
 * блокировка R (tick 4) заставляют пересматривать маршрут/выход.
 */
export const s3Scenario: Scenario = {
  id: 's3-dynamic',
  name: 'S3 — Dynamic blockage / hazard',
  description:
    'Динамическая среда: сетка 13×7, выходы L (слева) и R (справа). 8 агентов ' +
    'стартуют справа (ближний выход R). На тике 2 появляется задымление в центре, ' +
    'на тике 4 закрывается выход R. A1 застревает на R; A2 уходит на L сквозь дым; ' +
    'A4 уходит на L в обход дыма (danger/smoke-cost).',
  version: '1.0.0',
  map: buildEnvironmentMap({
    width: WIDTH,
    height: HEIGHT,
    walls: [],
    exits: EXITS,
    startZones: [rectStartZone('start', 9, 11, 2, 5)],
  }),
  agentCount: 8,
  events: [
    { type: 'hazard-appear', cells: [...HAZARD_CELLS], danger: 5, smoke: 5, tick: 2 },
    { type: 'block-exit', exitId: 'exit-r', tick: 4 },
  ],
  seed: DEFAULT_SEED,
  maxTicks: MAX_TICKS,
}
