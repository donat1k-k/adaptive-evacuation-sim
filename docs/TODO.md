# TODO.md

Список этапов. Детали каждого — в `docs/PROJECT_PLAN.md §3`. Один этап за раз; следующий не начинать без подтверждения автора.

- [x] **E0 — Подготовка репозитория.** git init, `.gitignore`, `README.md`, `docs/DECISIONS.md`, `docs/TODO.md`, первый commit.
- [x] **E1 — Каркас приложения.** Vite + React + TypeScript, структура `src/`, strict TS, ESLint. Build/lint зелёные. Без логики симулятора.
- [x] **E2 — Модели данных (`src/models`).** Типы: среда, агент, алгоритм, событие, сценарий, конфиг, метрики/результат, воспроизводимость. Пассивные данные, strict. Build/lint зелёные.
- [x] **E3 — Headless simulation engine (`src/simulation`).** Тики, движение, разрешение конфликтов по seed, застревание, `T_max`, базовые события. Без React. mulberry32 PRNG, stub-политика движения, sanity-хелперы. Build/lint зелёные.
- [x] **E4 — Базовая визуализация (`src/components`).** CSS-grid debug-рендер, контролы Step/Reset/Run, счётчики tick/эвакуировано/на карте. Demo-сценарий `demoE4` + `StubGreedyPolicy` (временная, не финальные алгоритмы). Build/lint зелёные.
- [x] **E5 — Алгоритмы A1/A2/A4 (`src/algorithms`).** Общий многоцелевой A* (`pathfinding.ts`), база политик (`routingShared.ts`), A1 nearest-exit, A2 shortest-path A*, A4 adaptive weighted A* (`base + α·density + β·danger + γ·smoke`; danger/smoke из `state.hazards`; δ·exitLoad и A3 не реализованы), реестр `createPolicy`, sanity-хелперы `runAlgorithmSelfChecks`. Селектор A1/A2/A4 в demo. Build/lint зелёные.
- [x] **E6 — Динамические события.** `block-cell`/`block-exit`/`hazard-appear` доведены до MVP: детерминированное применение до движения тика, идемпотентность повторов/перекрытий, видимость через `isPassable`/`openExitCellKeys`. Реакция алгоритмов закреплена (A1 упрямо застревает на блокировке своего выхода; A2/A4 переизбирают выход; A4 учитывает hazard через danger/smoke). E6/debug-фикстура two-exit + 5 event-selfcheck (sim) + 3 поведенческих (algo). Build/lint зелёные, 14 sim + 11 algo selfcheck PASS.
- [x] **E7 — Метрики (`src/metrics`).** `computeMetrics(state)` — чистый headless-слой из финального состояния (движок/`run()` не менялись, D24). Метрики: total/evacuated/stranded/blockedOrStuck, evacuatedFraction, makespan, min/mean/maxEvacuationTime, finishedTick, totalReroutes/meanReroutes, exitLoads, evacuationCurve (время только по эвакуированным; % всегда рядом; null при отсутствии эвакуированных; 0 агентов без NaN — D25). Demo-UI показывает базовые метрики. 8 metrics-selfcheck PASS (всего 14 sim + 11 algo + 8 metrics). Build/lint зелёные.
- [ ] **E8 — Сценарии (`src/scenarios`).** S1 baseline, S2 узкое место, S3 динамическая блокировка. Как данные.
- [ ] **E9 — Графики и экспорт.** Кривая эвакуации, таблица метрик; экспорт CSV/JSON с полным конфигом+seed. *(в PLAN: E9 сравнение/парный прогон, E10 экспорт, E11 графики)*
- [ ] **MVP — контрольная точка.** Чек-лист «MVP готов» (PLAN §6), тег `v1-mvp`.
- [ ] **E10+ — Эксперименты и анализ.** Серии 1–4 (один фактор), seed-повторы, агрегация, выводы. Затем Strong Version и итоговая работа.

Легенда: `[ ]` не начато · `[~]` в работе · `[x]` готово.
