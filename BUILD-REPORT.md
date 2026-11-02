# handoffgen — Build Report

MCP Rebuild 1000, Batch 18. Original program build from the
packages-100 plan (cluster C #34), built from the spec in
`~/workspace/mcp-rebuild-100/specs-batch18/handoffgen.md`
(read first). There is no external original; the tool surface
is the program's defined spec. Local build only — nothing
pushed or published.

Identity: repo `handoffgen`, npm `@reneturcios/handoffgen`,
MCP name `io.github.CloudCorpRecords/handoffgen`, version
`0.1.0`, bin `handoffgen` → `dist/cli.js`.

## Files created (19/19 per TEMPLATE.md checklist)

- `package.json`, `server.json` (description "Build a
  cold-start handoff brief for the next agent from supplied
  commits, PRs, and TODOs." — 90 chars, verified by count;
  npm entry carries `version: 0.1.0`; OCI entry
  `ghcr.io/cloudcorprecords/handoffgen:0.1.0` carries **no**
  `version` field), `Dockerfile` (node:20-alpine two-stage,
  label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/handoffgen"`),
  `tsconfig.json` (verified byte-identical to the reference),
  `.gitignore`, `LICENSE` (MIT, Copyright (c) 2026 Rene
  Turcios), `README.md` (fresh text), `CHANGELOG.md` (single
  0.1.0 entry, 2026-10-27), `package-lock.json` (Route 3,
  see below)
- `src/index.ts`, `src/cli.ts` (`build --input <args.json>`
  where the file holds the full arguments object, `mcp`,
  `--version`; exit 2 usage / 1 runtime error, argument
  validation before any file read), `src/mcp.ts`,
  `src/types.ts`, `src/handoffgen.ts` (core,
  `VERSION = "0.1.0"`, `formatPayload`)
- `test/handoffgen.test.ts`
- `.github/workflows/{ci,publish,publish-container,registry-publish}.yml`
  (publish-container `IMAGE = ghcr.io/cloudcorprecords/handoffgen`,
  smoke-test server-name assertion `handoffgen`)

Plus the parity fixture at
`harness/fixtures/handoffgen-tools-original.json`, labelled
as a program spec from the packages-100 plan cluster C #34.

## Tools implemented (1)

- `build_handoff_brief` — arguments: `commits` (array,
  required, may be empty; items `{hash, subject}`, both
  non-empty strings), `open_prs` (array, required, may be
  empty; items `{number, title, blocked?}` with `number` an
  integer >= 1, `title` a non-empty string, and `blocked` a
  boolean when present, absent meaning false), `todos`
  (array, required, may be empty; items `{text, source?,
  priority?}` with `text` a non-empty string, `source` a
  string when present, and `priority` one of the pinned
  enum values `"high"`, `"normal"`, `"low"` when present,
  absent meaning `"normal"`), and `context` (string,
  optional). Required is exactly
  `["commits", "open_prs", "todos"]`. The `priority` field
  carries the pinned values as an `enum` array identically
  in the fixture and in `src/mcp.ts`.

  Rendering is pinned: the brief's lines are joined with
  `"\n"`, sections are separated by exactly one blank line,
  and there is no trailing newline. Line 1 is
  `# Handoff brief`; a `## Context` section follows only
  when the context counts as supplied (absent, empty, or
  whitespace-only counts as not supplied — a pinned
  judgement call), rendered verbatim. Then `## Recent
  commits` with one "- `<hash>` <subject>" line per commit
  in input order, or the single line "No commits supplied.";
  then `## Open pull requests` with one "- #<number>
  <title>" line per PR in input order plus the suffix
  " [blocked]" iff `blocked` is true, or "No open pull
  requests supplied."; then `## TODOs` with TODOs banded
  high, then normal, then low (stable inside each band),
  each line "- " plus "[high] " iff the priority is "high",
  plus the text, plus " (<source>)" iff the source counts
  as supplied (absent, empty, or whitespace-only counts as
  not supplied — a pinned judgement call), or "No TODOs
  supplied.".

  Returns `{brief, counts}`, where `counts` is `{commits,
  open_prs, blocked_prs, todos, high_priority_todos}`: the
  input array lengths, the number of PRs with `blocked`
  true, and the number of TODOs with priority `"high"`.

  The fixture literal
  (`harness/fixtures/handoffgen-tools-original.json`) and
  the `src/mcp.ts` literal are identical, with no `$schema`
  and no `additionalProperties` — confirmed by the parity
  run below.

## Implementation notes

- `src/mcp.ts` uses the SDK's low-level `Server` with an
  explicit inputSchema literal exactly matching the
  fixture, per the standing fleet rule (no McpServer/zod
  schema conversion). Every `tools/call` is validated by
  the core itself, so the MCP and CLI paths share one
  validation implementation; the core takes the full
  arguments object.
- Validation is path-naming and total: a missing or
  non-array `commits` / `open_prs` / `todos`; an item that
  is not an object; a missing, empty, or non-string `hash`,
  `subject`, `title`, or `text`; a `number` missing,
  non-integer, or < 1; a `blocked` present but not a
  boolean; a `source` present but not a string; a
  `priority` present but not one of the three pinned
  values; or a `context` present but not a string throws an
  Error naming the offending path and produces no partial
  result (MCP: `isError`; CLI: exit 1). Unknown extra
  fields are ignored, including inside items; a non-object
  top-level argument is treated as {}.
- Banding is implemented as three order-preserving filters
  (high, normal, low) concatenated, so stability inside a
  band holds by construction rather than by sort
  implementation details.

## Verification (foreground, this session)

- `npm test` (`tsx --test test/*.test.ts`): **53 tests,
  53 pass, 0 fail** — the full brief with every section
  populated compared as an exact string plus its counts;
  no trailing newline and exactly one blank line between
  sections; context present, absent, empty, and
  whitespace-only (the dedicated judgement test), plus a
  supplied context rendered verbatim with surrounding
  spaces and an internal newline; commits and pull
  requests each proven to render in input order rather
  than sorted; the `[blocked]` suffix for `blocked` true
  and its absence for false and for absent; TODO banding
  high → normal → low with stability inside each band;
  the `[high]` prefix for high priority only; an absent
  priority defaulting to the normal band; the source
  suffix present, absent, empty, and whitespace-only (the
  dedicated judgement test), rendered verbatim, and ordered
  after the `[high]` prefix; all three empty-section
  fallback lines individually, together, and together with
  a context; counts including `blocked_prs` and
  `high_priority_todos` over mixed input, all-zero counts,
  and high-priority counting scoped to explicit `"high"`;
  and every validation path (each required array missing
  and non-array, non-object items at named indexes, hash /
  subject / title / text missing, empty, and non-string,
  number missing, fractional, string, boolean, null, zero,
  and negative plus the valid boundary at exactly 1,
  blocked non-boolean, source non-string, priority outside
  the enum including case variants, context non-string,
  non-object top-level treated as {}, unknown extras
  ignored including inside items, and no partial result).
- `npx tsc --noEmit` → exit 0; `npm run build` produced
  `dist/` with all 15 outputs.
- `dist/cli.js --version` → `0.1.0`; unknown command exits
  2 with usage; `build` with no `--input` exits 2;
  `build --input <missing file>` exits 1 naming the file;
  `build --input <valid file>` exits 0 and prints the
  hand-checked brief (context section, two commits, PR #13
  flagged `[blocked]`, the high TODO first with its
  `[high]` prefix and source suffix) and counts
  `{commits: 2, open_prs: 2, blocked_prs: 1, todos: 3,
  high_priority_todos: 1}` for the full example input;
  `build --input <invalid file>` (`open_prs[0].number: 0`)
  exits 1 with `open_prs[0].number must be an integer >= 1`.
- Parity: `harness/parity.py` vs
  `harness/fixtures/handoffgen-tools-original.json` →
  **PASS, parity 100.0, identical_tools 1/1** (run with
  the rebuild path as an absolute path; the harness does
  not expand a `~` inside the quoted stdio command
  string). Report saved under `parity-out/`.

## Lockfile status

`package-lock.json` generated clean via Route 3 (in the
build directory with no `node_modules` present, offline
`npm install --package-lock-only --ignore-scripts
--offline`), verified: parses, name
`@reneturcios/handoffgen`, **128 package entries**.
Resolved versions match the sibling reference tree
(`@modelcontextprotocol/sdk` 1.32.2, `zod` 3.25.76,
`tsx` 4.23.15, `typescript` 5.9.3, `@types/node`
20.19.43). The subsequent offline
`npm install --ignore-scripts --offline`, build, tests,
and parity all ran against this lockfile's tree.

## Gaps / honest notes

- **Spec ambiguities found and pinned:** (1) The spec pins
  when a TODO `source` counts as supplied (non-empty after
  the whitespace check) but does not say whether a supplied
  source is trimmed before rendering; by analogy with the
  context rule, which the spec states explicitly as
  rendered verbatim and never trimmed, a supplied source is
  rendered **verbatim** inside the parentheses, and a
  dedicated test pins it (`" docs/notes.md "` renders as
  `( docs/notes.md )`). (2) The spec groups each field's
  validation failures ("missing, empty, or non-string";
  "missing, non-integer, or < 1") without giving exact
  message strings, apart from the example
  `open_prs[0].number must be an integer >= 1`, which is
  used verbatim; the remaining messages follow the fleet's
  path-naming pattern (`<path> must be a non-empty string`,
  `<path> must be a boolean`, `<path>.source must be a
  string`, `<path>.priority must be one of "high",
  "normal", "low"`, `context must be a string`, and
  `<array> is required` / `<array> must be an array` for
  the top-level arrays). (3) The required item strings
  (`hash`, `subject`, `title`, `text`) are validated as
  **non-empty** exactly as the spec words it — a
  whitespace-only value passes — which is deliberately
  distinct from the whitespace-aware supplied-ness calls
  for `context` and `source`. No other spec ambiguity was
  found in the core behaviour.
- Container build not exercised locally; the
  publish-container workflow smoke-tests the image at
  publish time.
- Nothing pushed or published; this is a local build only.
- No interruption or truncated-file incident occurred
  during this build; every file was verified non-empty
  after writing.
