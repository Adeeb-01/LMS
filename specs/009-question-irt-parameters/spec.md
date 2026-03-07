# Feature Specification: Question IRT Parameters

**Feature Branch**: `009-question-irt-parameters`  
**Created**: 2026-03-06  
**Status**: Draft  
**Input**: User description: "I want to update the Question database schema to include IRT parameters (a, b, c) so that the adaptive engine can mathematically calculate question difficulty and student ability later."

## Clarifications

### Session 2026-03-07
- Q: Will instructors or admins need to manually edit these IRT parameters via the user interface, or are they exclusively calculated and updated by the backend adaptive engine? → A: Exclusively backend (calculated/updated by adaptive engine, no UI needed for now).
- Q: If a question's text or answer options are modified, should the existing IRT parameters be reset to their neutral default values? → A: Reset to defaults (treat as a mathematically new question).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Support Item Response Theory (IRT) Parameters for Questions (Priority: P1)

As a system or curriculum developer, I need questions to store Item Response Theory parameters ($a$, $b$, $c$) so that the adaptive learning engine has the necessary data to accurately calculate student ability and adapt difficulty.

**Why this priority**: Without storing these parameters in the schema, any downstream adaptive learning engine cannot perform the foundational IRT mathematical calculations.

**Independent Test**: Can be fully tested by creating and retrieving a question with valid $a$, $b$, and $c$ parameters through the system's data layer, confirming the values are accurately persisted and validated.

**Acceptance Scenarios**:

1. **Given** a new question is being created or updated, **When** IRT parameters ($a$, $b$, $c$) are provided, **Then** the system successfully saves the parameters with the question.
2. **Given** a question with stored IRT parameters, **When** the question is retrieved, **Then** the parameters are returned accurately to support calculations.

---

### Edge Cases

- What happens if a question is created without IRT parameters? (Should fallback to standard neutral values: $a=1.0, b=0.0, c=0.0$).
- What happens if the parameters provided are outside mathematically reasonable bounds (e.g., non-positive discrimination $a$, or guessing parameter $c < 0$ or $c > 1$)? (Should throw validation error).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the `Question` entity to store three numerical IRT parameters: `a` (discrimination), `b` (difficulty), and `c` (pseudo-guessing).
- **FR-002**: System MUST validate that parameter `a` (discrimination) is greater than 0 (`a > 0`).
- **FR-003**: System MUST validate that parameter `c` (guessing) is between 0 and 1 inclusive (`0 <= c <= 1`).
- **FR-004**: System MUST handle missing IRT parameters gracefully, falling back to standard neutral values: `a=1.0`, `b=0.0`, `c=0.0`.
- **FR-005**: System MUST reset a question's IRT parameters to the standard neutral values (`a=1.0`, `b=0.0`, `c=0.0`) whenever its content (text or answer options) is modified, to ensure the adaptive model treats it as a new item.

### Key Entities *(include if feature involves data)*

- **Question**: Represents an assessment item. Must be updated to include fields for the IRT model variables (`a`, `b`, `c`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created questions can successfully store and retrieve IRT parameters.
- **SC-002**: Invalid IRT parameters (e.g., $c = 1.5$) are rejected by the system with a clear validation error.
- **SC-003**: Existing questions continue to function without breaking, even before they are updated with explicit IRT parameters.
