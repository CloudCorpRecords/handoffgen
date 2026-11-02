# handoffgen

An agent that stops mid-task leaves a trail scattered across
three places: the commits it just landed, the pull requests
still waiting on review, and the TODOs noted along the way.
The next agent picking the work up has to reconstruct that
trail before it can safely continue. handoffgen turns the
pieces you hand it into one cold-start brief: a short
markdown document a fresh agent can read top to bottom and
then start correctly, without re-deriving state from
scratch.

You supply the facts. Recent commits are rendered in input
order, each hash in backticks next to its subject. Open pull
requests follow in input order too, and any pull request
flagged as blocked carries a visible `[blocked]` marker so
nobody wastes a turn rediscovering the stall. TODOs are
banded by priority — every high-priority item first, then
normal, then low, with the order you gave preserved inside
each band — high items are prefixed `[high]`, and an item
that names where it lives (a file path, say) gets that
source in parentheses after its text. If you add a free-text
context note, it opens the brief verbatim, exactly as you
wrote it; a note that is empty or only whitespace counts as
no note at all, and the same rule decides whether a TODO's
source appears.

Empty inputs stay honest instead of vanishing. A brief built
with no commits says "No commits supplied." under its
heading; no pull requests and no TODOs get their own
matching lines. Alongside the markdown, the result carries
the counts behind it: commits, open pull requests, how
many of those are blocked, TODOs, and how many TODOs are
high priority. Nothing is fetched, executed, or inferred —
no repository is read, no hosting service is queried, and
no state is guessed at. The brief is exactly the facts you
supplied, arranged for a cold reader.

Malformed input — a missing or non-array `commits`,
`open_prs`, or `todos`, an item that is not an object, an
empty or non-string hash, subject, title, or TODO text, a
pull request number that is not an integer of at least 1, a
non-boolean `blocked`, a non-string `source` or `context`,
or a `priority` outside `"high"`, `"normal"`, and `"low"` —
is a validation error naming the offending path, with no
partial result. Unknown extra fields are ignored, including
inside items. An absent priority counts as `"normal"`, and
an absent `blocked` counts as false.

## CLI

```bash
npx @reneturcios/handoffgen build --input args.json
npx @reneturcios/handoffgen --version
```

`args.json` contains the full arguments object:

```json
{
  "context": "Parser is stable; cache work is mid-flight.",
  "commits": [
    { "hash": "abc1234", "subject": "Add parser" },
    { "hash": "def5678", "subject": "Fix flaky test" }
  ],
  "open_prs": [
    { "number": 12, "title": "Wire up cache" },
    { "number": 13, "title": "Bump deps", "blocked": true }
  ],
  "todos": [
    {
      "text": "Write migration notes",
      "source": "docs/migration.md",
      "priority": "high"
    },
    { "text": "Tidy README" },
    { "text": "Polish icons", "priority": "low" }
  ]
}
```

The result is printed as JSON:

```json
{
  "brief": "# Handoff brief\n\n## Context\nParser is stable; cache work is mid-flight.\n\n## Recent commits\n- `abc1234` Add parser\n- `def5678` Fix flaky test\n\n## Open pull requests\n- #12 Wire up cache\n- #13 Bump deps [blocked]\n\n## TODOs\n- [high] Write migration notes (docs/migration.md)\n- Tidy README\n- Polish icons",
  "counts": {
    "commits": 2,
    "open_prs": 2,
    "blocked_prs": 1,
    "todos": 3,
    "high_priority_todos": 1
  }
}
```

Exit codes: `0` on success, `1` on a runtime error
(including an unreadable or invalid input file, or invalid
input), `2` on a usage error.

## MCP server

```bash
npx -y @reneturcios/handoffgen mcp
```

MCP client config:

```json
{
  "mcpServers": {
    "handoffgen": {
      "command": "npx",
      "args": ["-y", "@reneturcios/handoffgen", "mcp"]
    }
  }
}
```

### Tools

- `build_handoff_brief` — Build a cold-start handoff brief
  for the next agent from caller-supplied commits, open
  pull requests, and TODO items.
  - `commits` (array, required, may be empty) — recent
    commits in input order; each item is `{hash, subject}`
    with both strings non-empty
  - `open_prs` (array, required, may be empty) — open pull
    requests in input order; each item is `{number, title,
    blocked?}` with `number` an integer of at least 1,
    `title` non-empty, and `blocked` a boolean when present
  - `todos` (array, required, may be empty) — outstanding
    TODO items; each item is `{text, source?, priority?}`
    with `text` non-empty, `source` a string when present,
    and `priority` one of `"high"`, `"normal"`, `"low"`
    when present (absent means `"normal"`)
  - `context` (string, optional) — free-text current-state
    note, included verbatim when it counts as supplied

  Returns `{brief, counts}`, where `counts` is `{commits,
  open_prs, blocked_prs, todos, high_priority_todos}`.

## Docker

```bash
docker run -i ghcr.io/cloudcorprecords/handoffgen
docker run --rm -v "$PWD:/w" ghcr.io/cloudcorprecords/handoffgen build --input /w/args.json
```

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # tsx --test test/*.test.ts (pure local, no network)
npm run dev     # run the CLI from source
```

## License

MIT — Copyright (c) 2026 Rene Turcios
