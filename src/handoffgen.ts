/**
 * handoffgen core: build a cold-start handoff brief for the
 * next agent from caller-supplied commits, open pull
 * requests, and TODO items.
 *
 *   buildHandoffBrief(args) -> { brief, counts }
 *
 * Rendering (pinned): the brief is markdown, lines joined
 * with "\n", sections separated by exactly one blank line,
 * and no trailing newline:
 *
 *   # Handoff brief
 *
 *   ## Context            (only when context counts as
 *   <context verbatim>     supplied; see below)
 *
 *   ## Recent commits
 *   - `<hash>` <subject>          (one per commit, input
 *                                  order; or the single line
 *                                  "No commits supplied.")
 *
 *   ## Open pull requests
 *   - #<number> <title> [blocked]  (one per PR, input order;
 *                                  the " [blocked]" suffix
 *                                  only when blocked is true;
 *                                  or "No open pull requests
 *                                  supplied.")
 *
 *   ## TODOs
 *   - [high] <text> (<source>)   (one per TODO; the "[high] "
 *                                  prefix only for priority
 *                                  "high"; the " (<source>)"
 *                                  suffix only when source
 *                                  counts as supplied; or
 *                                  "No TODOs supplied.")
 *
 * TODOs render banded: every "high" first, then every
 * "normal", then every "low", with input order preserved
 * inside each band (stable). An absent priority counts as
 * "normal". Commits and open pull requests render in input
 * order.
 *
 * Supplied-ness (pinned judgement calls): a `context` that
 * is absent, empty, or whitespace-only counts as NOT
 * supplied and produces no Context section; a supplied
 * context is rendered verbatim, never trimmed. A TODO
 * `source` that is absent, empty, or whitespace-only counts
 * as NOT supplied and produces no suffix; a supplied source
 * is rendered verbatim inside the parentheses.
 *
 * Counts (pinned): {commits, open_prs, blocked_prs, todos,
 * high_priority_todos} — the input array lengths, the number
 * of PRs with blocked true, and the number of TODOs whose
 * priority is "high".
 *
 * Validation is strict and path-naming: any malformed input
 * throws an Error naming the offending path (for example
 * "open_prs[0].number must be an integer >= 1") and no
 * partial result is produced. Unknown extra fields are
 * ignored, including inside items; a non-object top-level
 * argument is treated as {}.
 */
import type {
  HandoffBriefResult,
  HandoffCommit,
  HandoffOpenPr,
  HandoffTodo,
  TodoPriority,
} from "./types.js";

export const VERSION = "0.1.0";

const PRIORITIES: readonly TodoPriority[] = ["high", "normal", "low"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

function countsAsSupplied(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

function validateCommits(raw: Record<string, unknown>): HandoffCommit[] {
  if (raw.commits === undefined) throw new Error("commits is required");
  if (!Array.isArray(raw.commits)) throw new Error("commits must be an array");
  return raw.commits.map((entry, i) => {
    const path = `commits[${i}]`;
    if (!isRecord(entry)) throw new Error(`${path} must be an object`);
    const hash = nonEmptyString(entry.hash, `${path}.hash`);
    const subject = nonEmptyString(entry.subject, `${path}.subject`);
    return { hash, subject };
  });
}

function validateOpenPrs(raw: Record<string, unknown>): HandoffOpenPr[] {
  if (raw.open_prs === undefined) throw new Error("open_prs is required");
  if (!Array.isArray(raw.open_prs)) throw new Error("open_prs must be an array");
  return raw.open_prs.map((entry, i) => {
    const path = `open_prs[${i}]`;
    if (!isRecord(entry)) throw new Error(`${path} must be an object`);
    if (
      typeof entry.number !== "number" ||
      !Number.isInteger(entry.number) ||
      entry.number < 1
    ) {
      throw new Error(`${path}.number must be an integer >= 1`);
    }
    const title = nonEmptyString(entry.title, `${path}.title`);
    let blocked = false;
    if (entry.blocked !== undefined) {
      if (typeof entry.blocked !== "boolean") {
        throw new Error(`${path}.blocked must be a boolean`);
      }
      blocked = entry.blocked;
    }
    return { number: entry.number, title, blocked };
  });
}

function validateTodos(raw: Record<string, unknown>): HandoffTodo[] {
  if (raw.todos === undefined) throw new Error("todos is required");
  if (!Array.isArray(raw.todos)) throw new Error("todos must be an array");
  return raw.todos.map((entry, i) => {
    const path = `todos[${i}]`;
    if (!isRecord(entry)) throw new Error(`${path} must be an object`);
    const text = nonEmptyString(entry.text, `${path}.text`);
    let source: string | undefined;
    if (entry.source !== undefined) {
      if (typeof entry.source !== "string") {
        throw new Error(`${path}.source must be a string`);
      }
      source = entry.source;
    }
    let priority: TodoPriority = "normal";
    if (entry.priority !== undefined) {
      if (
        typeof entry.priority !== "string" ||
        !PRIORITIES.includes(entry.priority as TodoPriority)
      ) {
        throw new Error(
          `${path}.priority must be one of "high", "normal", "low"`,
        );
      }
      priority = entry.priority as TodoPriority;
    }
    const todo: HandoffTodo = { text, priority };
    if (source !== undefined) todo.source = source;
    return todo;
  });
}

function validateContext(raw: Record<string, unknown>): string | undefined {
  if (raw.context === undefined) return undefined;
  if (typeof raw.context !== "string") {
    throw new Error("context must be a string");
  }
  return raw.context;
}

/** Build the cold-start handoff brief from the supplied facts. */
export function buildHandoffBrief(args: unknown): HandoffBriefResult {
  const raw: Record<string, unknown> = isRecord(args) ? args : {};

  const commits = validateCommits(raw);
  const openPrs = validateOpenPrs(raw);
  const todos = validateTodos(raw);
  const context = validateContext(raw);

  const lines: string[] = ["# Handoff brief"];

  if (countsAsSupplied(context)) {
    lines.push("", "## Context", context);
  }

  lines.push("", "## Recent commits");
  if (commits.length === 0) {
    lines.push("No commits supplied.");
  } else {
    for (const commit of commits) {
      lines.push(`- \`${commit.hash}\` ${commit.subject}`);
    }
  }

  lines.push("", "## Open pull requests");
  if (openPrs.length === 0) {
    lines.push("No open pull requests supplied.");
  } else {
    for (const pr of openPrs) {
      lines.push(`- #${pr.number} ${pr.title}${pr.blocked ? " [blocked]" : ""}`);
    }
  }

  lines.push("", "## TODOs");
  if (todos.length === 0) {
    lines.push("No TODOs supplied.");
  } else {
    const banded = [
      ...todos.filter((t) => t.priority === "high"),
      ...todos.filter((t) => t.priority === "normal"),
      ...todos.filter((t) => t.priority === "low"),
    ];
    for (const todo of banded) {
      const prefix = todo.priority === "high" ? "[high] " : "";
      const suffix = countsAsSupplied(todo.source) ? ` (${todo.source})` : "";
      lines.push(`- ${prefix}${todo.text}${suffix}`);
    }
  }

  return {
    brief: lines.join("\n"),
    counts: {
      commits: commits.length,
      open_prs: openPrs.length,
      blocked_prs: openPrs.filter((pr) => pr.blocked).length,
      todos: todos.length,
      high_priority_todos: todos.filter((t) => t.priority === "high").length,
    },
  };
}

/** Render a payload as the JSON text block MCP clients show. */
export function formatPayload(payload: unknown): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}
