# Test Case Diagrams & Test Results Diagrams

Visual models for **LMS-main** testing: who/what is tested (test cases), how cases relate to features, and how to read **test results** (pass/fail distribution).

**Related:** [TEST_PLAN.md](./TEST_PLAN.md), [TEST_TYPES.md](./TEST_TYPES.md), [MODULE_IMPLEMENTATION.md](./MODULE_IMPLEMENTATION.md).

**Regenerate results:** `npm test -- --ci --json --outputFile=jest-results.json` then summarize with Node (see [§6](#6-regenerating-result-diagrams)).

---

## Table of contents

1. [Test case diagram (actors & cases)](#1-test-case-diagram-actors--cases)
2. [Test case hierarchy by module](#2-test-case-hierarchy-by-module)
3. [Traceability matrix](#3-traceability-matrix)
4. [Scenario sequence diagrams](#4-scenario-sequence-diagrams)
5. [Test case catalog (IDs)](#5-test-case-catalog-ids)
6. [Test results — latest run snapshot](#6-test-results--latest-run-snapshot)
7. [Results by layer and folder](#7-results-by-layer-and-folder)
8. [Suite pass/fail map](#8-suite-passfail-map)
9. [Failure analysis diagram](#9-failure-analysis-diagram)
10. [Results over time (CI template)](#10-results-over-time-ci-template)
11. [Regenerating result diagrams](#11-regenerating-result-diagrams)

---

## 1. Test case diagram (actors & cases)

UML-style view: **actors** trigger **test cases** (automated or manual). Solid lines = automated in Jest; dashed = manual/UAT.

```mermaid
flowchart LR
  subgraph actors [Actors]
    STU((Student))
    INS((Instructor))
    ADM((Admin))
    SYS((System / Cron))
  end

  subgraph auth [Authentication]
    TC_A01[TC-A01 Login session]
    TC_A02[TC-A02 Role gate API]
  end

  subgraph learn [Learning]
    TC_L01[TC-L01 Watch synced video]
    TC_L02[TC-L02 RAG tutor query]
    TC_L03[TC-L03 Recite-back]
    TC_L04[TC-L04 Oral checkpoint]
  end

  subgraph assess [Assessment]
    TC_Q01[TC-Q01 Adaptive quiz]
    TC_Q02[TC-Q02 BAT 5 blocks]
    TC_Q03[TC-Q03 Quiz schemas]
  end

  subgraph content [Content pipeline]
    TC_C01[TC-C01 DOCX upload]
    TC_C02[TC-C02 Embed index]
    TC_C03[TC-C03 Alignment review]
    TC_C04[TC-C04 MCQ generation]
  end

  subgraph remed [Remediation]
    TC_R01[TC-R01 Weakness aggregate]
    TC_R02[TC-R02 Priority score]
    TC_R03[TC-R03 Timestamp resolve]
  end

  subgraph plat [Platform]
    TC_P01[TC-P01 Health APIs]
    TC_P02[TC-P02 Admin stats]
  end

  STU --> TC_L01
  STU --> TC_L02
  STU --> TC_L03
  STU --> TC_L04
  STU --> TC_Q01
  STU --> TC_Q02
  STU --> TC_R01

  INS --> TC_C01
  INS --> TC_C02
  INS --> TC_C03
  INS --> TC_C04
  INS --> TC_A02

  ADM --> TC_P02
  ADM --> TC_A02

  SYS --> TC_C02
  SYS --> TC_R01

  TC_A01 -.-> STU
  TC_A01 -.-> INS
```

---

## 2. Test case hierarchy by module

Mind map of **automated** test files grouped under product modules.

```mermaid
mindmap
  root((LMS Test Cases))
    IRT Adaptive
      probability
      estimation EAP
      information
      selection
      block-selection BAT
      difficulty-bands
      adaptive-quiz integration
      bat-quiz integration
    RAG Tutor
      rag-tutor-response
      rag-tutor actions
      e2e flow simulated
      semantic-search API
    Remediation
      aggregator
      priority-scorer
      profile-merge
      timestamp-resolver
      remediation actions
    Lecture DOCX
      docx-extractor
      heading-chunker
      upload replace download
      alignment pipeline
    AI Pipeline
      embedding-pipeline
      pipeline-orchestrator
      chroma-health
    Schemas
      quiz question answer
      adaptive-answer
    Oral MCQ
      mcq-generator
      duplicate-detector
      oral-assessment
      concept-coverage
```

---

## 3. Traceability matrix

Links **test case ID** → **module** → **automated file** → **test type** ([TEST_TYPES.md](./TEST_TYPES.md)).

```mermaid
flowchart TB
  subgraph req [Business capability]
    M1[Adaptive IRT]
    M2[RAG Tutor]
    M3[Remediation]
    M4[Lecture pipeline]
  end

  subgraph tc [Test case ID]
    TC_Q01
    TC_L02
    TC_R01
    TC_C02
  end

  subgraph auto [Jest file]
    F1[tests/unit/irt/*]
    F2[__tests__/actions/rag-tutor.test.js]
    F3[__tests__/lib/remediation/*]
    F4[tests/integration/embedding-pipeline.test.js]
  end

  M1 --> TC_Q01 --> F1
  M2 --> TC_L02 --> F2
  M3 --> TC_R01 --> F3
  M4 --> TC_C02 --> F4
```

| Test case ID | Module | Primary automated tests | Type |
|--------------|--------|-------------------------|------|
| TC-Q01 | Adaptive IRT | `tests/unit/irt/*`, `adaptive-quiz.test.js` | Unit + integration |
| TC-Q02 | BAT | `block-selection.test.js`, `bat-quiz.test.js` | Unit + integration |
| TC-L02 | RAG tutor | `rag-tutor-response.test.js`, `rag-tutor.test.js`, `semantic-search.test.js` | Unit + integration |
| TC-L03 | Recite-back | `recite-back.test.js` | Integration |
| TC-L04 | Oral assessment | `oral-assessment.test.js`, `concept-coverage.test.js` | Integration + unit |
| TC-R01 | Remediation | `aggregator.test.js`, `remediation.test.js` | Unit + action |
| TC-C01 | DOCX | `docx-extractor.test.js`, `lecture-document-upload.test.js` | Unit + integration |
| TC-C02 | Embeddings | `embedding-pipeline.test.js`, `gemini-embeddings.test.js` | Integration + unit |
| TC-C03 | Alignment | `text-aligner.test.js`, `alignment-pipeline.test.js` | Unit + integration |
| TC-C04 | MCQ gen | `mcq-generator.test.js`, `mcq-generation.test.js` | Unit + integration |
| TC-P01 | Health | `health-api.test.js`, `mongo-health.test.js`, `chroma-health.test.js` | Integration |

---

## 4. Scenario sequence diagrams

### TC-L02 — RAG tutor query (automated path)

```mermaid
sequenceDiagram
  participant Client as rag-tutor-panel
  participant API as POST /api/rag-tutor/query
  participant Action as askTutor
  participant Search as semantic-search
  participant LLM as tutor-response
  participant DB as TutorInteraction

  Client->>API: question, courseId, lessonId
  API->>Action: validate + auth
  Action->>Search: searchCourse(question)
  Search-->>Action: chunks[]
  Action->>LLM: generateGroundedResponse
  LLM-->>Action: response, isGrounded, timestamps
  Action->>DB: create interaction
  Action-->>API: success payload
  API-->>Client: JSON 200
```

**Tests:** `__tests__/actions/rag-tutor.test.js`, `tests/integration/semantic-search.test.js`, `__tests__/e2e/rag-tutor-flow.test.js` (mocked chain).

### TC-Q02 — BAT block submit

```mermaid
sequenceDiagram
  participant Stu as Student
  participant Act as submitBatBlock
  participant IRT as lib/irt/estimation
  participant DB as Attempt model

  Stu->>Act: block answers
  Act->>IRT: update theta EAP
  IRT-->>Act: newTheta
  Act->>DB: save block + missedConceptTags
  Act-->>Stu: next block or complete
```

**Tests:** `tests/integration/bat-quiz.test.js`, `tests/unit/irt/block-selection.test.js`.

### TC-R01 — Remediation weakness aggregation

```mermaid
sequenceDiagram
  participant Job as run-aggregation
  participant Agg as aggregator.js
  participant Score as priority-scorer
  participant DB as WeaknessProfile

  Job->>Agg: aggregateWeaknessesForStudent
  Agg->>Agg: mergeWeaknessEvents
  Agg->>Score: calculatePriorityScore
  Score-->>Agg: ranked weaknesses
  Job->>DB: upsert profile
```

**Tests:** `__tests__/lib/remediation/aggregator.test.js`, `__tests__/actions/remediation.test.js`.

---

## 5. Test case catalog (IDs)

Formal list for test plans and UAT traceability.

| ID | Title | Preconditions | Steps (summary) | Expected result | Automation |
|----|-------|---------------|-----------------|-----------------|------------|
| TC-A01 | Valid login | User exists | Submit credentials | Session cookie, redirect | Manual |
| TC-A02 | API unauthorized | No session | Call protected API | 401 | Partial Jest |
| TC-L01 | Video sync | Alignment published | Play lesson video | Text highlights match time | Manual + `video-text-sync` |
| TC-L02 | Grounded tutor answer | Indexed content | Ask in-scope question | `isGrounded: true`, chunks cited | Jest mocked |
| TC-L03 | Recite-back pass | Prior tutor turn | Record recitation | similarity ≥ threshold | Jest |
| TC-L04 | Oral fail → concepts | Assessment exists | Wrong answer audio | conceptsMissing populated | Jest |
| TC-Q01 | Adaptive termination | Quiz adaptive on | Answer until stop rule | Attempt completed, θ saved | Jest + Mongo |
| TC-Q02 | BAT 5 blocks | BAT pool valid | Complete 5×2 items | 10 questions, final θ | Jest + Mongo |
| TC-C01 | DOCX upload | Instructor owns course | Upload .docx | structuredContent stored | Jest mocked |
| TC-C02 | Re-index cancel | Job in progress | Re-upload doc | Old job cancelled, new index | Jest |
| TC-R01 | Weakness list | BAT/oral failures | Open remediation | Sorted by priority | Jest |
| TC-P01 | Health OK | Mongo/Chroma up | GET /api/health | 200 healthy | Jest |

---

## 6. Test results — latest run snapshot

**Run date:** 2026-05-22 (local `npm test -- --ci`)  
**Command:** `npm test`  
**Duration:** ~22–35 s  

### Overall test results

```mermaid
pie showData
    title Test cases (224 total)
    "Passed (209)" : 209
    "Failed (15)" : 15
```

| Metric | Value |
|--------|------:|
| **Test suites** | 63 |
| **Suites passed** | 42 |
| **Suites failed** | 21 |
| **Tests (cases)** | 224 |
| **Passed** | 209 (93.3%) |
| **Failed** | 15 (6.7%) |
| **Snapshots** | 0 |

### Suite results

```mermaid
pie showData
    title Test suites (63 total)
    "Passed (42)" : 42
    "Failed (21)" : 21
```

> **Note:** Some suites report **0 assertions** in JSON when the suite fails during `beforeAll` (import/setup). Count those as **failed suites**, not skipped tests.

---

## 7. Results by layer and folder

Distribution of **test cases** (assertions) by primary directory from last Jest JSON export.

```mermaid
xychart-beta
    title "Passed tests by area"
    x-axis ["unit", "schemas", "integration", "__tests__/lib", "__tests__/actions", "__tests__/service"]
    y-axis "Count" 0 --> 90
    bar [85, 23, 55, 31, 11, 4]
```

```mermaid
xychart-beta
    title "Failed tests by area"
    x-axis ["integration", "__tests__/service", "unit", "__tests__/lib"]
    y-axis "Count" 0 --> 10
    bar [8, 3, 2, 2]
```

| Area | Passed | Failed | Pass rate |
|------|-------:|-------:|----------:|
| `tests/unit/` | 85 | 2 | 97.7% |
| `tests/schemas/` | 23 | 0 | 100% |
| `tests/integration/` | 55 | 8 | 87.3% |
| `__tests__/lib/` | 31 | 2 | 93.9% |
| `__tests__/actions/` | 11 | 0 | 100% |
| `__tests__/service/` | 4 | 3 | 57.1% |
| Other suites* | — | — | varies |

\*Includes `__tests__/api`, `__tests__/e2e`, `tests/services`, `tests/models` — some failed at suite level without assertion counts in the rollup.

### Results by test type

```mermaid
flowchart LR
  subgraph pass [209 passed]
    U[Unit ~85]
    S[Schemas 23]
    I[Integration ~55]
    L[Lib tests ~31]
    A[Actions 11]
  end

  subgraph fail [15 failed]
    IF[Integration 8]
    SF[Service 3]
    UF[Unit 2]
    LF[Lib 2]
  end
```

Mapping to [TEST_TYPES.md](./TEST_TYPES.md): majority of automated coverage is **unit** + **integration**; **system** E2E is mostly mocked (1 file).

---

## 8. Suite pass/fail map

Heat-style view: **green** = all tests in suite passed; **red** = one or more failures or suite setup failed.

```mermaid
flowchart TB
  subgraph green [Suites passed — sample]
    G1[tests/unit/irt/*]
    G2[tests/schemas/*]
    G3[bat-quiz.test.js]
    G4[remediation/*.test.js]
    G5[aggregator.test.js]
  end

  subgraph red [Suites failed — last run]
    R1[lecture-document-search.test.js]
    R2[lecture-document-replace.test.js]
    R3[semantic-search.test.js]
    R4[pipeline-orchestrator.test.js]
    R5[audio-extractor.test.js]
    R6[rag-tutor*.test.js]
    R7[oral-generation/*.test.js]
  end
```

### Top suites by test count (all passed)

| Suite file | Tests passed |
|------------|-------------:|
| `tests/unit/db-config.test.js` | 12 |
| `tests/schemas/question.schema.test.js` | 9 |
| `tests/unit/duplicate-detector.test.js` | 9 |
| `__tests__/actions/remediation.test.js` | 8 |
| `tests/unit/irt/difficulty-bands.test.js` | 8 |
| `tests/integration/bat-quiz.test.js` | 7 |

---

## 9. Failure analysis diagram

Where failures concentrated in the last run (for triage).

```mermaid
flowchart TD
  F[15 failed tests] --> I[Integration 8]
  F --> S[__tests__/service 3]
  F --> U[Unit 2]
  F --> L[__tests__/lib 2]

  I --> I1[lecture-document-search 2]
  I --> I2[lecture-document-replace 2]
  I --> I3[semantic-search 2]
  I --> I4[lecture-document-upload 1]
  I --> I5[adaptive-config 1]

  S --> S1[pipeline-orchestrator 3]

  U --> U1[audio-extractor 2]

  L --> L1[oral-generation duplicate 1]
  L --> L2[oral-generation generator 1]
```

| Failure cluster | Likely cause | Action |
|-----------------|--------------|--------|
| Lecture document search/replace | Timeouts / mock drift | Increase timeout or fix mocks |
| `semantic-search` | Route/action contract change | Align test with `API_DESIGN.md` |
| `pipeline-orchestrator` | Job state machine change | Update fixtures |
| `audio-extractor` | FFmpeg env in CI | Mock ffmpeg or skip in CI |
| RAG/oral API suites | Suite-level import errors | Fix module mocks |

---

## 10. Results over time (CI template)

When GitHub Actions is added, plot **pass rate** and **duration** per build.

```mermaid
xychart-beta
    title "Example: weekly pass rate % (template — not live CI yet)"
    x-axis ["W1", "W2", "W3", "W4", "W5"]
    y-axis "Pass %" 80 --> 100
    line [88, 90, 91, 93, 93.3]
```

```mermaid
gantt
    title Example test execution timeline (release week)
    dateFormat YYYY-MM-DD
    section Developer
    Unit watch on commit     :a1, 2026-05-19, 5d
    section PR
    Full npm test on PR      :a2, 2026-05-21, 1d
    section Release
    Manual UAT checklist     :a3, 2026-05-22, 2d
    Staging smoke AI         :a4, 2026-05-23, 1d
```

### Coverage funnel (automated vs manual)

```mermaid
flowchart TB
  T[224 automated test cases] --> P[209 passing]
  P --> M[Manual UAT ~10 journeys]
  M --> R[Release candidate]

  T --> F[15 failing — fix before release]
  F -.->|block| R
```

---

## 11. Regenerating result diagrams

### Run tests and export JSON

```bash
npm test -- --ci --json --outputFile=jest-results.json
```

### Summarize by folder (Node)

```javascript
// summarize-jest.js
const r = require("./jest-results.json");
let pass = 0, fail = 0;
r.testResults.forEach((s) =>
  s.assertionResults.forEach((a) =>
    a.status === "passed" ? pass++ : fail++
  )
);
console.log({ pass, fail, total: r.numTotalTests, suites: r.numTotalTestSuites });
```

### Human-readable report

```bash
npm test -- --ci
```

Update the **pie charts** and tables in §6–§9 with new numbers after each release candidate.

### Optional: coverage diagram

```bash
npm test -- --ci --coverage
```

Open `coverage/lcov-report/index.html` for line coverage heatmap (not committed by default).

---

## Diagram legend

| Symbol | Meaning |
|--------|---------|
| Solid arrow | Automated test covers path |
| Dashed arrow | Manual / UAT only |
| Green subgraph | Passing suites (snapshot) |
| Red subgraph | Failing suites (snapshot) |
| TC-xx | Test case ID for traceability |

---

*Test scheduling: [TEST_PLAN.md](./TEST_PLAN.md). Test type definitions: [TEST_TYPES.md](./TEST_TYPES.md). API sample under test: [API_IMPLEMENTATION_SAMPLE.md](./API_IMPLEMENTATION_SAMPLE.md).*
