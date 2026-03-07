# Quick Start: Question IRT Parameters

This document covers the changes introduced by the Question IRT Parameters feature.

## Overview

The `Question` database model has been updated to include Item Response Theory (IRT) parameters ($a$, $b$, $c$). These parameters form the mathematical foundation for the adaptive learning engine.

- $a$: Discrimination parameter (How well the question differentiates between high and low ability students).
- $b$: Difficulty parameter (The ability level required to have a 50% chance of answering correctly).
- $c$: Pseudo-guessing parameter (The probability of a student with very low ability guessing the correct answer).

## Mongoose Schema Changes

Questions now feature an `irt` object containing the parameters.

```javascript
// Example Question Document
{
  "_id": "...",
  "content": "What is the capital of France?",
  "options": [...],
  "irt": {
    "a": 1.0,
    "b": 0.0,
    "c": 0.0
  }
}
```

## Behavior to note

1. **Defaults**: All new questions automatically start with standard neutral parameters ($a=1.0$, $b=0.0$, $c=0.0$) unless specified otherwise.
2. **Resets**: If a curriculum developer modifies the textual content or the options of a question, the IRT parameters are automatically reset back to the default values. This is because modifying the text mathematically changes the psychometric properties of the question, making the old parameters invalid.
