---
name: qthink
description: Ultra-deep evaluation and planning workflow. Use when user types 'qthink' OR when complex tasks need comprehensive analysis before implementation. Performs comprehensive analysis, evaluates alternatives, identifies ambiguities, and follows strict implementation principles (KISS/YAGNI/DRY) before making any edits.
---

# QTHINK - Ultra-Deep Evaluation Workflow

## Purpose

This skill activates when the user types "qthink" to signal that you should perform ultra-deep analysis and evaluation before proceeding with any implementation.

## Core Principles

When this skill is invoked, you MUST follow these principles:

### What QTHINK Means - Complete Checklist

1. **Ultra think** on the given context and instructions then evaluate:
   - Is it possible to implement?
   - Are there better alternatives?
   - Are there any things that need clarification from me?

2. **Clarify with me** if there are any ambiguities
   - Do NOT proceed with unclear requirements
   - Ask specific questions about implementation choices
   - Confirm assumptions before coding

3. **Do not do edits or create new documents** unless specifically instructed or allowed by user
   - This is an ANALYSIS phase, not implementation
   - Only create/edit when explicitly given permission

4. **Do not overengineer** your edits and do not introduce silent fallback errors
   - Keep solutions simple and focused
   - No unnecessary abstraction
   - Fail loudly with clear error messages, never silently

5. **Always follow KISS/YAGNI/DRY principles**:
   - **KISS**: Keep It Simple, Stupid — straightforward solutions
   - **YAGNI**: You Aren't Gonna Need It — no speculative features
   - **DRY**: Don't Repeat Yourself — extract common patterns

6. **TypeScript/React conventions**:
   - Imports grouped: React/libraries, then local modules, then CSS
   - Functional components with hooks only
   - Interfaces defined at top of file
   - No `any` types — use proper typing

7. **Component patterns**:
   - Single-responsibility components
   - Hooks for reusable logic (custom hooks)
   - Derive state where possible instead of storing
   - Correct useEffect dependency arrays

## Ultra-Think Analysis Framework

When performing ultra-deep evaluation, follow this framework:

### 1. Context Analysis

**Understand the Request**:
- What exactly is being asked?
- What is the end goal?
- What are the constraints?
- What is the current state of the system?

**Identify Assumptions**:
- What am I assuming about the requirements?
- Are these assumptions valid?
- What needs to be confirmed with the user?

### 2. Possibility Evaluation

**Technical Feasibility**:
- Can this be implemented with current architecture?
- Are all necessary components/libraries available?
- Are there any technical blockers?

**Deployment Constraints**:
- Will this work with GitHub Pages (static only)?
- Does it maintain HashRouter compatibility?
- Are asset paths correct (`process.env.PUBLIC_URL`)?

### 3. Alternative Approaches

**Brainstorm Alternatives**:
- List at least 2-3 different approaches
- Consider simple vs complex solutions
- Consider existing patterns in the codebase

**Evaluate Trade-offs**:

For each alternative, assess:
- **Pros**: What are the benefits?
- **Cons**: What are the drawbacks?
- **Complexity**: How complex is the implementation?
- **Maintainability**: How easy to maintain long-term?
- **Alignment**: How well does it align with existing patterns?

**Recommend Best Approach**:
- Which approach is best and why?
- Does it follow KISS/YAGNI/DRY principles?
- Is it consistent with existing codebase patterns?

### 4. Ambiguity Identification

**Questions to Ask User**:
- What are the unclear requirements?
- What are the implementation choices that need user input?
- What are the edge cases that need handling?

**Clarification Format**:

```
I need clarification on the following before proceeding:

1. [Specific question about requirement]
   - Option A: [description]
   - Option B: [description]
   - Recommendation: [your recommendation with rationale]

2. [Specific question about implementation]
   - Current approach: [description]
   - Alternative: [description]
   - Trade-offs: [comparison]
```

### 5. Design Principles Validation

**KISS Compliance**:
- [ ] Solution is straightforward and easy to understand
- [ ] No unnecessary abstraction
- [ ] Code is readable and maintainable

**YAGNI Compliance**:
- [ ] No speculative features added
- [ ] Only implements what is explicitly required
- [ ] No "future-proofing" beyond reasonable bounds

**DRY Compliance**:
- [ ] No code duplication
- [ ] Common patterns extracted to reusable components/hooks
- [ ] Configuration not hardcoded in multiple places

**React/TypeScript Compliance**:
- [ ] Functional components with proper hooks
- [ ] TypeScript interfaces for all props and data
- [ ] Terminal aesthetic maintained
- [ ] HashRouter and GitHub Pages compatible

## Analysis Output Format

Provide your ultra-think analysis in this format:

```
## Ultra-Think Analysis

### 1. Context & Requirements
[Clear statement of what is being asked and current context]

### 2. Feasibility Assessment
✓ Technically feasible / ✗ Has blockers
[Explanation of technical feasibility]

### 3. Alternative Approaches

**Option A: [Name]**
- Pros: [list]
- Cons: [list]
- Complexity: Low/Medium/High
- Alignment with existing patterns: Good/Fair/Poor

**Option B: [Name]**
- Pros: [list]
- Cons: [list]
- Complexity: Low/Medium/High
- Alignment with existing patterns: Good/Fair/Poor

**Recommendation**: [Which option and why]

### 4. Clarification Needed
[List of questions for user, or "None - requirements are clear"]

### 5. Design Principles Check
- KISS: ✓/✗ [explanation]
- YAGNI: ✓/✗ [explanation]
- DRY: ✓/✗ [explanation]

### 6. Next Steps
[What happens after user responds to clarifications]
```

## Expected Output

After running this skill, you should:

- Have performed comprehensive analysis
- Identified all ambiguities and asked for clarification
- Evaluated multiple approaches with clear trade-offs
- Validated design principles compliance
- **NOT created or edited any files** (unless explicitly permitted)
- Be ready to proceed with implementation once user approves
