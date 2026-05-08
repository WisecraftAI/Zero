# ZER0 – IDE-style QA automation architecture

## Vision

Work like an **IDE**: create a **project** (e.g. TVNZ), upload **test case CSV**, optionally **record** the full flow. Recording is **analyzed by AI** → **element logs** → **locators** → **Java automation scripts** (framework-based). Scripts are **stored in SQL** for reuse. **Manager agent** reviews; tests are **executed**; **Delivery Manager agent** reviews results and produces the final report.

## Pipeline (target)

1. **Create project** – e.g. "TVNZ" (stored in DB).
2. **Upload TC CSV** – Feature, Scenario, Expected Result for that project.
3. **Recording** – User records the full flow (browser). Recording = actions + DOM / element logs.
4. **AI analysis** – Recording is analyzed; **front-end element logs** are extracted; **locators** are constructed and stored (per project/host).
5. **Scripting** – Automation agent generates **Java** scripts (e.g. Selenium) for each TC using the framework and stored locators. Scripts are **stored in SQL** (reusable).
6. **Manager agent** – Reviews scripts and plan (coverage, quality).
7. **Execution** – Run the test suite (Java runner or Playwright runner).
8. **Delivery Manager agent** – Reviews execution results + manager report; produces **final delivery report** for the user.

## DB (PostgreSQL)

- **projects** – id, name, base_url, created_at.
- **qa_runs** – optional project_id (link run to project).
- **element_locators** – optional project_id (project-scoped locators).
- **element_logs** – optional project_id (recording / log per project).
- **stored_scripts** – project_id, tc_id, language ('java'), framework ('selenium'), content (script text), created_at.
- **recordings** – project_id, recording_json (actions + DOM snapshot), analyzed_at, created_at.

## API (existing + new)

- **POST /api/projects** – Create project (name, base_url).
- **GET /api/projects** – List projects.
- **GET /api/projects/:id** – Get project + recent runs, scripts count.
- **POST /api/projects/:id/recordings** – Upload recording / element log; backend analyzes and stores locators.
- **GET /api/projects/:id/scripts** – List stored Java scripts for the project.
- **POST /api/runs** – Optional body field `projectId` to link run to project.

## Why Java

- Structured, framework-based (e.g. Selenium/TestNG or JUnit).
- Scripts stored in DB and can be exported to a real Java project (e.g. TVNZ) for IDE use and CI.
- Execution can be done via Maven/Gradle in a later phase; for now execution can remain Playwright-based while scripts are generated in Java for storage and review.

## Delivery Manager agent

- **Input:** Execution report + Manager report + (optional) project metadata.
- **Output:** Final delivery report: summary for stakeholder, pass/fail summary, risk, recommended next steps, sign-off.
