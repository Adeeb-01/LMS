# Research: Adaptive IRT Testing

**Feature**: 016-adaptive-irt-testing  
**Date**: 2026-03-14

## 1. IRT Model Selection

### Decision: 3-Parameter Logistic (3PL) Model

### Rationale
The 3PL model accounts for:
- **Discrimination (a)**: How well the question differentiates between ability levels
- **Difficulty (b)**: The ability level at which P(correct) = 0.5 (adjusted for guessing)
- **Guessing (c)**: Lower asymptote representing random guessing probability

This aligns with MCQ-based assessments where guessing is a factor. The existing Question model (spec 009) already stores these parameters.

### Alternatives Considered

| Model | Pros | Cons | Decision |
|-------|------|------|----------|
| 1PL (Rasch) | Simpler, fewer parameters | Assumes equal discrimination; no guessing adjustment | Rejected: Oversimplifies MCQ behavior |
| 2PL | Accounts for discrimination | No guessing parameter | Rejected: MCQs have guessing floor |
| **3PL** | Full MCQ modeling | More parameters to calibrate | **Selected**: Matches spec 009 schema |
| 4PL | Adds upper asymptote | Rarely needed; complex | Rejected: Overkill for this use case |

### Formula

```
P(θ) = c + (1 - c) / (1 + e^(-a(θ - b)))

Where:
  θ = student ability estimate
  a = discrimination parameter (a > 0)
  b = difficulty parameter (typically -3 to +3)
  c = pseudo-guessing parameter (0 ≤ c ≤ 1)
```

---

## 2. Ability Estimation Method

### Decision: Expected A Posteriori (EAP) with Standard Normal Prior

### Rationale
EAP always produces a defined estimate, even for extreme response patterns (all correct or all incorrect). MLE can produce undefined or infinite estimates in these cases, requiring fallback logic.

### Mathematical Formulation

```
θ_EAP = ∫ θ · L(θ) · π(θ) dθ / ∫ L(θ) · π(θ) dθ

Where:
  L(θ) = likelihood function (product of P(θ) for correct, 1-P(θ) for incorrect)
  π(θ) = prior distribution (standard normal: N(0, 1))
```

### Implementation Approach
- Use numerical integration (quadrature) over θ range [-4, +4]
- 41 quadrature points (step size 0.2) provides sufficient precision
- Use `mathjs` for numerical integration support

### Standard Error Calculation

```
SE(θ) = 1 / √(I(θ))

Where I(θ) = Fisher Information = Σ I_i(θ) for all answered questions
```

---

## 3. Question Selection Algorithm

### Decision: Maximum Fisher Information (MFI)

### Rationale
MFI selects the question that provides the most information at the current ability estimate, maximizing measurement precision per question.

### Formula

```
I_i(θ) = a_i² · (P_i(θ) - c_i)² / ((1 - c_i)² · P_i(θ) · (1 - P_i(θ)))

Select question with: argmax I_i(θ_current)
```

### Content Balancing
To ensure topic coverage, use a weighted selection:
1. Calculate Fisher Information for all unanswered questions
2. Apply topic/module weighting factor based on target distribution
3. Select highest weighted score

### Edge Cases
- **Pool exhausted**: Terminate with available questions; flag in results
- **No suitable questions**: Lower precision threshold temporarily; log warning
- **All questions seen**: Select least-recently-seen (across attempts)

---

## 4. Stopping Rules

### Decision: Multi-criteria termination

### Rules (evaluated in order)
1. **Minimum questions**: Continue until min questions reached (default: 5)
2. **Precision threshold**: Stop when SE(θ) ≤ threshold (default: 0.30)
3. **Maximum questions**: Force stop at max (default: 30)
4. **Pool exhausted**: Stop when no unanswered questions remain

### Termination Reasons (stored in attempt)
- `precision_achieved`: SE below threshold after min questions
- `max_reached`: Maximum questions answered
- `pool_exhausted`: No more questions available
- `user_submitted`: Manual early submission (if allowed)

---

## 5. Ability Display Format

### Decision: Proficiency levels with percentile

### Mapping Table

| θ Range | Level | Percentile | Display |
|---------|-------|------------|---------|
| θ ≥ 2.0 | Expert | 98th+ | "Expert (top 2%)" |
| 1.0 ≤ θ < 2.0 | Advanced | 84th-97th | "Advanced (top 16%)" |
| 0.0 ≤ θ < 1.0 | Proficient | 50th-83rd | "Proficient (above average)" |
| -1.0 ≤ θ < 0.0 | Developing | 16th-49th | "Developing (below average)" |
| θ < -1.0 | Novice | <16th | "Novice (needs practice)" |

### Rationale
- Percentiles are intuitive for students and instructors
- Labels avoid negative connotation ("Developing" vs "Poor")
- Aligns with standard normal distribution (μ=0, σ=1)

---

## 6. Concurrent Session Handling

### Decision: Single active session with device blocking

### Implementation
1. On attempt start, set `activeDeviceId` field (UUID generated per browser session)
2. On each question fetch, verify `activeDeviceId` matches
3. Mismatch returns 409 Conflict with message: "Quiz in progress on another device"
4. Session timeout (30 min inactivity) clears `activeDeviceId`, allowing resume

### Mongoose Implementation
- Use optimistic locking via `__v` version field
- Atomic update with `findOneAndUpdate` and version check

---

## 7. JavaScript IRT Libraries

### Decision: Custom implementation with mathjs

### Alternatives Evaluated

| Library | Status | Issues |
|---------|--------|--------|
| js-irt | Unmaintained (2018) | No EAP, limited documentation |
| irt-js | Not found on npm | N/A |
| catsim (Python) | Active | Wrong language |
| Custom + mathjs | Viable | Full control; mathjs provides numerical integration |

### Implementation Plan
- Create `lib/irt/` module with pure functions
- Use `mathjs` for numerical integration in EAP calculation
- Comprehensive unit tests to validate against known IRT tables

---

## 8. Performance Considerations

### Target: <500ms question selection

### Analysis
- Question pool size: 30-100 questions
- Fisher Information: O(1) per question
- Selection: O(n) scan of pool
- EAP estimation: O(q × n) where q = quadrature points (41), n = answered questions

### Optimization Strategy
1. Cache question IRT parameters in memory during attempt
2. Incremental likelihood update (multiply new term, don't recalculate all)
3. Precompute quadrature weights

### Estimated Performance
- 100 questions × 41 quadrature points × simple math = ~4,100 operations
- Sub-millisecond on modern hardware; well under 500ms target

---

## 9. Data Migration

### Decision: No migration required

### Rationale
- Existing quizzes remain fixed-form (default behavior)
- New `adaptiveConfig` field is optional on Quiz model
- New attempt fields have defaults; existing attempts unaffected
- Question IRT parameters already exist from spec 009

---

## 10. Dependencies

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| mathjs | ^12.x | Numerical integration for EAP |

### Existing Dependencies (no changes)
- Mongoose 8: Database models
- Zod 3: Validation schemas
- shadcn/ui: UI components
- next-intl: Internationalization
