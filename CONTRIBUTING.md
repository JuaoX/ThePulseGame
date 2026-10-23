# Contributing

## Commit messages

Use Conventional Commits 1.0.0 for every new commit. Write messages in
English, use imperative wording, and describe the concrete change.

Format: `type(scope): concise description`

- Use `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`,
  `chore`, or `revert` according to the actual change.
- Use a meaningful scope when useful, such as `ui`, `crossword`, `audio`,
  `collection`, or `contributing`.
- Keep the subject concise, preferably within 72 characters, with no
  trailing period. Avoid vague subjects such as "update" or timestamps.
- Keep commits cohesive. Separate unrelated changes and documentation.
- Explain motivation or behavior in the body when necessary; wrap prose
  near 72 characters. Report only checks actually performed.
- Use `!` and a `BREAKING CHANGE:` footer only for an actual breaking change.
- Do not rewrite published history to rename older commits.

Examples:

```text
feat(crossword): track completed editions
fix(audio): resume playback after user interaction
docs(contributing): define conventional commit guidelines
```
