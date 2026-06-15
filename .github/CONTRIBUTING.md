# Contributing

Thanks for your interest in contributing to the chatbot template! Here's how to get started.

## Development

1. Fork and clone the repository
2. Install dependencies with `pnpm install`
3. Create a new branch from `demo` for your work

## Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and releases. When you make a change that should be included in the next release, you need to add a changeset.

### Adding a changeset

Run the following command from the root of the repository:

```bash
pnpm changeset
```

You'll be prompted to:

1. **Select the bump type** — `patch` for bug fixes, `minor` for new features, `major` for breaking changes
2. **Write a summary** — a short description of your change that will appear in the changelog

This creates a Markdown file in the `.changeset` directory. Commit this file along with your code changes.

### When to add a changeset

- Bug fixes, new features, breaking changes, dependency updates, and other user-facing changes should include a changeset
- Internal refactors, test-only changes, and documentation updates typically don't need one

### What happens next

When your changes land on `main`, the release workflow picks up any changeset files and opens a "Version Package" PR. Merging that PR bumps the version, updates the changelog, and creates a GitHub Release.

## Pull requests

- Open PRs against the `demo` branch
- Include a changeset if your change affects the release
- Keep PRs focused — one feature or fix per PR
