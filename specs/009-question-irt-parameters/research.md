# Phase 0: Research

## Unknowns Resolved

All uncertainties regarding the bounds of $a$ and $c$, and default values have been resolved in the clarification phase.

- `a` must be strictly positive ($a > 0$).
- `c` must be bounded between $0$ and $1$ inclusive ($0 \le c \le 1$).
- Default values for missing parameters or parameter reset: $a=1.0$, $b=0.0$, $c=0.0$.
- Resets MUST happen when question content is modified.

## Best Practices

### Mongoose Schema Updates
- **Decision**: Embed the IRT parameters directly into the existing `Question` schema rather than creating a separate collection.
- **Rationale**: Fetching a question will inherently fetch its IRT parameters without requiring a separate `JOIN` (aggregation). This is performant given that IRT calculations will frequently need the parameter values concurrently with the questions.
- **Alternatives considered**: A separate `QuestionStats` or `QuestionParameters` collection. Rejected because the overhead of linking and fetching separately outweighs the negligible size increase of three numerical fields.

### Reset Logic
- **Decision**: Trigger the reset logic within the service layer (or Mongoose `pre-save` hook if strictly comparing modified paths).
- **Rationale**: Since modifications can happen through various endpoints, centralizing the "if content changed, reset IRT" logic at the Mongoose middleware or central service level guarantees it is always executed.

### Zod Validation
- **Decision**: Update existing Zod schemas for Question Creation/Updates to validate incoming IRT fields (if provided programmatically) or ensure defaults.
- **Rationale**: Preserves the 'Schema-Validated Data' principle of the constitution.
