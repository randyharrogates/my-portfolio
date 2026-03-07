---
name: review-test
description: Apply Jest + React Testing Library best practices checklist to evaluate test quality. Use when user asks to review/validate tests OR when analyzing test implementations for proper queries, assertions, and component testing patterns.
allowed-tools: Read, Grep, Glob
---

# Review Test - Jest + React Testing Library Quality Checklist

## Purpose

Evaluate the quality of test implementations against React Testing Library best practices.

## Checklist

### Test Organization

- [ ] `describe` blocks group related tests
- [ ] Test descriptions are clear and behavior-focused
- [ ] One concept per test
- [ ] No test interdependencies
- [ ] Setup shared via `beforeEach`

### Query Usage (Priority Order)

- [ ] `getByRole` preferred (most accessible)
- [ ] `getByLabelText` for form elements
- [ ] `getByText` for non-interactive elements
- [ ] `getByTestId` only as last resort
- [ ] `findBy` for async elements, `queryBy` for absence checks

### User Interactions

- [ ] `userEvent` over `fireEvent` for realistic simulation
- [ ] Keyboard events tested for accessible components
- [ ] Form submissions tested end-to-end
- [ ] Navigation interactions verified

### Assertions

- [ ] Test behavior, not implementation
- [ ] Specific matchers used (`toBeInTheDocument`, `toHaveTextContent`)
- [ ] Negative assertions where appropriate (`not.toBeInTheDocument`)
- [ ] Accessibility assertions (`toHaveAttribute('aria-*')`)

### Async Patterns

- [ ] `waitFor` for state changes after async ops
- [ ] `findBy` queries for elements appearing asynchronously
- [ ] API calls properly mocked with jest.fn() or MSW
- [ ] Mock cleanup in `afterEach` or `jest.restoreAllMocks`

### Component Testing

- [ ] Components rendered with realistic props
- [ ] Edge cases tested (empty data, errors, loading)
- [ ] Router context provided when needed (`MemoryRouter`)
- [ ] Child components not over-mocked

### Anti-Patterns

- [ ] No `container.querySelector` — use screen queries
- [ ] No testing internal state or methods
- [ ] No snapshot tests as sole coverage
- [ ] No hardcoded timeouts (`setTimeout` in tests)
- [ ] No unnecessary `act()` wrapping

## Output Format

```
## Test Review: [file]

### Score: X/10
### Coverage Gaps: [count]

[Detailed findings with line references and fix suggestions]
```
