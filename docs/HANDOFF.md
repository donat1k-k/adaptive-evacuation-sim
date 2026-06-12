# HANDOFF.md

Память между сессиями. Кратко: где проект, что сделано, что дальше.

## Текущий статус
- Этап: **E2 завершён (модели данных)**. Это ТОЛЬКО типы — логики симуляции/алгоритмов/метрик-вычислений ещё нет.
- `src/models/`: `grid.ts` (Coordinate, GridSize, CellType, Cell, ExitSpec, StartZone, HazardZone, Blockage, EnvironmentMap), `agent.ts` (Agent, AgentState, Route), `algorithm.ts` (AlgorithmId union + AdaptiveWeights + RerouteThresholds), `event.ts` (DynamicEvent — дискр. union block-cell/block-exit/hazard-appear), `scenario.ts` (Scenario), `simulation.ts` (SimulationConfig, ConflictSettings), `metrics.ts` (AgentResult, SimulationMetrics, ExitLoad, EvacuationCurvePoint, SimulationResult, ExportRow), `reproducibility.ts` (Seed, RunMetadata, MODEL_VERSION='0.1.0'). Public API — `src/models/index.ts` (`export *`).
- Strict TS проходит (модели компилируются через `tsc -b`), lint чист. Без `any`, без внешних библиотек.
- E1 (ранее): каркас Vite 6 + React 19 + TS strict + ESLint 9 flat, commit `00226be`. E0: commit `26fa1b6`.
- Создан главный документ `docs/PROJECT_SPEC.md` (v1.0) — источник правды. Прочитать его перед любой работой.
- Создан `docs/PROJECT_PLAN.md` (v1.0) — план разработки и исследования: этапы E0–E15, MVP/Strong, эксперименты, риски, структура репозитория, правила качества.
- Заполнены `AGENTS.md` (постоянные правила для всех агентов) и `CLAUDE.md` (обёртка для Claude Code, импортирует `@AGENTS.md`).

## Зафиксированные решения (детали — в PROJECT_SPEC.md)
- Среда: 2D-сетка как граф, 4-связность.
- Время: дискретные тики, скорость агента = 1 клетка/тик, синхронная симуляция.
- Движение: один агент — одна клетка; конфликты за клетку разрешаются seed-приоритетом; проигравшие ждут/пересчитывают. Так возникают пробки.
- Информация: глобальная (агент знает карту/блокировки/состояние). Ограниченная видимость — Future Work.
- Алгоритмы MVP: A1 Nearest Exit, A2 Shortest Path A*, A4 Adaptive Weighted A*. A3 (Load-Aware) — Strong Version.
- A4 стоимость: `base + α·density + β·danger + γ·smoke + δ·exitLoad`, блокировка = ∞. В MVP активны base, α·density, δ·exitLoad.
- Метрики: время — только по эвакуированным; процент эвакуации приводится всегда рядом.
- Воспроизводимость: один seed → одни старты; парное сравнение алгоритмов; серии ≥10 seed'ов; экспорт CSV/JSON.
- Главный артефакт: кривая эвакуации (доля эвакуированных от времени).
- MVP без редактора карт (карты — данные JSON/код). Без 3D/backend/нейросетей.

## Что дальше (ожидает подтверждения автора)
- Следующий этап НЕ начат. Перед реализацией дождаться подтверждения.
- Логичный следующий шаг: **E3 — headless simulation engine (`src/simulation`)**: тики, фаза намерений → разрешение конфликтов по seed, застревание (N_stuck), T_max, плотность. Без React. На E3 зафиксировать решение по «движению цепочкой» (ConflictSettings.allowChaining, SPEC §8 п.5) в DECISIONS.md.
- Код не начинать без подтверждения.

## Заметки по моделям для E3+ (чтобы не искать)
- Сетка `EnvironmentMap.cells` — row-major `cells[y][x]`, тип `CellType[][]`.
- В `Agent` изменяемые поля (`pos, targetExit, route, state, tEvacuated, reroutes, stuckTicks`) правит ТОЛЬКО движок; `id, start, tStart, algorithm` — readonly.
- Отсутствующие значения кодируются как `| null` (не optional) — из-за `exactOptionalPropertyTypes`.
- Координаты выходов/зон/блокировок — массивы `Coordinate[]` (ширина выхода = число клеток).
- `SimulationConfig` + `seed` = полностью детерминированный прогон; сохраняется в `SimulationResult.config`.

## Файлы
- `docs/PROJECT_SPEC.md` — заполнен (главный документ).
- `docs/PROJECT_PLAN.md` — заполнен (план разработки).
- `docs/HANDOFF.md` — этот файл.
- `AGENTS.md` — заполнен (правила для агентов).
- `CLAUDE.md` — заполнен (обёртка для Claude Code, `@AGENTS.md`).
- `docs/DECISIONS.md` — заполнен (D1–D10 + параметры под подбор).
- `docs/TODO.md` — заполнен (этапы E0–E10+).
- `README.md` — заполнен (обзор проекта, статус, ссылки на доки).
- `.gitignore` — создан.
- `src/` приложения — ещё нет (появится на E1).
