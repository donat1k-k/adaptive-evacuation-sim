// src/export — экспорт результатов сравнения в JSON/CSV (этап E10) с полным
// конфигом + seed (воспроизводимость, SPEC §15, §19). НЕ зависит от React.
// Решение по null в CSV (DECISIONS): отсутствующее значение → пустая ячейка.
export { exportComparisonJson } from './json.ts'
export { exportComparisonCsv, exportAggregateCsv, escapeCsv } from './csv.ts'

// Sanity-проверки (экспортируемые хелперы, НЕ авто-suite).
export { runExportSelfChecks } from './selftest.ts'
export type { ExportSelfCheckResult } from './selftest.ts'
