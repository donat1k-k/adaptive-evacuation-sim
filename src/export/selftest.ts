// Sanity-проверки экспорта (этап E10). ЭКСПОРТИРУЕМЫЕ хелперы, НЕ авто-suite
// (как E3/E5/E6/E7; без тестового фреймворка). Не зависят от React.
import { MVP_ALGORITHMS } from '../models/index.ts'
import { FINAL_SCENARIOS } from '../scenarios/index.ts'
import { runScenarioComparison } from '../comparison/index.ts'
import type { ComparisonResult } from '../comparison/index.ts'
import { escapeCsv, exportComparisonCsv, exportAggregateCsv } from './csv.ts'
import { exportComparisonJson } from './json.ts'

export interface ExportSelfCheckResult {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

function sampleResult(): ComparisonResult {
  return runScenarioComparison({ scenarios: FINAL_SCENARIOS, algorithms: MVP_ALGORITHMS, seeds: [1] })
}

export function runExportSelfChecks(): ExportSelfCheckResult[] {
  const results: ExportSelfCheckResult[] = []
  const result = sampleResult()

  // 1. JSON parseable и несёт runs/aggregates/metadata.
  {
    let passed = false
    let detail = ''
    try {
      const parsed = JSON.parse(exportComparisonJson(result)) as ComparisonResult
      passed =
        Array.isArray(parsed.runs) &&
        parsed.runs.length === result.runs.length &&
        Array.isArray(parsed.aggregates) &&
        typeof parsed.metadata?.modelVersion === 'string'
      detail = passed ? `JSON распарсен, runs=${parsed.runs.length}` : 'структура JSON неполная'
    } catch (e) {
      detail = `JSON.parse упал: ${e instanceof Error ? e.message : String(e)}`
    }
    results.push({ name: 'json-parseable', passed, detail })
  }

  // 2. CSV прогонов содержит заголовок.
  {
    const csv = exportComparisonCsv(result)
    const header = csv.split('\n')[0] ?? ''
    const passed = header.startsWith('scenarioId,scenarioName,algorithm,seed,')
    results.push({
      name: 'runs-csv-has-header',
      passed,
      detail: passed ? 'заголовок присутствует' : `заголовок: ${header.slice(0, 40)}`,
    })
  }

  // 3. CSV корректно экранирует запятые/кавычки/переносы строк.
  {
    const comma = escapeCsv('a,b') === '"a,b"'
    const quote = escapeCsv('a"b') === '"a""b"'
    const newline = escapeCsv('a\nb') === '"a\nb"'
    const plain = escapeCsv('abc') === 'abc'
    const nullEmpty = escapeCsv(null) === '' && escapeCsv(undefined) === ''
    const passed = comma && quote && newline && plain && nullEmpty
    results.push({
      name: 'csv-escapes-special-chars',
      passed,
      detail: passed
        ? 'запятая/кавычка/перенос/число/null экранированы верно'
        : `comma=${comma} quote=${quote} newline=${newline} plain=${plain} null=${nullEmpty}`,
    })
  }

  // 4. Aggregate CSV содержит заголовок и строки scenario+algorithm.
  {
    const csv = exportAggregateCsv(result)
    const lines = csv.split('\n')
    const header = lines[0] ?? ''
    const passed =
      header.startsWith('scenarioId,algorithm,runs,') &&
      lines.length - 1 === result.aggregates.length &&
      result.aggregates.length > 0
    results.push({
      name: 'aggregate-csv-has-rows',
      passed,
      detail: passed ? `${lines.length - 1} строк агрегатов` : `строк=${lines.length - 1}, агрегатов=${result.aggregates.length}`,
    })
  }

  // 5. CSV null-значения → пустые ячейки (DECISIONS): прогон без эвакуированных
  //    даёт пустые makespan/meanEvacuationTime, а не 'null'/'NaN'.
  {
    // Синтетический прогон: makespan/время = null (нет эвакуированных).
    const synthetic: ComparisonResult = {
      metadata: { modelVersion: 'x', generatedAt: 'x', scenarioIds: ['s'], algorithms: ['nearest-exit'], seeds: [1] },
      runs: [
        {
          scenarioId: 's',
          scenarioName: 'name, with comma',
          scenarioVersion: '1.0.0',
          algorithm: 'nearest-exit',
          seed: 1,
          config: result.runs[0]!.config,
          metrics: {
            makespan: null,
            meanEvacuationTime: null,
            minEvacuationTime: null,
            maxEvacuationTime: null,
            finishedTick: 10,
            totalAgents: 3,
            evacuatedCount: 0,
            evacuatedFraction: 0,
            strandedCount: 3,
            blockedOrStuckCount: 3,
            exitLoads: [],
            totalReroutes: 0,
            meanReroutes: 0,
            meanDensity: null,
            maxDensity: null,
            evacuationCurve: [],
          },
        },
      ],
      aggregates: [],
    }
    const csv = exportComparisonCsv(synthetic)
    const dataRow = csv.split('\n')[1] ?? ''
    // Имя с запятой должно быть в кавычках; makespan/время — пустые ячейки.
    const hasQuotedName = dataRow.includes('"name, with comma"')
    const hasEmptyMakespan = dataRow.includes(',,') // пустые соседние ячейки от null
    const passed = hasQuotedName && hasEmptyMakespan
    results.push({
      name: 'csv-null-as-empty',
      passed,
      detail: passed ? 'null → пустая ячейка; имя с запятой в кавычках' : `строка: ${dataRow}`,
    })
  }

  return results
}
