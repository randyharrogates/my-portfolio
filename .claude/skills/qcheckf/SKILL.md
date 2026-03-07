---
name: qcheckf
description: Function-specific code review. Use when user types 'qcheckf' OR when specific functions/components need detailed review. Performs skeptical review of React components, hooks, event handlers, and TypeScript typing.
---

# QCHECKF - Function/Component Review

## Purpose

This skill activates when the user types "qcheckf" to perform a detailed review of specific functions or components.

## Instructions

When this skill is invoked, perform a skeptical review of the targeted function/component:

### 1. React Component Review

- [ ] Single responsibility — does one thing well
- [ ] Props interface defined and complete
- [ ] No unnecessary state (derive where possible)
- [ ] useEffect cleanup functions where needed
- [ ] Proper conditional rendering patterns
- [ ] No logic in JSX that should be extracted

### 2. Custom Hook Review

- [ ] Follows `use` naming convention
- [ ] Returns stable references (useCallback/useMemo where needed)
- [ ] Proper dependency arrays
- [ ] Error handling included
- [ ] Reusable across components

### 3. TypeScript Function Typing

- [ ] Parameters properly typed (no `any`)
- [ ] Return type explicit or inferable
- [ ] Event handlers use React event types
- [ ] Generics used appropriately
- [ ] Null/undefined handled

### 4. Event Handler Patterns

- [ ] Properly typed (React.MouseEvent, React.ChangeEvent, etc.)
- [ ] No inline arrow functions in JSX for complex logic
- [ ] Keyboard events handle correct keys
- [ ] preventDefault/stopPropagation used appropriately

### 5. State Management

- [ ] useState for simple local state
- [ ] State updates are immutable
- [ ] No derived state stored (compute from existing state)
- [ ] Loading/error states handled

### 6. CSS Class Naming

- [ ] Descriptive, kebab-case class names
- [ ] Consistent with existing patterns
- [ ] No conflicting global styles
- [ ] Terminal aesthetic maintained

## Output Format

```
## Function/Component Review

### Target: [function/component name]
### Rating: X/10

### Issues Found
1. [Issue with line reference and fix suggestion]

### Improvements
1. [Suggestion with rationale]
```
