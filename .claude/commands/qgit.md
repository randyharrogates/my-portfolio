# QGIT - Git Commit Message Generation

## Purpose

Generate a properly formatted commit message based on the current staged changes, following Conventional Commits format.

## Instructions

When this command is invoked, follow this workflow:

### 1. Read Staged Files

First, examine what has been staged for commit:

```bash
git diff --staged
```

Also check recent commit messages for style consistency:

```bash
git log --oneline -10
```

Analyze:
- Which files were modified
- What changes were made
- The scope and impact of changes

### 2. Create Commit Message

#### Format Requirements

**MUST use Conventional Commits format**: https://www.conventionalcommits.org/en/v1.0.0

**MUST structure** commit message as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Relevant Types

- **feat**: New pages, components, UI features
- **fix**: Bug fixes in rendering, routing, styling
- **style**: CSS changes, layout adjustments, visual tweaks
- **refactor**: Code restructuring without changing functionality
- **perf**: Performance improvements (image optimization, lazy loading)
- **docs**: Documentation updates
- **chore**: Dependency updates, config changes, maintenance
- **test**: Adding or updating tests
- **build**: Build system or deployment changes
- **ci**: Changes to CI/CD configuration

#### Scope Guidelines

Common scopes for this project:

- **pages**: Changes to `src/pages/`
- **components**: Changes to shared components
- **styles**: CSS or styling changes
- **assets**: Changes to `public/` assets
- **deploy**: Deployment or CI changes
- **config**: Configuration changes (package.json, tsconfig, etc.)

#### Description Guidelines

- Use imperative mood: "add feature" not "added feature"
- Be concise but specific
- No period at the end
- Max 50 characters for subject line
- Start with lowercase (after type and scope)

#### Body Guidelines (Optional)

Include a body if:
- Changes are complex and need explanation
- Multiple related changes were made
- Context is needed for why changes were made

Format:
- Wrap at 72 characters
- Use bullet points for multiple items
- Explain the "why" not the "what"

#### Footer Guidelines (Optional)

Include footer for:
- Breaking changes: `BREAKING CHANGE: description`
- Issue references: `Closes #123`, `Fixes #456`

### 3. Validation Checklist

Before finalizing the commit message, verify:

- [ ] Follows Conventional Commits format
- [ ] Type is appropriate for the changes
- [ ] Scope accurately reflects changed area
- [ ] Description is imperative mood and concise
- [ ] Breaking changes are properly marked
- [ ] Multi-line messages are properly formatted

### 4. Execute the Commit

After generating the message, present it to the user for confirmation. If approved, execute:

```bash
git commit -m "$(cat <<'EOF'
<type>[scope]: <description>

<optional body>

<optional footer>
EOF
)"
```

For multi-line messages, use HEREDOC to preserve formatting.
