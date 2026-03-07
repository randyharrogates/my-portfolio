---
name: qplan
description: Validate implementation plans against codebase patterns. Use when user types 'qplan' OR when an implementation plan needs validation. Analyzes consistency with React component patterns, routing conventions, and terminal aesthetic.
allowed-tools: Read, Grep, Glob
---

# QPLAN - Plan Validation Workflow

## Purpose

This skill activates when the user types "qplan" to validate an implementation plan against existing codebase patterns.

## Instructions

When this skill is invoked, validate the proposed plan against these criteria:

### 1. Component Structure Consistency

- [ ] New components follow functional component pattern with hooks
- [ ] TypeScript interfaces defined for all props and data types
- [ ] State management uses useState (no over-engineering with external state libs)
- [ ] Effects have proper dependency arrays

### 2. Routing Pattern Adherence

- [ ] New pages added to both TABS array AND Routes in `App.tsx`
- [ ] HashRouter maintained (no BrowserRouter)
- [ ] Route paths are consistent with existing naming

### 3. Styling Pattern Adherence

- [ ] CSS co-located with component (ComponentName.css)
- [ ] Terminal aesthetic maintained (dark theme, monospace, prompt-style)
- [ ] Bootstrap utility classes used where appropriate
- [ ] Responsive design considered

### 4. Reuse of Existing UI Patterns

- [ ] Existing CSS classes reused (callout-box, prompt-line, section-header)
- [ ] Consistent page layout structure across pages
- [ ] Bootstrap grid used for responsive layouts
- [ ] No reinvention of existing patterns

### 5. GitHub Pages Compatibility

- [ ] No server-side rendering or API routes
- [ ] Asset paths use `process.env.PUBLIC_URL`
- [ ] HashRouter for all routing
- [ ] Static content only (or client-side API calls)

### 6. KISS/YAGNI/DRY Check

- [ ] Plan doesn't introduce unnecessary complexity
- [ ] No speculative features beyond what's requested
- [ ] Common patterns extracted, not duplicated

## Output Format

```
## Plan Validation Report

### Compliance: ✓ Pass / ✗ Fail

### Findings
1. [Finding with recommendation]
2. [Finding with recommendation]

### Risks
- [Any identified risks or concerns]

### Verdict
[Approve / Approve with changes / Reject with reasons]
```
