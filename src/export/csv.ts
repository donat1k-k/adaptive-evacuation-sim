// Экспорт результатов сравнения в CSV (этап E10). Headless: не зависит от React.
// Решение по null (DECISIONS): отсутствующее значение (makespan/время без
// эвакуированных) → ПУСТАЯ ячейка. Разделитель — запятая, перевод строки — '\n'.
import type { ComparisonResult } from '../comparison/index.ts'

/** Значение ячейки CSV: null/undefined → пустая ячейка. */
type CsvValue = string | number | null | undefined

/**
 * Экранирование значения по RFC 4180: значение оборачивается в кавычки, если
 * содержит запятую, кавычку или перевод строки; внутренние кавычки удваиваются.
 * null/undefined → пустая строка.
 */
export function escapeCsv(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Собрать CSV из заголовка и строк значений. */
function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [header.map(escapeCsv).join(',')]
  for (const row of rows) lines.push(row.map(escapeCsv).join(','))
  return lines.join('\n')
}

const RUN_HEADER = [
  'scenarioId',
  'scenarioName',
  'algorithm',
  'seed',
  'totalAgents',
  'evacuatedCount',
  'evacuatedFraction',
  'strandedCount',
  'blockedOrStuckCount',
  'makespan',
  'meanEvacuationTime',
  'totalReroutes',
  'meanReroutes',
] as const

/** Плоская таблица по всем прогонам (один прогон = одна строка). */
export function exportComparisonCsv(result: ComparisonResult): string {
  const rows = result.runs.map((run): readonly CsvValue[] => {
    const m = run.metrics
    return [
      run.scenarioId,
      run.scenarioName,
      run.algorithm,
      run.seed,
      m.totalAgents,
      m.evacuatedCount,
      m.evacuatedFraction,
      m.strandedCount,
      m.blockedOrStuckCount,
      m.makespan,
      m.meanEvacuationTime,
      m.totalReroutes,
      m.meanReroutes,
    ]
  })
  return toCsv(RUN_HEADER, rows)
}

const AGGREGATE_HEADER = [
  'scenarioId',
  'algorithm',
  'runs',
  'meanEvacuatedFraction',
  'meanMakespan',
  'meanEvacuationTime',
  'meanTotalReroutes',
  'meanStrandedCount',
] as const

/** Таблица агрегатов по (scenario + algorithm). */
export function exportAggregateCsv(result: ComparisonResult): string {
  const rows = result.aggregates.map((a): readonly CsvValue[] => [
    a.scenarioId,
    a.algorithm,
    a.runs,
    a.meanEvacuatedFraction,
    a.meanMakespan,
    a.meanEvacuationTime,
    a.meanTotalReroutes,
    a.meanStrandedCount,
  ])
  return toCsv(AGGREGATE_HEADER, rows)
}
