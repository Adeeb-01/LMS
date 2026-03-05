# Research: Quiz System Improvements

**Feature**: 001-improve-quiz-system  
**Date**: 2026-03-05

## Research Topics

### 1. Timer Synchronization Strategy

**Decision**: Use server `expiresAt` timestamp as single source of truth, with client-side countdown for UX.

**Rationale**:
- Server stores absolute `expiresAt` timestamp in Attempt model (already exists)
- Client calculates remaining time as `expiresAt - Date.now()`
- On page refresh, client re-fetches attempt to get authoritative `expiresAt`
- Server rejects submissions after `expiresAt` regardless of client timer state
- Timer deviation < 2s is achievable since both client and server use system time

**Alternatives Considered**:
- Periodic server polling for time sync → Rejected (adds latency, unnecessary for ±2s tolerance)
- NTP-style time offset calculation → Rejected (overcomplicated for LMS quiz use case)

**Implementation Notes**:
- Current `quiz-taking-interface.jsx` already uses this pattern (lines 112-127)
- Enhancement needed: Extract timer to dedicated component with ARIA live announcements
- Enhancement needed: Handle edge case where client clock is significantly off (warn user)

---

### 2. localStorage Answer Backup

**Decision**: Use localStorage with quiz attempt ID as key, JSON-serialized answers object.

**Rationale**:
- Simple key-value storage sufficient for answer backup
- No need for IndexedDB complexity (single key per attempt)
- localStorage persists across page refreshes and tab closes
- 5MB limit per origin is more than sufficient for quiz answers

**Storage Schema**:
```javascript
// Key format
`quiz_answers_${attemptId}`

// Value format (JSON stringified)
{
  answers: { [questionId]: selectedOptionIds },
  lastSaved: ISO8601 timestamp,
  quizId: string,
  expiresAt: ISO8601 timestamp
}
```

**Sync Strategy**:
1. On answer change: Save to localStorage immediately
2. On 30-second interval: Sync localStorage to server via `autosaveAttempt`
3. On reconnection: Compare localStorage timestamp with server, keep newer
4. On successful submit: Clear localStorage entry
5. On attempt expiration: Clear localStorage entry

**Cleanup Policy**:
- Clear entries older than 24 hours on page load
- Clear entry when attempt status changes to "submitted" or "expired"

---

### 3. Quiz Results Answer Review UI

**Decision**: Conditional rendering based on `showAnswersPolicy` field.

**Rationale**:
- Quiz model already has `showAnswersPolicy: enum["never", "after_submit", "after_pass"]`
- Attempt model has `passed` boolean
- Results component checks both to determine what to display

**Display Matrix**:

| Policy | Passed | Show Score | Show Pass/Fail | Show Correct Answers | Show Explanations |
|--------|--------|------------|----------------|---------------------|-------------------|
| never | any | ✅ | ✅ | ❌ | ❌ |
| after_submit | any | ✅ | ✅ | ✅ | ✅ |
| after_pass | false | ✅ | ✅ | ❌ | ❌ |
| after_pass | true | ✅ | ✅ | ✅ | ✅ |

**Data Requirements**:
- Existing `getAttemptResult` action returns attempt with populated `quizId`
- Need to also fetch questions with correct answers for review display
- Security: Server action MUST respect `showAnswersPolicy` before returning correct answers

---

### 4. Question Navigator Component

**Decision**: Horizontal scrollable pill-style navigator with color-coded status indicators.

**Rationale**:
- Fits within existing quiz card layout
- Pills are touch-friendly for mobile users
- Color coding provides quick visual scan of progress

**Status Colors** (using existing Tailwind palette):
- Unanswered: `bg-slate-200` (gray)
- Answered: `bg-primary` (blue/brand color)
- Current: `ring-2 ring-primary` (outlined)
- Flagged (future): `bg-amber-400` (yellow) - not in current scope

**Accessibility**:
- Each pill is a button with `aria-label="Question N, answered/unanswered"`
- Navigator has `role="navigation"` and `aria-label="Question navigation"`
- Current question announced via `aria-current="step"`

---

### 5. Course Completion Integration

**Decision**: Extend existing `updateQuizCompletionInReport` to block certificate until all required quizzes passed.

**Rationale**:
- Report model already tracks `passedQuizIds` array
- Certificate generation already checks Report for completion
- Need to add check: "all quizzes where `required: true` must be in `passedQuizIds`"

**Existing Flow** (from `quizProgressv2.js`):
1. `submitAttempt` calls `updateQuizCompletionInReport` if passed and required
2. Report's `passedQuizIds` is updated
3. Course completion logic already considers module/lesson completion

**Enhancement Needed**:
- Certificate download endpoint must verify all required quizzes passed
- Course progress UI must show required quiz status

---

### 6. WCAG 2.1 AA Compliance for Quiz Interface

**Decision**: Use shadcn/ui primitives (already AA compliant) + add ARIA live regions for timer.

**Key Accessibility Requirements**:

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | shadcn/ui RadioGroup, Checkbox already support this |
| Focus management | `useRef` + `focus()` on question change |
| Screen reader labels | Add `aria-label` to all interactive elements |
| Timer announcements | `aria-live="polite"` region, announce at 5min, 1min, 30sec |
| Color contrast | Tailwind defaults meet AA; verify custom colors |
| Focus indicators | shadcn/ui provides `ring` styles by default |

**Timer Announcement Strategy**:
```jsx
// Announce time warnings, not every second
const announcements = [
  { seconds: 300, message: "5 minutes remaining" },
  { seconds: 60, message: "1 minute remaining" },
  { seconds: 30, message: "30 seconds remaining" },
  { seconds: 10, message: "10 seconds remaining" }
];
```

---

## Resolved Clarifications

| Topic | Resolution | Source |
|-------|------------|--------|
| Retake cooldown | Immediate retry allowed (no cooldown) | Spec clarification session |
| Offline depth | Graceful reconnection only (localStorage backup) | Spec clarification session |
| Accessibility level | WCAG 2.1 AA essentials | Spec clarification session |

## Dependencies

| Dependency | Version | Purpose | Notes |
|------------|---------|---------|-------|
| next | 15.x | Framework | Existing |
| react | 18.x | UI library | Existing |
| mongoose | 8.x | MongoDB ODM | Existing |
| shadcn/ui | latest | UI components | Existing, AA compliant |
| next-intl | latest | i18n | Existing |
| zod | 3.x | Validation | Existing |

No new dependencies required.

## Open Questions (None)

All research questions resolved. Ready for Phase 1.
