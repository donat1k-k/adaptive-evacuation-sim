// Sanity-проверки финальных сценариев S1–S3 (SPEC §17–18, PLAN §3 E8).
// ЭКСПОРТИРУЕМЫЕ хелперы, НЕ авто-suite (как E3/E5/E6/E7; без тестового фреймворка
// и новых зависимостей). Чистые, детерминированные; не зависят от React.
import type { Scenario } from '../models/index.ts'
import { sortEvents } from '../simulation/index.ts'
import { validateScenario, coordKey } from '../utils/index.ts'
import { FINAL_SCENARIOS } from './registry.ts'

export interface ScenarioSelfCheckResult {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

function uniqueStartCells(scenario: Scenario): number {
  const keys = new Set<string>()
  for (const zone of scenario.map.startZones) for (const c of zone.cells) keys.add(coordKey(c))
  return keys.size
}

export function runScenarioSelfChecks(): ScenarioSelfCheckResult[] {
  const results: ScenarioSelfCheckResult[] = []

  // 1. S1/S2/S3 валидны (структура карты/выходов/зон/событий согласована).
  for (const scn of FINAL_SCENARIOS) {
    const v = validateScenario(scn)
    results.push({
      name: `valid:${scn.id}`,
      passed: v.ok,
      detail: v.ok ? 'валиден' : v.errors.join('; '),
    })
  }

  // 2. У каждого сценария есть выходы и стартовые зоны.
  for (const scn of FINAL_SCENARIOS) {
    const passed = scn.map.exits.length > 0 && scn.map.startZones.length > 0
    results.push({
      name: `has-exits-and-starts:${scn.id}`,
      passed,
      detail: `exits=${scn.map.exits.length}, startZones=${scn.map.startZones.length}`,
    })
  }

  // 3. Уникальных стартовых клеток достаточно для agentCount.
  for (const scn of FINAL_SCENARIOS) {
    const cells = uniqueStartCells(scn)
    const passed = cells >= scn.agentCount
    results.push({
      name: `enough-start-cells:${scn.id}`,
      passed,
      detail: `${cells} клеток ≥ agentCount ${scn.agentCount}`,
    })
  }

  // 4. События сортируются по тику (детерминированный порядок применения).
  for (const scn of FINAL_SCENARIOS) {
    const sorted = sortEvents(scn.events)
    let ordered = true
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      if (prev && cur && cur.tick < prev.tick) ordered = false
    }
    results.push({
      name: `events-sorted:${scn.id}`,
      passed: ordered,
      detail: ordered ? `${sorted.length} событий упорядочены по тику` : 'события не отсортированы',
    })
  }

  // 5. Идентификаторы сценариев уникальны.
  {
    const ids = FINAL_SCENARIOS.map((s) => s.id)
    const passed = new Set(ids).size === ids.length
    results.push({
      name: 'unique-scenario-ids',
      passed,
      detail: passed ? `уникальны: ${ids.join(', ')}` : `дубликаты среди ${ids.join(', ')}`,
    })
  }

  return results
}
