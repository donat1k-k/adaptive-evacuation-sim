// Headless-раннер ВСЕХ selfcheck-хелперов проекта. Запуск: `npm run selfcheck`
// (node исполняет TypeScript напрямую через type-stripping — без новых зависимостей
// и без тестового фреймворка, см. DECISIONS). Печатает PASS/FAIL по наборам и
// выставляет ненулевой код выхода при любом провале.
//
// НЕ импортирует React: только headless-слои (simulation/algorithms/metrics/
// scenarios/comparison/export).
import { runSimulationSelfChecks } from '../src/simulation/index.ts'
import { runAlgorithmSelfChecks } from '../src/algorithms/index.ts'
import { runMetricsSelfChecks } from '../src/metrics/index.ts'
import { runScenarioSelfChecks } from '../src/scenarios/index.ts'
import { runComparisonSelfChecks } from '../src/comparison/index.ts'
import { runExportSelfChecks } from '../src/export/index.ts'

interface CheckResult {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

const suites: readonly { label: string; run: () => readonly CheckResult[] }[] = [
  { label: 'simulation', run: runSimulationSelfChecks },
  { label: 'algorithms', run: runAlgorithmSelfChecks },
  { label: 'metrics', run: runMetricsSelfChecks },
  { label: 'scenarios', run: runScenarioSelfChecks },
  { label: 'comparison', run: runComparisonSelfChecks },
  { label: 'export', run: runExportSelfChecks },
]

let total = 0
let failed = 0
for (const suite of suites) {
  const results = suite.run()
  const suiteFails = results.filter((r) => !r.passed)
  total += results.length
  failed += suiteFails.length
  console.log(`\n[${suite.label}] ${results.length - suiteFails.length}/${results.length} PASS`)
  for (const r of results) {
    console.log(`  ${r.passed ? 'PASS' : 'FAIL'}  ${r.name}  —  ${r.detail}`)
  }
}

console.log(`\n=== TOTAL: ${total - failed}/${total} PASS, ${failed} FAIL ===`)
if (failed > 0) process.exitCode = 1
