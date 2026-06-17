import './App.css'
import { SimulationDemo, ComparisonExportPanel } from '../components/index.ts'

/**
 * Приложение-стенд. Отладочная визуализация headless-движка с реальными
 * алгоритмами A1/A2/A4 (E5) + debug-секция сравнения и экспорта (E9/E10).
 * Логика UI — в компонентах (src/components); App остаётся тонким.
 */

interface StageItem {
  id: string
  title: string
  done: boolean
}

const STAGES: readonly StageItem[] = [
  { id: 'E0', title: 'Подготовка репозитория и документации', done: true },
  { id: 'E1', title: 'Каркас Vite + React + TypeScript', done: true },
  { id: 'E2', title: 'Модели данных (src/models)', done: true },
  { id: 'E3', title: 'Headless simulation engine (src/simulation)', done: true },
  { id: 'E4', title: 'Базовая визуализация (src/components)', done: true },
  { id: 'E5', title: 'Алгоритмы A1 / A2 / A4 (src/algorithms)', done: true },
  { id: 'E6', title: 'Динамические события', done: true },
  { id: 'E7', title: 'Метрики (src/metrics)', done: true },
  { id: 'E8', title: 'Сценарии S1/S2/S3 (src/scenarios)', done: true },
  { id: 'E9', title: 'Сравнение алгоритмов (src/comparison)', done: true },
  { id: 'E10', title: 'Экспорт CSV/JSON (src/export)', done: true },
  { id: 'E11', title: 'Графики (кривая эвакуации)', done: false },
]

export function App() {
  return (
    <main className="app">
      <h1>Adaptive Evacuation Sim</h1>
      <p className="subtitle">Исследовательский стенд адаптивной эвакуации</p>

      <p className="note">
        Программная модель для сравнения алгоритмов маршрутизации при эвакуации
        в динамически изменяющейся среде. Это исследовательский стенд, а не игра
        и не проект по ОБЖ: цель — количественные метрики и воспроизводимые
        эксперименты. Ниже — отладочная визуализация движка с алгоритмами
        A1/A2/A4 и debug-секция сравнения/экспорта результатов
        (см. <code>docs/PROJECT_PLAN.md</code>).
      </p>

      <h2>Статус этапов</h2>
      <ul className="status-list">
        {STAGES.map((stage) => (
          <li key={stage.id}>
            {stage.done ? '✅' : '⬜'} <code>{stage.id}</code> — {stage.title}
          </li>
        ))}
      </ul>

      <SimulationDemo />
      <ComparisonExportPanel />
    </main>
  )
}
