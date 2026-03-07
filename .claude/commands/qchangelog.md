# QCHANGELOG - Changelog Generation from Git Commits

## Purpose

Generate changelog entries and PR messages by comparing all changes (staged + committed) against the `master` branch. After updating CHANGELOG.md, automatically stage it and run `/qgit`.

## Instructions

When this command is invoked, follow this workflow:

### 1. Get All Changes vs Master Branch

**Step A: Get committed changes** — compare current branch against `master`:

```bash
git log --pretty=format:"%h|%s|%b" master..HEAD
```

Parse each commit into:
- **Hash**: Short commit hash
- **Subject**: Commit message subject (type, scope, description)
- **Body**: Commit message body (for BREAKING CHANGE detection)

**Step B: Get staged changes** — capture what is staged but not yet committed:

```bash
git diff --cached --stat
git diff --cached
```

Parse staged changes into:
- **Files changed**: List of modified/added/deleted files
- **Diff content**: Actual line-level changes for understanding intent
- **Inferred type**: Infer `feat`, `fix`, `chore`, etc. from the diff content and file paths

**Step C: Get pushed changes** — check what has been pushed to remote:

```bash
git log --pretty=format:"%h|%s|%b" master..origin/$(git branch --show-current) 2>/dev/null
```

Combine all three sources (staged, committed, pushed) into a unified set of changes. Deduplicate by commit hash where applicable. Staged changes that are not yet committed should be inferred from the diff.

### 2. Parse Conventional Commits

For each commit/change, extract:

```
<type>[optional scope]: <description>
```

**Valid types:**
- `feat`: New features (pages, components) -> "Added" category
- `fix`: Bug fixes -> "Fixed" category
- `style`: CSS/styling changes -> "Changed" category
- `perf`: Performance improvements -> "Changed" category
- `refactor`: Code refactoring -> "Changed" category
- `docs`: Documentation -> "Changed" category
- `chore`: Maintenance tasks -> "Changed" category
- `build`: Build system changes -> "Changed" category
- `test`: Test additions/updates -> Skip (internal only)
- `ci`: CI configuration -> Skip (internal only)

**Common scopes:** `pages`, `components`, `styles`, `assets`, `config`, `deploy`

**Breaking change detection:**
- Type with `!` suffix: `feat!:`, `fix!:`, etc.
- Body contains `BREAKING CHANGE:` (case-insensitive)

### 3. Check If Changes Already in Changelog

Before proceeding, verify that the identified changes aren't already documented in CHANGELOG.md:

1. For each commit hash identified in Step 1, search CHANGELOG.md:
```bash
grep -F "<commit_hash>" CHANGELOG.md
```

2. For staged changes (inferred from diff), search by description/scope:
```bash
grep -i "<inferred_description>" CHANGELOG.md
```

**Decision:**
- If **ALL identified changes are already in changelog**: Stop and inform user "All changes are already documented in CHANGELOG.md. No updates needed."
- If **SOME changes are already in changelog**: Identify only the NEW changes for processing (Step 4+)
- If **NO changes are in changelog**: Proceed with full changelog generation (Step 4+)

### 4. Categorize Changes

Group by changelog category:

```
categories:
  Added: []      # feat commits
  Fixed: []      # fix commits
  Changed: []    # style, perf, refactor, docs, chore, build
  Breaking: []   # Any commit with breaking change marker
```

**Entry format:**
- Include scope if present: `**(scope)** Description`
- No scope: Just description
- Keep original commit description (after type/scope)

### 5. Auto-Infer Semantic Version

**Step 1: Parse base version from CHANGELOG.md**

Find the last versioned entry (format: `## [X.Y.Z] - YYYY-MM-DD`):

```bash
grep -E "^## \[[0-9]+\.[0-9]+\.[0-9]+\]" CHANGELOG.md | head -1
```

**Step 2: Determine version bump**

Apply **highest priority** bump:

1. **BREAKING CHANGE** -> **MAJOR** bump (reset minor and patch to 0)
2. **feat commits** -> **MINOR** bump (reset patch to 0)
3. **fix/perf commits** -> **PATCH** bump
4. **Only chore/docs/refactor** -> **PATCH** bump

### 6. Check for Existing Entry with Today's Date

Search CHANGELOG.md for **versioned entries only** (ignore `[Unreleased]`):

```bash
grep -E "^## \[[0-9]+\.[0-9]+\.[0-9]+\] - $(date +%Y-%m-%d)" CHANGELOG.md
```

- If **found**: Update existing entry (append to categories)
- If **not found**: Create new entry at top

### 7. Update CHANGELOG.md

#### Case A: Create New Entry (Date Not Found)

Insert at top, after header, before all existing entries:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- **(scope)** Description of feature

### Fixed

- **(scope)** Bug fix description

### Changed

- **(scope)** Change description

### Breaking Changes

- **(scope)** Breaking change description
```

Only include categories that have commits. Empty categories are omitted.

#### Case B: Update Existing Entry (Date Found)

Append new commits to existing categories. Add new categories in standard order if needed (Added -> Fixed -> Changed -> Breaking).

### 8. Generate PR Message

```markdown
# Summary of Changes

This PR includes {count} changes across the following areas:

## Added
- **(scope)** Feature description

## Fixed
- **(scope)** Bug fix description

## Changed
- **(scope)** Change description

---

## Version

**Auto-inferred version**: {new_version} (from {base_version})
- **Bump type**: {MAJOR|MINOR|PATCH}
- **Reason**: {breaking changes|new features|bug fixes|maintenance}

---

## Detailed Commit List

{hash} - {type}({scope}): {description}
...
```

### 9. Stage CHANGELOG.md and Run /qgit

After updating CHANGELOG.md:

1. **Always stage the changelog**:
```bash
git add CHANGELOG.md
```

2. **Display the PR message** for the user to copy.

3. **Automatically invoke `/qgit`** to generate a commit message and commit the staged changes.

## Edge Cases

### No commits found (master..HEAD is empty)

Check for staged changes. If staged changes exist, proceed using only the staged diff. If nothing: "No commits or staged changes found. Nothing to changelog."

### Current branch IS master

Compare against last git tag:
```bash
git describe --tags --abbrev=0
git log <last-tag>..HEAD
```

### No versioned entries in CHANGELOG.md

Assume base version `0.0.0`.

### CHANGELOG.md doesn't exist

Create new file with Keep a Changelog header.

### Merge commits

Skip commits starting with "Merge pull request" or "Merge branch".

### Multiple scopes in same category

Group by scope for readability.

## Validation Checklist

Before finalizing, verify:

- [ ] All commits from `master..HEAD` are analyzed
- [ ] All staged changes are analyzed and included
- [ ] Conventional Commits parsing is accurate
- [ ] Breaking changes are detected
- [ ] Version bump follows Semantic Versioning
- [ ] Changelog categories follow Keep a Changelog format
- [ ] CHANGELOG.md is staged via `git add`
- [ ] `/qgit` is invoked after staging
