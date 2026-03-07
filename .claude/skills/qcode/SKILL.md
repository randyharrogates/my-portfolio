---
name: qcode
description: Implement planned changes with quality gates. Use when user types 'qcode' OR when ready to execute implementation. Follows qthink rules, coding best practices, and runs npm build and test quality gates.
---

# QCODE - Implementation Workflow

## Purpose

This skill activates when the user types "qcode" to signal that you should implement the discussed plan while following all coding best practices and quality gates.

## Instructions

When this skill is invoked, you MUST follow this workflow:

### 1. Rules

Before and during implementation:

- Do not overengineer your edits
- Do not introduce silent fallback errors
- Follow KISS/YAGNI/DRY principles
- Imports grouped: React/libraries, local modules, CSS
- Functional components with hooks only
- TypeScript interfaces at top of file, no `any`
- Always run a sub-agent to check your code after implementation

### 2. Coding Best Practices

- **C-1**: Follow TDD when appropriate: write failing test → implement → validate
- **C-2**: Use existing domain vocabulary and patterns for consistency
- **C-3**: Co-locate CSS with components
- **C-4**: Use `process.env.PUBLIC_URL` for asset paths
- **C-5**: Maintain terminal aesthetic (dark theme, monospace, prompt-style)
- **C-6**: HashRouter for all routing (GitHub Pages requirement)
- **C-7**: Remove unused code — don't comment it out
- **C-8**: No TODOs — all code must be production-ready
- **C-9**: Semantic HTML + ARIA attributes for accessibility

### 3. Quality Gates

After implementation, run these checks:

#### Step 1: Build Check

```bash
npm run build
```

- This MUST pass without errors
- Validates TypeScript compilation and bundling

#### Step 2: Test Check

```bash
npm test -- --watchAll=false
```

- All tests MUST pass
- Fix any failing tests before proceeding

### 4. Implementation Checklist

Before marking implementation complete, verify:

- [ ] All tests pass
- [ ] `npm run build` succeeds
- [ ] TypeScript types are complete and correct (no `any`)
- [ ] CSS co-located with components
- [ ] Terminal aesthetic maintained
- [ ] Responsive design works
- [ ] No hardcoded secrets
- [ ] No TODO comments remain
- [ ] Imports grouped properly
- [ ] Accessibility attributes present
- [ ] HashRouter compatibility maintained

## Expected Output

After running this skill, you should:

- Have implemented the planned changes
- Pass all quality gates (build, test)
- Have production-ready code with no TODOs
- Confirm all files follow project conventions
- Report any issues encountered during implementation
- Have had a sub-agent validate your code
