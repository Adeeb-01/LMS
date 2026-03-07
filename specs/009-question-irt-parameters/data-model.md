# Data Model: Question IRT Parameters

## Entities

### `Question` (Modified Entity)

The existing `Question` Mongoose model will be updated to include an embedded object (or direct fields) for the IRT parameters.

**New Fields:**

- `irt`: (Object) Contains the IRT parameters.
  - `a`: (Number) Discrimination parameter.
    - **Validation**: `> 0`
    - **Default**: `1.0`
  - `b`: (Number) Difficulty parameter.
    - **Validation**: No strict bounds, typically ranges from `-3.0` to `3.0`.
    - **Default**: `0.0`
  - `c`: (Number) Pseudo-guessing parameter.
    - **Validation**: `0 <= c <= 1`
    - **Default**: `0.0`

## State Transitions & Triggers

- **Creation**: When a `Question` is created without explicit IRT parameters, it will default to $a=1.0$, $b=0.0$, $c=0.0$.
- **Modification**: When the `content` (prompt, answer options, etc.) of a `Question` is modified, the IRT parameters MUST be reset to the default values. This will likely be handled via a Mongoose `pre('save')` hook or in the service layer update function by checking if the content paths were modified.

## Zod Validation Schema Updates

The Zod schema for questions (`questionSchema`) needs to be updated to optionally accept and validate `irt` properties.

```javascript
irt: z.object({
  a: z.number().positive().default(1.0),
  b: z.number().default(0.0),
  c: z.number().min(0).max(1).default(0.0)
}).optional().default({ a: 1.0, b: 0.0, c: 0.0 })
```
