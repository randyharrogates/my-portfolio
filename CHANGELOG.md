# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-08

### Added

- **(pages)** Resume page with embedded PDF viewer and download button
- **(pages)** Ecommerce project detail page for VietMala Eatery (VueJS)
- **(pages)** Holiday Booking project detail page (Flask, JavaScript, SQL)
- **(pages)** HRM System project detail page (React, Express, MongoDB, Docker)
- **(pages)** Multi-Agent RAG project detail page for Dating Plan AI Agents (LangGraph, FastAPI, Pinecone)
- **(pages)** Speech-to-Text project detail page (OpenAI Whisper, FastAPI, Docker)
- **(assets)** Resume PDF added to public directory for web access
- **(deps)** Added @testing-library/jest-dom and @testing-library/react dev dependencies

### Changed

- **(pages)** Refactored Projects page from expandable card grid to sub-tab navigation with nested routes
- **(pages)** Simplified main navigation — removed individual project tabs, consolidated all projects under single projects tab
- **(pages)** Removed redundant prompt-line headers and back buttons from CreditMemo, KybPipeline, and FineTuning pages
- **(routing)** Added wildcard route for projects and new resume tab in main navigation
- **(deps)** Downgraded react-router-dom from v7 to v6 for CRA compatibility
- **(docs)** Rewrote README.md with proper project documentation
- **(resume)** Updated resume content with Napshot Pte. Ltd. experience details
- **(test)** Updated App test to verify terminal app renders correctly

## [0.1.1] - 2026-03-08

### Added

- **(config)** Claude Code configuration with custom agents, skills, and commands
- **(docs)** Project documentation for coding standards, design philosophy, and project structure
- **(resume)** LaTeX resume source file

### Changed

- **(config)** Updated .gitignore with additional exclusions
- **(docs)** Updated CLAUDE.md with expanded project documentation
- **(resume)** Updated Resume.pdf

## [0.1.0] - 2026-03-07

### Added

- **(pages)** Terminal-themed portfolio with macOS window aesthetic, dark warm theme, and JetBrains Mono font
- **(pages)** Blog section with expandable post cards covering AI and Finance topics
- **(pages)** Credit Memo and KYB Pipeline project detail pages
- **(pages)** Full-viewport terminal with 2-column responsive layouts across all tabs
- **(deploy)** GitHub Actions workflow for automatic deployment to GitHub Pages
- **(scripts)** Launch script for dev server with auto-dependency installation
- **(docs)** CLAUDE.md with dev commands and architecture notes

### Fixed

- **(deploy)** GitHub Pages deployment switched to Actions-based deployment instead of branch-based
- **(deploy)** Added workflow_dispatch trigger and fixed Actions permissions
- **(scripts)** Launch script auto-installs dependencies if node_modules missing

### Changed

- **(pages)** Blog readability improvements with larger fonts, better contrast, and X source links
- **(pages)** Blog color contrast and visual hierarchy enhancements for accessibility
- **(pages)** Portfolio content updated with latest resume details and expanded tech stack
- **(resume)** Added resume to repository
