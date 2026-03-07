---
name: qcheck
description: Comprehensive code review for major changes. Use when user types 'qcheck' OR when major code changes need review. Performs skeptical senior engineer review of React/TypeScript code for component quality, type safety, styling, accessibility, and test coverage.
---

# QCHECK - Comprehensive Code Review

## Purpose

This skill activates when the user types "qcheck" to perform a comprehensive, skeptical review of all major code changes.

## Instructions

When this skill is invoked, review ALL changed files as a skeptical senior frontend engineer:

### 1. Component Quality

- [ ] Functional components with proper hooks usage
- [ ] Props typed with TypeScript interfaces (no `any`)
- [ ] State management appropriate (useState, not over-engineered)
- [ ] useEffect dependency arrays correct
- [ ] No unnecessary re-renders
- [ ] Single-responsibility principle followed
- [ ] Event handlers properly typed

### 2. TypeScript Compliance

- [ ] No `any` types anywhere
- [ ] Interfaces defined at top of file
- [ ] Proper use of `interface` vs `type`
- [ ] API response types defined
- [ ] Generic types used appropriately

### 3. CSS & Styling Quality

- [ ] CSS co-located with component
- [ ] Terminal aesthetic maintained (dark theme, monospace, green/amber accents)
- [ ] Bootstrap utility classes used where appropriate
- [ ] Responsive design (mobile-first)
- [ ] No inline styles unless dynamic
- [ ] Existing CSS patterns reused (callout-box, prompt-line)

### 4. Accessibility

- [ ] Semantic HTML elements used
- [ ] ARIA attributes where needed
- [ ] Keyboard navigation preserved
- [ ] Color contrast sufficient (WCAG AA)
- [ ] Alt text for images

### 5. Performance

- [ ] Images optimized (WebP format)
- [ ] No unnecessary API calls
- [ ] Components don't re-render excessively
- [ ] Assets use `process.env.PUBLIC_URL`

### 6. Test Quality

- [ ] Tests exist for new/changed components
- [ ] React Testing Library patterns used (screen queries)
- [ ] User-centric testing (getByRole > getByTestId)
- [ ] Async operations tested with waitFor/findBy
- [ ] Edge cases covered

### 7. General

- [ ] No TODOs remain
- [ ] No hardcoded secrets
- [ ] Imports grouped properly (React, libraries, local, CSS)
- [ ] Unused code removed
- [ ] HashRouter and GitHub Pages compatibility maintained

## Output Format

```
## Code Review Report

### Overall: X/10

### Critical Issues
[Must fix before merge]

### Recommendations
[Should fix, but not blocking]

### Positive Notes
[What was done well]
```
