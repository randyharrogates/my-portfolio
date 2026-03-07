---
name: qnew
description: Review best practices and architecture guidelines. Use when user types 'qnew' OR when starting new work and needing to understand project patterns. Reviews CLAUDE.md, project structure, coding standards, and design philosophy.
allowed-tools: Read, Grep, Glob
---

# QNEW - Review Project Guidelines

## Purpose

This skill activates when the user types "qnew" to review all project guidelines before starting new work.

## Instructions

When this skill is invoked, read and internalize these documents:

### 1. Project Conventions

Read `CLAUDE.md` in the project root for:
- Available commands (npm start, test, build, deploy)
- Architecture overview (React 19 + TypeScript, HashRouter, terminal aesthetic)
- Page structure and routing patterns
- Deployment to GitHub Pages

### 2. Project Structure

Read `.claude/docs/PROJECT_STRUCTURE.md` for:
- Directory layout (src/pages/, public/, .github/workflows/)
- Tech stack details
- Key patterns (TABS + Route for adding pages, PUBLIC_URL for assets)

### 3. Coding Standards

Read `.claude/docs/CODING_STANDARDS.md` for:
- Component patterns (functional components, hooks, TypeScript interfaces)
- Styling rules (co-located CSS, Bootstrap utilities, terminal aesthetic)
- Routing rules (HashRouter, TABS array)
- Testing patterns (Jest + React Testing Library)
- Accessibility requirements

### 4. Design Philosophy

Read `.claude/docs/DESIGN_PHILOSOPHY.md` for:
- Terminal/CLI aesthetic principles
- Component simplicity goals
- Reusable UI patterns (callout-box, prompt-line, etc.)
- GitHub Pages constraints
- Responsive design approach

## Expected Output

After reading all documents, provide a brief summary confirming:
- Understanding of the terminal aesthetic and its patterns
- Key conventions for adding new pages (TABS + Route)
- TypeScript and component standards
- Deployment constraints (GitHub Pages, HashRouter)
- Ready to proceed with implementation
