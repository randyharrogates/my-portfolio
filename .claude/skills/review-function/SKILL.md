---
name: review-function
description: Apply React/TypeScript best practices checklist to evaluate component and function quality. Use when user asks to review/validate functions OR when analyzing code quality for readability, typing, hooks, and naming conventions.
allowed-tools: Read, Grep, Glob
---

# Review Function - React/TypeScript Quality Checklist

## Purpose

Evaluate the quality of React components, hooks, and utility functions against best practices.

## Checklist

### Naming & Readability

- [ ] Component names are PascalCase and descriptive
- [ ] Hook names start with `use`
- [ ] Event handlers named `handleX` or `onX`
- [ ] Variables and functions use camelCase
- [ ] Names convey intent without comments

### Component Structure

- [ ] Single responsibility — component does one thing
- [ ] Props interface defined at top of file
- [ ] Reasonable size (< 150 lines for components)
- [ ] Logic extracted to custom hooks when reusable
- [ ] No nested component definitions

### TypeScript Quality

- [ ] All parameters and return types properly typed
- [ ] No `any` types
- [ ] Event handlers use React event types
- [ ] Generics used where appropriate
- [ ] Null/undefined explicitly handled

### Hooks Usage

- [ ] useState for simple local state only
- [ ] useEffect has correct dependencies
- [ ] useEffect cleanup for subscriptions/timers
- [ ] useCallback/useMemo only when needed (not premature)
- [ ] Custom hooks follow composition pattern

### Error Handling

- [ ] API errors caught and displayed to user
- [ ] Loading states handled
- [ ] Empty states handled
- [ ] Error boundaries for critical sections

### Performance

- [ ] No unnecessary re-renders from unstable references
- [ ] Heavy computations memoized if needed
- [ ] Images optimized (WebP, proper sizing)
- [ ] No synchronous blocking operations

## Output Format

```
## Function Review: [name]

### Score: X/10
### Issues: [count]

[Detailed findings with line references and fix suggestions]
```
