// Валидатор сценария-как-данных (PLAN §3 E8). Чистая функция: проверяет, что
// карта/выходы/стартовые зоны/события согласованы и сценарий пригоден к прогону.
// Не зависит от React и от движка — только от моделей и геометрии.
import type { Scenario } from '../models/index.ts'
import { cellTypeAt, coordKey, inBounds } from './geometry.ts'

export interface ScenarioValidation {
  readonly ok: boolean
  readonly errors: readonly string[]
}

/**
 * Проверки (SPEC §17, PLAN §3 E8):
 * - размеры сетки совпадают с массивом cells;
 * - есть хотя бы один выход; клетки выходов в границах и помечены 'exit';
 * - есть хотя бы одна стартовая зона; уникальных стартовых клеток ≥ agentCount;
 *   стартовые клетки в границах и не являются стенами/выходами;
 * - события: tick ≥ 0; block-exit ссылается на существующий выход;
 *   клетки block-cell/hazard-appear в границах.
 */
export function validateScenario(scenario: Scenario): ScenarioValidation {
  const errors: string[] = []
  const { map } = scenario
  const { width, height } = map.size

  // Размеры сетки.
  if (map.cells.length !== height) {
    errors.push(`cells.length=${map.cells.length} ≠ height=${height}`)
  }
  for (let y = 0; y < map.cells.length; y++) {
    const row = map.cells[y]
    if (row && row.length !== width) errors.push(`cells[${y}].length=${row.length} ≠ width=${width}`)
  }

  // Выходы.
  if (map.exits.length === 0) errors.push('нет ни одного выхода')
  const exitIds = new Set<string>()
  for (const exit of map.exits) {
    if (exitIds.has(exit.id)) errors.push(`дублирующийся id выхода: ${exit.id}`)
    exitIds.add(exit.id)
    if (exit.cells.length === 0) errors.push(`выход ${exit.id} без клеток`)
    for (const c of exit.cells) {
      if (!inBounds(c, map.size)) errors.push(`выход ${exit.id}: клетка (${c.x},${c.y}) вне границ`)
      else if (cellTypeAt(map, c) !== 'exit') errors.push(`выход ${exit.id}: клетка (${c.x},${c.y}) не помечена 'exit'`)
    }
  }

  // Стартовые зоны и достаточность клеток для агентов.
  if (map.startZones.length === 0) errors.push('нет ни одной стартовой зоны')
  const startKeys = new Set<string>()
  for (const zone of map.startZones) {
    for (const c of zone.cells) {
      if (!inBounds(c, map.size)) {
        errors.push(`стартовая зона ${zone.id}: клетка (${c.x},${c.y}) вне границ`)
        continue
      }
      const type = cellTypeAt(map, c)
      if (type === 'wall' || type === 'exit') {
        errors.push(`стартовая зона ${zone.id}: клетка (${c.x},${c.y}) типа '${type}' (нужен 'floor')`)
      }
      startKeys.add(coordKey(c))
    }
  }
  if (scenario.agentCount < 0) errors.push(`agentCount=${scenario.agentCount} < 0`)
  if (startKeys.size < scenario.agentCount) {
    errors.push(`уникальных стартовых клеток (${startKeys.size}) меньше agentCount (${scenario.agentCount})`)
  }

  // События.
  for (const ev of scenario.events) {
    if (ev.tick < 0) errors.push(`событие ${ev.type}: tick=${ev.tick} < 0`)
    if (ev.type === 'block-exit') {
      if (!exitIds.has(ev.exitId)) errors.push(`block-exit ссылается на несуществующий выход: ${ev.exitId}`)
    } else {
      for (const c of ev.cells) {
        if (!inBounds(c, map.size)) errors.push(`${ev.type}: клетка (${c.x},${c.y}) вне границ`)
      }
    }
  }

  return { ok: errors.length === 0, errors }
}
