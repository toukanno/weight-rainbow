# Test Coverage Analysis: レインボー体重管理

## Current State

**Test coverage: 0%** — The project has no tests, no testing framework, and no test configuration.

All application logic lives in a single `index.html` file containing two functions:
- `save()` — weight record management (lines 28–38)
- `render()` — chart drawing and statistics display (lines 39–67)

---

## Testable Logic Units

### 1. `save()` — Weight Recording Logic

| Logic Area | Description | Risk | Priority |
|---|---|---|---|
| **Input parsing** | `parseFloat` on weight input | Medium | High |
| **Date defaulting** | Falls back to today's date if empty | Medium | High |
| **Validation** | Rejects falsy weight values | High | High |
| **Duplicate handling** | Updates existing record if same date | High | High |
| **Sorting** | Sorts records by date string comparison | Medium | Medium |
| **Rolling window** | Trims to 90 records max via `shift()` | High | High |
| **Persistence** | Reads/writes `localStorage` correctly | Medium | Medium |

#### Specific concerns:
- **Edge case**: `parseFloat("0")` is falsy, so a weight of `0` triggers the validation error — this may be a bug worth testing for.
- **Edge case**: When trimming to 90 records, `shift()` always removes the oldest entry. If a user enters a future date, the sort could cause unexpected data loss.
- **Edge case**: `parseFloat("65abc")` returns `65` — partial numeric strings are silently accepted.

### 2. `render()` — Statistics Calculation

| Logic Area | Description | Risk | Priority |
|---|---|---|---|
| **Min/Max weight** | Uses `Math.min/max(...weights)` | Low | Medium |
| **Weight change** | Difference between last and first entry | Medium | High |
| **Average weight** | Sum / count, fixed to 1 decimal | Low | Medium |
| **Chart scaling** | `py()` and `px()` coordinate mapping | Medium | Medium |
| **Date label selection** | Picks first, middle, last indices | Low | Low |
| **Empty data guard** | Early return when no data | Low | Medium |

#### Specific concerns:
- **Edge case**: With a single data point, `d.length-1` is `0`, and `px()` divides by `1` (via `||1`). The change calculation shows `0.0` which is correct.
- **Edge case**: `Math.min(...weights)` throws `RangeError` for very large arrays (>~100K items). Not a concern with the 90-record cap, but worth documenting.
- **Potential bug**: The `diff` calculation always computes `last - first`, but with sorted data this is actually "most recent date minus earliest date" — which is the correct semantic.

---

## Recommended Testing Strategy

### Phase 1: Extract and Unit Test Pure Logic (High Priority)

The business logic in `save()` and `render()` is tightly coupled to the DOM and `localStorage`. To make it testable, extract pure functions:

```
src/
  logic.js          # Pure functions: validation, statistics, record management
  app.js            # DOM interaction, calls logic.js
test/
  logic.test.js     # Unit tests for pure functions
```

**Functions to extract:**

1. `validateWeight(value)` — parse and validate weight input
2. `upsertRecord(records, date, weight)` — add or update a record
3. `trimRecords(records, maxCount)` — enforce the rolling window
4. `calcStats(weights)` — compute min, max, avg, change
5. `chartScale(weights, width, height, padding)` — compute px/py mapping

### Phase 2: Integration Tests (Medium Priority)

Use **jsdom** (via Vitest or Jest) to test DOM interactions:

- `save()` reads input values, updates localStorage, and calls render
- `render()` updates the stats display with correct HTML
- Canvas drawing calls are made with correct coordinates

### Phase 3: Edge Case and Regression Tests (Medium Priority)

| Test Case | Category |
|---|---|
| Weight of `0` is rejected (current behavior) or accepted (if considered a bug) | Validation |
| Weight with trailing text like `"65abc"` | Validation |
| Negative weight values | Validation |
| Extremely large weight values | Validation |
| Adding a 91st record removes the oldest | Rolling window |
| Updating an existing date's weight | Deduplication |
| Records are sorted correctly across year boundaries | Sorting |
| Single data point renders without error | Chart rendering |
| Empty localStorage renders without error | Initialization |
| Corrupted localStorage data | Robustness |

### Phase 4: Visual / Snapshot Tests (Low Priority)

- Canvas snapshot tests to verify chart rendering hasn't regressed
- HTML snapshot of the stats section

---

## Recommended Tool Setup

```json
{
  "devDependencies": {
    "vitest": "^3.x",
    "jsdom": "^25.x"
  }
}
```

Vitest is recommended over Jest for this project because:
- Zero-config for ES modules
- Built-in jsdom environment support
- Fast startup for a small project

---

## Summary of Gaps

| Area | Current Coverage | Target Coverage | Priority |
|---|---|---|---|
| Input validation | 0% | 100% | **High** |
| Record upsert/dedup | 0% | 100% | **High** |
| Rolling window (90 cap) | 0% | 100% | **High** |
| Statistics calculation | 0% | 100% | **High** |
| Chart coordinate mapping | 0% | 80% | Medium |
| DOM interaction | 0% | 60% | Medium |
| Canvas rendering | 0% | 30% | Low |
| localStorage I/O | 0% | 80% | Medium |

The highest-impact improvement is to **extract pure logic into a separate module and add unit tests** for validation, record management, and statistics. This covers the most critical business logic with minimal infrastructure.
