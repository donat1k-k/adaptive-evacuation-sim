// Экспорт результатов сравнения в JSON (этап E10). Headless: не зависит от React.
// Подробные данные: метаданные (версия модели + дата), все прогоны (scenario id/
// name/version, algorithm, seed, полный конфиг, метрики) и агрегаты. Воспроизводимо
// (SPEC §15): каждая запись несёт конфиг+seed.
import type { ComparisonResult } from '../comparison/index.ts'

/** Сериализовать результат сравнения в форматированный JSON (parseable). */
export function exportComparisonJson(result: ComparisonResult): string {
  return JSON.stringify(result, null, 2)
}
