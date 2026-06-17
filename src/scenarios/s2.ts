// S2 — Congestion / bottleneck (SPEC §17). Цель — показать эффект плотности и
// узких проходов. Стена делит карту по середине; в ней два прохода: центральный
// (близко к стартовой массе) и боковой (дальше). Много агентов → у центрального
// прохода образуется пробка. A2 ведёт большинство кратчайшим путём через
// центральный проход; A4 за счёт density-cost имеет ШАНС перераспределить часть
// агентов через боковой проход. Без выводов «A4 лучше» — только подготовка данных.
// Данные, без редактора карт. Не зависит от React.
import type { Coordinate, ExitSpec, Scenario, Seed } from '../models/index.ts'
import { buildEnvironmentMap, rectStartZone } from './buildMap.ts'

const WIDTH = 13
const HEIGHT = 11

/** Разделяющая стена на ряду y=5 по всей ширине, КРОМЕ двух проходов: x=6 и x=11. */
const GAP_X = new Set([6, 11])
function dividerWalls(): Coordinate[] {
  const walls: Coordinate[] = []
  for (let x = 0; x < WIDTH; x++) {
    if (!GAP_X.has(x)) walls.push({ x, y: 5 })
  }
  return walls
}

/** Выходы сверху над каждым проходом: центральный (близкий) и правый (дальний). */
const EXITS: readonly ExitSpec[] = [
  { id: 'exit-center', cells: [{ x: 6, y: 0 }] },
  { id: 'exit-right', cells: [{ x: 11, y: 0 }] },
]

const DEFAULT_SEED: Seed = 1
const MAX_TICKS = 150

/**
 * S2. Сетка 13×11 с разделяющей стеной (проходы x=6 и x=11). 24 агента стартуют
 * снизу по центру (y=8..10, x=2..10 → 27 клеток) — геометрически ближе к
 * центральному проходу/выходу, поэтому baseline-алгоритмы стягивают их в одно
 * узкое место и создают пробку. Без динамических событий: затор — структурный.
 */
export const s2Scenario: Scenario = {
  id: 's2-bottleneck',
  name: 'S2 — Congestion / bottleneck',
  description:
    'Узкое место: сетка 13×11 с разделяющей стеной и двумя проходами ' +
    '(центральный x=6 — близкий, правый x=11 — дальний). 24 агента у центра ' +
    'создают пробку у центрального прохода. A2 стягивает поток в короткий узкий ' +
    'путь; A4 через density-cost может частично уходить на боковой проход.',
  version: '1.0.0',
  map: buildEnvironmentMap({
    width: WIDTH,
    height: HEIGHT,
    walls: dividerWalls(),
    exits: EXITS,
    startZones: [rectStartZone('start', 2, 10, 8, 10)],
  }),
  agentCount: 24,
  events: [],
  seed: DEFAULT_SEED,
  maxTicks: MAX_TICKS,
}
