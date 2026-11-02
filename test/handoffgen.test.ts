import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildHandoffBrief } from "../src/handoffgen.js";

/**
 * All tests are pure local rendering over inline argument
 * objects: no filesystem and no network. The exact brief
 * string (section order, blank-line separation, no trailing
 * newline), the context supplied-ness judgement, the TODO
 * banding and its stability, the "[high]" prefix, the
 * source suffix and its supplied-ness judgement, the
 * blocked suffix, the three empty-section fallback lines,
 * the counts, priority defaulting, and every validation
 * path are each pinned with full-brief comparisons.
 */

const full = {
  context: "Parser is stable; cache work is mid-flight.",
  commits: [
    { hash: "abc1234", subject: "Add parser" },
    { hash: "def5678", subject: "Fix flaky test" },
  ],
  open_prs: [
    { number: 12, title: "Wire up cache" },
    { number: 13, title: "Bump deps", blocked: true },
  ],
  todos: [
    { text: "Write migration notes", source: "docs/migration.md", priority: "high" },
    { text: "Tidy README" },
    { text: "Polish icons", priority: "low" },
  ],
};

const fullBrief = [
  "# Handoff brief",
  "",
  "## Context",
  "Parser is stable; cache work is mid-flight.",
  "",
  "## Recent commits",
  "- `abc1234` Add parser",
  "- `def5678` Fix flaky test",
  "",
  "## Open pull requests",
  "- #12 Wire up cache",
  "- #13 Bump deps [blocked]",
  "",
  "## TODOs",
  "- [high] Write migration notes (docs/migration.md)",
  "- Tidy README",
  "- Polish icons",
].join("\n");

const emptyArgs = { commits: [], open_prs: [], todos: [] };

const emptyBrief = [
  "# Handoff brief",
  "",
  "## Recent commits",
  "No commits supplied.",
  "",
  "## Open pull requests",
  "No open pull requests supplied.",
  "",
  "## TODOs",
  "No TODOs supplied.",
].join("\n");

describe("buildHandoffBrief — full brief", () => {
  it("renders every section populated, with the exact brief and counts", () => {
    assert.deepEqual(buildHandoffBrief(full), {
      brief: fullBrief,
      counts: {
        commits: 2,
        open_prs: 2,
        blocked_prs: 1,
        todos: 3,
        high_priority_todos: 1,
      },
    });
  });

  it("has no trailing newline and sections separated by exactly one blank line", () => {
    const { brief } = buildHandoffBrief(full);
    assert.equal(brief.endsWith("\n"), false);
    assert.equal(brief.includes("\n\n\n"), false);
    assert.ok(brief.endsWith("- Polish icons"));
    assert.equal(brief.split("\n")[0], "# Handoff brief");
  });
});

describe("buildHandoffBrief — context (pinned judgement call)", () => {
  it("a supplied context opens the brief under ## Context", () => {
    const out = buildHandoffBrief({ ...emptyArgs, context: "Mid-refactor." });
    assert.equal(
      out.brief,
      [
        "# Handoff brief",
        "",
        "## Context",
        "Mid-refactor.",
        "",
        "## Recent commits",
        "No commits supplied.",
        "",
        "## Open pull requests",
        "No open pull requests supplied.",
        "",
        "## TODOs",
        "No TODOs supplied.",
      ].join("\n"),
    );
  });

  it("an absent context produces no Context section", () => {
    assert.equal(buildHandoffBrief(emptyArgs).brief, emptyBrief);
  });

  it("an empty-string context counts as not supplied", () => {
    assert.equal(buildHandoffBrief({ ...emptyArgs, context: "" }).brief, emptyBrief);
  });

  it("a whitespace-only context counts as not supplied (dedicated judgement test)", () => {
    assert.equal(
      buildHandoffBrief({ ...emptyArgs, context: "   \n\t  " }).brief,
      emptyBrief,
    );
    assert.equal(
      buildHandoffBrief({ ...emptyArgs, context: " " }).brief,
      emptyBrief,
    );
  });

  it("a supplied context is rendered verbatim, never trimmed, newlines kept", () => {
    const context = "  Parser stable.\nSecond line kept.  ";
    const out = buildHandoffBrief({ ...emptyArgs, context });
    assert.equal(
      out.brief,
      [
        "# Handoff brief",
        "",
        "## Context",
        "  Parser stable.\nSecond line kept.  ",
        "",
        "## Recent commits",
        "No commits supplied.",
        "",
        "## Open pull requests",
        "No open pull requests supplied.",
        "",
        "## TODOs",
        "No TODOs supplied.",
      ].join("\n"),
    );
  });
});

describe("buildHandoffBrief — input order for commits and pull requests", () => {
  it("commits render in input order, never sorted", () => {
    const out = buildHandoffBrief({
      commits: [
        { hash: "zzz9999", subject: "Last hash, first in input" },
        { hash: "aaa0000", subject: "First hash, second in input" },
      ],
      open_prs: [],
      todos: [],
    });
    assert.equal(
      out.brief,
      [
        "# Handoff brief",
        "",
        "## Recent commits",
        "- `zzz9999` Last hash, first in input",
        "- `aaa0000` First hash, second in input",
        "",
        "## Open pull requests",
        "No open pull requests supplied.",
        "",
        "## TODOs",
        "No TODOs supplied.",
      ].join("\n"),
    );
  });

  it("open pull requests render in input order, never sorted by number", () => {
    const out = buildHandoffBrief({
      commits: [],
      open_prs: [
        { number: 9, title: "Higher number first" },
        { number: 2, title: "Lower number second" },
      ],
      todos: [],
    });
    assert.equal(
      out.brief,
      [
        "# Handoff brief",
        "",
        "## Recent commits",
        "No commits supplied.",
        "",
        "## Open pull requests",
        "- #9 Higher number first",
        "- #2 Lower number second",
        "",
        "## TODOs",
        "No TODOs supplied.",
      ].join("\n"),
    );
  });
});

describe("buildHandoffBrief — blocked suffix", () => {
  const withPr = (pr: unknown) =>
    buildHandoffBrief({ commits: [], open_prs: [pr], todos: [] }).brief;
  const prBrief = (line: string) =>
    [
      "# Handoff brief",
      "",
      "## Recent commits",
      "No commits supplied.",
      "",
      "## Open pull requests",
      line,
      "",
      "## TODOs",
      "No TODOs supplied.",
    ].join("\n");

  it("blocked true appends the [blocked] suffix", () => {
    assert.equal(
      withPr({ number: 4, title: "Stuck", blocked: true }),
      prBrief("- #4 Stuck [blocked]"),
    );
  });

  it("blocked false carries no suffix", () => {
    assert.equal(
      withPr({ number: 4, title: "Moving", blocked: false }),
      prBrief("- #4 Moving"),
    );
  });

  it("an absent blocked counts as false and carries no suffix", () => {
    assert.equal(withPr({ number: 4, title: "Moving" }), prBrief("- #4 Moving"));
  });
});

describe("buildHandoffBrief — TODO banding and priority", () => {
  const todoBrief = (lines: string[]) =>
    [
      "# Handoff brief",
      "",
      "## Recent commits",
      "No commits supplied.",
      "",
      "## Open pull requests",
      "No open pull requests supplied.",
      "",
      "## TODOs",
      ...lines,
    ].join("\n");
  const withTodos = (todos: unknown) =>
    buildHandoffBrief({ commits: [], open_prs: [], todos }).brief;

  it("bands high, then normal, then low regardless of input order", () => {
    assert.equal(
      withTodos([
        { text: "low first", priority: "low" },
        { text: "normal first" },
        { text: "high first", priority: "high" },
        { text: "low second", priority: "low" },
        { text: "high second", priority: "high" },
        { text: "normal second", priority: "normal" },
      ]),
      todoBrief([
        "- [high] high first",
        "- [high] high second",
        "- normal first",
        "- normal second",
        "- low first",
        "- low second",
      ]),
    );
  });

  it("order inside a band is input order (stable)", () => {
    assert.equal(
      withTodos([
        { text: "high A", priority: "high" },
        { text: "normal X" },
        { text: "high B", priority: "high" },
        { text: "low Y", priority: "low" },
        { text: "high C", priority: "high" },
        { text: "normal Z" },
        { text: "low W", priority: "low" },
      ]),
      todoBrief([
        "- [high] high A",
        "- [high] high B",
        "- [high] high C",
        "- normal X",
        "- normal Z",
        "- low Y",
        "- low W",
      ]),
    );
  });

  it("the [high] prefix appears only for high priority", () => {
    assert.equal(
      withTodos([
        { text: "explicit normal", priority: "normal" },
        { text: "the high one", priority: "high" },
        { text: "the low one", priority: "low" },
      ]),
      todoBrief(["- [high] the high one", "- explicit normal", "- the low one"]),
    );
  });

  it("an absent priority defaults to normal banding and no prefix", () => {
    assert.equal(
      withTodos([
        { text: "low item", priority: "low" },
        { text: "defaulted item" },
        { text: "high item", priority: "high" },
      ]),
      todoBrief(["- [high] high item", "- defaulted item", "- low item"]),
    );
  });
});

describe("buildHandoffBrief — TODO source suffix (pinned judgement call)", () => {
  const todoBrief = (line: string) =>
    [
      "# Handoff brief",
      "",
      "## Recent commits",
      "No commits supplied.",
      "",
      "## Open pull requests",
      "No open pull requests supplied.",
      "",
      "## TODOs",
      line,
    ].join("\n");
  const withTodo = (todo: unknown) =>
    buildHandoffBrief({ commits: [], open_prs: [], todos: [todo] }).brief;

  it("a supplied source renders as a parenthesised suffix", () => {
    assert.equal(
      withTodo({ text: "Fix the flake", source: "test/parser.test.ts" }),
      todoBrief("- Fix the flake (test/parser.test.ts)"),
    );
  });

  it("an absent source renders no suffix", () => {
    assert.equal(withTodo({ text: "Fix the flake" }), todoBrief("- Fix the flake"));
  });

  it("an empty-string source counts as not supplied", () => {
    assert.equal(
      withTodo({ text: "Fix the flake", source: "" }),
      todoBrief("- Fix the flake"),
    );
  });

  it("a whitespace-only source counts as not supplied (dedicated judgement test)", () => {
    assert.equal(
      withTodo({ text: "Fix the flake", source: "   " }),
      todoBrief("- Fix the flake"),
    );
    assert.equal(
      withTodo({ text: "Fix the flake", source: " \t\n " }),
      todoBrief("- Fix the flake"),
    );
  });

  it("a supplied source is rendered verbatim inside the parentheses", () => {
    assert.equal(
      withTodo({ text: "Fix the flake", source: " docs/notes.md " }),
      todoBrief("- Fix the flake ( docs/notes.md )"),
    );
  });

  it("the source suffix follows the [high] prefix and the text", () => {
    assert.equal(
      withTodo({ text: "Urgent fix", source: "src/core.ts", priority: "high" }),
      todoBrief("- [high] Urgent fix (src/core.ts)"),
    );
  });
});

describe("buildHandoffBrief — empty-section fallback lines", () => {
  it("no commits renders the commits fallback line", () => {
    const out = buildHandoffBrief({
      commits: [],
      open_prs: [{ number: 1, title: "Only PR" }],
      todos: [{ text: "Only TODO" }],
    });
    assert.equal(
      out.brief,
      [
        "# Handoff brief",
        "",
        "## Recent commits",
        "No commits supplied.",
        "",
        "## Open pull requests",
        "- #1 Only PR",
        "",
        "## TODOs",
        "- Only TODO",
      ].join("\n"),
    );
  });

  it("no pull requests renders the pull requests fallback line", () => {
    const out = buildHandoffBrief({
      commits: [{ hash: "abc1234", subject: "Only commit" }],
      open_prs: [],
      todos: [{ text: "Only TODO" }],
    });
    assert.equal(
      out.brief,
      [
        "# Handoff brief",
        "",
        "## Recent commits",
        "- `abc1234` Only commit",
        "",
        "## Open pull requests",
        "No open pull requests supplied.",
        "",
        "## TODOs",
        "- Only TODO",
      ].join("\n"),
    );
  });

  it("no TODOs renders the TODOs fallback line", () => {
    const out = buildHandoffBrief({
      commits: [{ hash: "abc1234", subject: "Only commit" }],
      open_prs: [{ number: 1, title: "Only PR" }],
      todos: [],
    });
    assert.equal(
      out.brief,
      [
        "# Handoff brief",
        "",
        "## Recent commits",
        "- `abc1234` Only commit",
        "",
        "## Open pull requests",
        "- #1 Only PR",
        "",
        "## TODOs",
        "No TODOs supplied.",
      ].join("\n"),
    );
  });

  it("all three arrays empty renders all three fallback lines", () => {
    assert.equal(buildHandoffBrief(emptyArgs).brief, emptyBrief);
  });

  it("all three arrays empty with a context still renders the context first", () => {
    const out = buildHandoffBrief({ ...emptyArgs, context: "Nothing landed yet." });
    assert.equal(
      out.brief,
      [
        "# Handoff brief",
        "",
        "## Context",
        "Nothing landed yet.",
        "",
        "## Recent commits",
        "No commits supplied.",
        "",
        "## Open pull requests",
        "No open pull requests supplied.",
        "",
        "## TODOs",
        "No TODOs supplied.",
      ].join("\n"),
    );
  });
});

describe("buildHandoffBrief — counts", () => {
  it("counts include blocked_prs and high_priority_todos over mixed input", () => {
    const out = buildHandoffBrief({
      commits: [
        { hash: "a1", subject: "One" },
        { hash: "a2", subject: "Two" },
        { hash: "a3", subject: "Three" },
      ],
      open_prs: [
        { number: 1, title: "A", blocked: true },
        { number: 2, title: "B" },
        { number: 3, title: "C", blocked: false },
        { number: 4, title: "D", blocked: true },
      ],
      todos: [
        { text: "h1", priority: "high" },
        { text: "n1" },
        { text: "h2", priority: "high" },
        { text: "l1", priority: "low" },
        { text: "n2", priority: "normal" },
      ],
    });
    assert.deepEqual(out.counts, {
      commits: 3,
      open_prs: 4,
      blocked_prs: 2,
      todos: 5,
      high_priority_todos: 2,
    });
  });

  it("empty input counts are all zero", () => {
    assert.deepEqual(buildHandoffBrief(emptyArgs).counts, {
      commits: 0,
      open_prs: 0,
      blocked_prs: 0,
      todos: 0,
      high_priority_todos: 0,
    });
  });

  it("high_priority_todos counts only explicit high priorities", () => {
    const out = buildHandoffBrief({
      commits: [],
      open_prs: [],
      todos: [
        { text: "one high", priority: "high" },
        { text: "explicit normal", priority: "normal" },
        { text: "defaulted" },
        { text: "a low", priority: "low" },
      ],
    });
    assert.equal(out.counts.high_priority_todos, 1);
    assert.equal(out.counts.todos, 4);
  });
});

describe("buildHandoffBrief — validation", () => {
  const throws = (args: unknown, message: string) =>
    assert.throws(() => buildHandoffBrief(args), { message });
  const ok = { commits: [], open_prs: [], todos: [] };

  it("commits missing is an error naming commits", () => {
    throws({ open_prs: [], todos: [] }, "commits is required");
    throws({}, "commits is required");
  });

  it("commits not an array names commits", () => {
    throws({ ...ok, commits: "abc" }, "commits must be an array");
    throws({ ...ok, commits: {} }, "commits must be an array");
    throws({ ...ok, commits: 3 }, "commits must be an array");
    throws({ ...ok, commits: null }, "commits must be an array");
  });

  it("open_prs missing is an error naming open_prs", () => {
    throws({ commits: [], todos: [] }, "open_prs is required");
  });

  it("open_prs not an array names open_prs", () => {
    throws({ ...ok, open_prs: "x" }, "open_prs must be an array");
    throws({ ...ok, open_prs: null }, "open_prs must be an array");
  });

  it("todos missing is an error naming todos", () => {
    throws({ commits: [], open_prs: [] }, "todos is required");
  });

  it("todos not an array names todos", () => {
    throws({ ...ok, todos: {} }, "todos must be an array");
    throws({ ...ok, todos: 0 }, "todos must be an array");
  });

  it("a non-object top-level argument is treated as {} and fails on commits", () => {
    throws(null, "commits is required");
    throws([], "commits is required");
    throws("brief", "commits is required");
    throws(42, "commits is required");
    throws(undefined, "commits is required");
  });

  it("a commit item that is not an object names its index path", () => {
    throws({ ...ok, commits: [null] }, "commits[0] must be an object");
    throws({ ...ok, commits: ["abc1234"] }, "commits[0] must be an object");
    throws(
      { ...ok, commits: [{ hash: "a", subject: "s" }, 7] },
      "commits[1] must be an object",
    );
    throws({ ...ok, commits: [[]] }, "commits[0] must be an object");
  });

  it("hash missing, empty, or non-string names commits[i].hash", () => {
    throws({ ...ok, commits: [{ subject: "s" }] }, "commits[0].hash must be a non-empty string");
    for (const bad of ["", 42, null, true, [], {}]) {
      throws(
        { ...ok, commits: [{ hash: bad, subject: "s" }] },
        "commits[0].hash must be a non-empty string",
      );
    }
  });

  it("subject missing, empty, or non-string names commits[i].subject", () => {
    throws(
      { ...ok, commits: [{ hash: "a", subject: "ok" }, { hash: "b" }] },
      "commits[1].subject must be a non-empty string",
    );
    for (const bad of ["", 0, null, false, []]) {
      throws(
        { ...ok, commits: [{ hash: "a", subject: bad }] },
        "commits[0].subject must be a non-empty string",
      );
    }
  });

  it("a pull request item that is not an object names its index path", () => {
    throws({ ...ok, open_prs: [null] }, "open_prs[0] must be an object");
    throws({ ...ok, open_prs: ["#1"] }, "open_prs[0] must be an object");
    throws(
      { ...ok, open_prs: [{ number: 1, title: "t" }, null] },
      "open_prs[1] must be an object",
    );
  });

  it("number missing, non-integer, or below 1 names open_prs[i].number", () => {
    throws({ ...ok, open_prs: [{ title: "t" }] }, "open_prs[0].number must be an integer >= 1");
    for (const bad of [0, -1, -100, 1.5, 0.5, "12", true, null, [], {}]) {
      throws(
        { ...ok, open_prs: [{ number: bad, title: "t" }] },
        "open_prs[0].number must be an integer >= 1",
      );
    }
    throws(
      { ...ok, open_prs: [{ number: 5, title: "ok" }, { number: 0, title: "t" }] },
      "open_prs[1].number must be an integer >= 1",
    );
  });

  it("number exactly 1 is valid and renders as #1", () => {
    const out = buildHandoffBrief({
      commits: [],
      open_prs: [{ number: 1, title: "First PR" }],
      todos: [],
    });
    assert.ok(out.brief.includes("- #1 First PR"));
    assert.equal(out.counts.open_prs, 1);
  });

  it("title missing, empty, or non-string names open_prs[i].title", () => {
    throws({ ...ok, open_prs: [{ number: 2 }] }, "open_prs[0].title must be a non-empty string");
    for (const bad of ["", 9, null, true, {}]) {
      throws(
        { ...ok, open_prs: [{ number: 2, title: bad }] },
        "open_prs[0].title must be a non-empty string",
      );
    }
  });

  it("blocked present but not a boolean names open_prs[i].blocked", () => {
    for (const bad of ["true", 1, 0, null, [], {}]) {
      throws(
        { ...ok, open_prs: [{ number: 2, title: "t", blocked: bad }] },
        "open_prs[0].blocked must be a boolean",
      );
    }
  });

  it("a TODO item that is not an object names its index path", () => {
    throws({ ...ok, todos: [null] }, "todos[0] must be an object");
    throws({ ...ok, todos: ["do it"] }, "todos[0] must be an object");
    throws(
      { ...ok, todos: [{ text: "ok" }, 3] },
      "todos[1] must be an object",
    );
  });

  it("text missing, empty, or non-string names todos[i].text", () => {
    throws({ ...ok, todos: [{}] }, "todos[0].text must be a non-empty string");
    for (const bad of ["", 5, null, false, []]) {
      throws(
        { ...ok, todos: [{ text: bad }] },
        "todos[0].text must be a non-empty string",
      );
    }
  });

  it("source present but not a string names todos[i].source", () => {
    for (const bad of [42, null, true, [], {}]) {
      throws(
        { ...ok, todos: [{ text: "t", source: bad }] },
        "todos[0].source must be a string",
      );
    }
  });

  it("priority present but not a pinned value names todos[i].priority", () => {
    for (const bad of ["urgent", "HIGH", "High", "", 42, null, true, []]) {
      throws(
        { ...ok, todos: [{ text: "t", priority: bad }] },
        'todos[0].priority must be one of "high", "normal", "low"',
      );
    }
  });

  it("each pinned priority value is accepted", () => {
    for (const priority of ["high", "normal", "low"]) {
      const out = buildHandoffBrief({
        commits: [],
        open_prs: [],
        todos: [{ text: "t", priority }],
      });
      assert.equal(out.counts.todos, 1);
    }
  });

  it("context present but not a string names context", () => {
    for (const bad of [42, null, true, [], {}]) {
      throws({ ...ok, context: bad }, "context must be a string");
    }
  });

  it("unknown extra fields are ignored, including inside items", () => {
    const out = buildHandoffBrief({
      context: "Parser is stable; cache work is mid-flight.",
      commits: [
        { hash: "abc1234", subject: "Add parser", author: "someone" },
        { hash: "def5678", subject: "Fix flaky test", files: 3 },
      ],
      open_prs: [
        { number: 12, title: "Wire up cache", url: "https://example.invalid/pr/12" },
        { number: 13, title: "Bump deps", blocked: true, draft: false },
      ],
      todos: [
        { text: "Write migration notes", source: "docs/migration.md", priority: "high", owner: "next" },
        { text: "Tidy README", estimate: 1 },
        { text: "Polish icons", priority: "low", tag: "ui" },
      ],
      generated_by: "test",
    });
    assert.equal(out.brief, fullBrief);
  });

  it("no partial result is produced on invalid input", () => {
    assert.throws(() =>
      buildHandoffBrief({
        commits: [{ hash: "a", subject: "fine" }],
        open_prs: [{ number: 1, title: "fine" }],
        todos: [{ text: "fine" }, { text: "" }],
      }),
    );
  });
});
