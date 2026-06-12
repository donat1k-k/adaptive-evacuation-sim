# HANDOFF.md

Память между сессиями. Кратко: где проект, что сделано, что дальше.

## Текущий статус
- Этап: **E4 завершён (базовая визуализация)**. Поверх headless-движка добавлен тонкий debug-UI: CSS-grid рендер сетки (пол/стена/выход/blocked/hazard/агенты), контролы Step/Reset/Run 10/Run-Pause, счётчики tick/статус/всего/эвакуировано/на карте. Движок не изменён (UI только читает `getState()` снимками-кадрами). Метрики ещё НЕ считаются (E7); настоящих алгоритмов A* нет (E5).
- **Движение в E4 — `StubGreedyPolicy` (временная demo-policy E3/E4), НЕ A1/A2/A4 и НЕ адаптивная маршрутизация.** После события `block-exit` stub просто выбирает доступный локальный ход с учётом текущих blocked cells/exits (не «перенацеливание» алгоритмом). В UI это явно подписано. Настоящие алгоритмы — E5.
- **E4 файлы:** `src/scenarios/demoE4.ts` (demo-сценарий 12×8, 2 выхода, центральные стены, 8 агентов, block-exit на тике 6 — НЕ финальные S1–S3 из E8) + `createDemoE4Config`; `src/components/`: `useSimulationDemo.ts` (хук-контроллер: engine в ref, иммутабельные кадры → useState, авто-прогон через setInterval со StrictMode-safe cleanup), `GridView.tsx`, `SimulationControls.tsx`, `SimulationStats.tsx`, `SimulationDemo.tsx` (+`.css`). `src/app/App.tsx` показывает demo-блок; App остаётся тонким.
- **E3 завершён + аудит пройден (headless simulation engine)**. Движок прогоняет сценарий headless (без React), детерминирован по seed.
- **E3 audit (senior-ревью ядра): критических багов нет.** Проверены детерминизм, occupancy (один агент/клетка), конфликты (один победитель, проигравшие стоят, no swap-through, no chaining), события (block-cell/exit/hazard, без двойного применения, стабильный порядок), состояния (обратимы, tEvacuated=tick+1), maxTicks (без off-by-one), stub-политика (временная, не A1/A2/A4), архитектура (без React/any/новых зависимостей).
- **По итогам аудита (hardening, без новых зависимостей):** добавлен **adjacency guard** в движке — `MovementPolicy` обязана вернуть 4-соседа (manhattan=1) либо `null`; несоседняя клетка или «сходить в себя» (manhattan 0) → throw (защита контракта, не pathfinding; D16). Расширены selfchecks: один-победитель, освобождение клетки при эвакуации, no-swap-through, block-exit-no-evacuation, срабатывание adjacency-guard. Selfchecks остаются ВРУЧНУЮ вызываемыми хелперами (авто-раннер не добавлен, D14); гейт — build/lint/типы.
- **Известные незначительные заметки (не баги, решаются позже):** метка `agent.algorithm` ≠ реальное поведение stub'а (выровняется на E5); `tStart=0` у всех (все стартуют в тике 0; интерпретация — E7); ветка `blocked` не эскалирует в `stuck` (обе обратимы/диагностичны); `tEvacuated` может равняться `maxTicks` — учесть в метриках E7.
- `src/simulation/`: `rng.ts` (mulberry32 `createRng`/`Rng`), `state.ts` (`SimulationState`, `isPassable`, `openExitCellKeys`, статусы, ActiveHazard), `policy.ts` (`MovementPolicy` интерфейс + `StubGreedyPolicy` — ВРЕМЕННАЯ заглушка E3, жадный спуск без pathfinding), `conflict.ts` (`resolveConflicts` — seed-приоритет, без chaining), `events.ts` (`sortEvents`, `applyDueEvents` — block-cell/block-exit/hazard-appear), `SimulationEngine.ts` (init+`step()`+`run()`), `selftest.ts` (`runSimulationSelfChecks` — экспортируемые хелперы, НЕ авто-suite). Public API — `src/simulation/index.ts`.
- `src/utils/geometry.ts`: `manhattan`, `neighbors4` (фикс. порядок up/down/left/right), `inBounds`, `coordKey`, `cellTypeAt`, `coordEquals`. Реэкспорт из `src/utils/index.ts`.
- `src/app/App.tsx`: статус E3 → done (только строка статуса, без UI симулятора).
- E2 (ранее): `src/models/` — типы среды/агента/алгоритма/события/сценария/конфига/метрик/воспроизводимости, commit `4d2b86c`.
- Strict TS + lint зелёные (`npm run build`, `npm run lint`). Без `any`, без новых зависимостей.
- E1: каркас Vite 6 + React 19 + TS strict + ESLint 9 flat, commit `00226be`. E0: commit `26fa1b6`.
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
- **E3 (новое):** D12 chaining не реализован (allowChaining=false, true→ошибка); D13 PRNG mulberry32; D14 stub-политика временная; D15 — tEvacuated=tick+1, нехватка стартовых клеток→ошибка, stuck/blocked обратимы, события сортируются детерминированно, hazard-appear базово. Детали — DECISIONS.

## Как работает seed / разрешение конфликтов (E3)
- Вся случайность — из одного mulberry32, инициализированного `config.seed`. Один `{сценарий, config, seed}` → бит-идентичный прогон.
- **Размещение:** все уникальные клетки стартовых зон детерминированно тасуются (Fisher–Yates от ГПСЧ), первые `agentCount` отдаются агентам. ГПСЧ расходуется ЗДЕСЬ первым → старты зависят только от seed+сценарий, не от алгоритма (готово к парному сравнению E9).
- **Конфликт:** синхронно, две фазы. Намерения собираются политикой; затем `resolveConflicts`: целевая клетка валидна, если проходима И НЕ занята на начало тика (без chaining). Спорные клетки обрабатываются в отсортированном порядке ключей, претенденты — в порядке id; каждому даётся приоритет от ГПСЧ, выигрывает максимум. Проигравшие стоят. Порядок обхода кода на результат НЕ влияет.

## Что дальше (ожидает подтверждения автора)
- Следующий этап НЕ начат. Перед реализацией дождаться подтверждения.
- Логичный следующий шаг: **E5 — алгоритмы A1/A2/A4 (`src/algorithms`)**: единый интерфейс, общий A*/BFS, реестр. Настоящие алгоритмы заменят `StubGreedyPolicy` через интерфейс `MovementPolicy` (шов уже готов). `useSimulationDemo`/demo-сценарий смогут переключать policy.
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
- `src/models/` — типы данных (E2). `src/simulation/` — headless-движок (E3). `src/utils/geometry.ts` — геометрия сетки. Остальные папки `src/` (algorithms/scenarios/metrics/experiment/export/components) — пока заглушки `export {}`.
