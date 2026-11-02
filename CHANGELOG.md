# Changelog

## 0.1.0 (2026-10-27)

- Initial release: `build_handoff_brief` MCP tool and
  `build` CLI command rendering a cold-start handoff brief
  for the next agent from caller-supplied commits, open
  pull requests, and TODO items, plus an optional free-text
  context note. Pure rendering over supplied facts: nothing
  is fetched, executed, or inferred.
- Pinned brief shape: `# Handoff brief` heading, an
  optional `## Context` section (present only when the
  context counts as supplied, rendered verbatim), `## Recent
  commits`, `## Open pull requests`, and `## TODOs`
  sections separated by exactly one blank line, with no
  trailing newline and the fallback lines "No commits
  supplied.", "No open pull requests supplied.", and
  "No TODOs supplied." for empty sections.
- Pinned TODO rendering: banded high, then normal, then
  low with input order preserved inside each band, a
  `[high]` prefix for high-priority items only, and a
  `(<source>)` suffix only when the source counts as
  supplied. Blocked pull requests carry a ` [blocked]`
  suffix. Counts report commits, open PRs, blocked PRs,
  TODOs, and high-priority TODOs.
- Path-naming validation errors for malformed input,
  including the required `commits`, `open_prs`, and `todos`
  arrays and every field inside their items.
