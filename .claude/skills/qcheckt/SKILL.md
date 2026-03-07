---
name: qcheckt
description: Test-specific code review. Use when user types 'qcheckt' OR when test implementations need review. Performs skeptical review of Jest + React Testing Library test implementations.
---

# QCHECKT - Test Review

## Purpose

This skill activates when the user types "qcheckt" to perform a detailed review of test implementations.

## Instructions

When this skill is invoked, review test files as a skeptical senior engineer:

### 1. Test Structure

- [ ] Tests organized with `describe` blocks by component/feature
- [ ] Individual tests use clear `it`/`test` descriptions
- [ ] Setup/teardown in `beforeEach`/`afterEach` where appropriate
- [ ] No test interdependencies

### 2. React Testing Library Patterns

- [ ] `render()` + `screen` queries used properly
- [ ] Query priority followed: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
- [ ] `userEvent` for user interactions (not `fireEvent` for clicks/typing)
- [ ] `waitFor` / `findBy` for async operations
- [ ] `within()` for scoped queries

### 3. Assertion Quality

- [ ] Assertions are meaningful and specific
- [ ] Testing behavior, not implementation details
- [ ] Edge cases covered (empty states, loading, errors)
- [ ] No testing of internal component state directly

### 4. Async Testing

- [ ] API calls mocked properly
- [ ] `waitFor` used for state updates after async operations
- [ ] `findBy` queries for elements that appear asynchronously
- [ ] Mock cleanup in `afterEach`

### 5. Component Isolation

- [ ] External dependencies mocked (API calls, router)
- [ ] Child components rendered (not mocked) for integration tests
- [ ] Props tested with various inputs
- [ ] Error boundaries tested if applicable

### 6. Snapshot Testing

- [ ] Used sparingly (only for stable, visual components)
- [ ] Snapshots reviewed when updated
- [ ] Not used as a replacement for behavioral tests

### 7. Anti-Patterns to Flag

- [ ] No `container.querySelector` (use screen queries)
- [ ] No testing implementation details (state, methods)
- [ ] No unnecessary `act()` wrapping
- [ ] No hardcoded timeouts in tests

## Output Format

```
## Test Review Report

### Files Reviewed: [list]
### Rating: X/10

### Issues
1. [Issue with fix suggestion]

### Missing Coverage
1. [Untested scenario that should be covered]

### Good Patterns
1. [What was done well]
```
