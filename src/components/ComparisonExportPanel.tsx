// Отладочная debug-секция экспорта (E10 UI). НАМЕРЕННО минимальная: запускает
// headless comparison (S1/S2/S3 × A1/A2/A4 × seeds) и даёт скачать JSON/CSV.
// Вся логика — в headless-слоях (comparison/export); компонент только вызывает их
// и предлагает скачивание. Это НЕ графики (E11) и не исследовательские выводы.
import { useState } from 'react'
import { MVP_ALGORITHMS } from '../models/index.ts'
import { FINAL_SCENARIOS } from '../scenarios/index.ts'
import { runScenarioComparison, seedRange } from '../comparison/index.ts'
import type { ComparisonResult } from '../comparison/index.ts'
import { exportComparisonJson, exportComparisonCsv, exportAggregateCsv } from '../export/index.ts'
import './SimulationDemo.css'

/** Число seed'ов в debug-прогоне (намеренно небольшое — это отладка, не серия E12). */
const SEED_COUNT = 5

/** Скачать текстовый файл (Blob + объект-URL). Browser-only, отладочный хелпер. */
function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ComparisonExportPanel() {
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [running, setRunning] = useState(false)

  const runComparison = () => {
    setRunning(true)
    // Синхронный headless-прогон (маленькие карты, ~45 прогонов).
    const res = runScenarioComparison({
      scenarios: FINAL_SCENARIOS,
      algorithms: MVP_ALGORITHMS,
      seeds: seedRange(SEED_COUNT),
    })
    setResult(res)
    setRunning(false)
  }

  return (
    <section className="sim-demo">
      <h2>Сравнение и экспорт (E9 + E10)</h2>
      <p className="sim-demo-note">
        Headless-прогон <strong>S1/S2/S3 × A1/A2/A4 × seeds 1..{SEED_COUNT}</strong>{' '}
        ({FINAL_SCENARIOS.length * MVP_ALGORITHMS.length * SEED_COUNT} прогонов) и
        экспорт сырых результатов. Это <strong>данные, не выводы</strong>: графиков
        (E11) и исследовательских заключений здесь нет. Средние makespan/времени —
        только по прогонам с эвакуированными; null в CSV — пустая ячейка.
      </p>

      <div className="sim-controls">
        <button type="button" onClick={runComparison} disabled={running}>
          {running ? 'Прогон…' : 'Прогнать сравнение'}
        </button>
        <button type="button" disabled={!result} onClick={() => result && downloadText('comparison.json', exportComparisonJson(result), 'application/json')}>
          Скачать JSON
        </button>
        <button type="button" disabled={!result} onClick={() => result && downloadText('runs.csv', exportComparisonCsv(result), 'text/csv')}>
          Скачать runs CSV
        </button>
        <button type="button" disabled={!result} onClick={() => result && downloadText('aggregate.csv', exportAggregateCsv(result), 'text/csv')}>
          Скачать aggregate CSV
        </button>
      </div>

      {result && (
        <table className="cmp-table">
          <thead>
            <tr>
              <th>Сценарий</th>
              <th>Алгоритм</th>
              <th>runs</th>
              <th>frac</th>
              <th>makespan</th>
              <th>время</th>
              <th>reroutes</th>
              <th>stranded</th>
            </tr>
          </thead>
          <tbody>
            {result.aggregates.map((a) => (
              <tr key={`${a.scenarioId}:${a.algorithm}`}>
                <td>{a.scenarioId}</td>
                <td>{a.algorithm}</td>
                <td>{a.runs}</td>
                <td>{a.meanEvacuatedFraction.toFixed(2)}</td>
                <td>{a.meanMakespan === null ? '—' : a.meanMakespan.toFixed(1)}</td>
                <td>{a.meanEvacuationTime === null ? '—' : a.meanEvacuationTime.toFixed(1)}</td>
                <td>{a.meanTotalReroutes.toFixed(1)}</td>
                <td>{a.meanStrandedCount.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
