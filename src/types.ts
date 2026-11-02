/**
 * handoffgen types.
 *
 * handoffgen builds a cold-start handoff brief for the next
 * agent. The caller supplies recent commits, the open pull
 * requests, the outstanding TODO items, and optionally a
 * free-text note about the current state. From that data
 * alone, as pure local rendering, handoffgen reports:
 *
 *   - the brief itself, as markdown with a fixed shape
 *   - the counts behind it: how many commits, open pull
 *     requests, blocked pull requests, TODOs, and
 *     high-priority TODOs went into it
 *
 * The brief always carries a "## Recent commits", a
 * "## Open pull requests", and a "## TODOs" section, in
 * that order; a "## Context" section appears before them
 * only when a context note counts as supplied. TODOs are
 * banded by priority — high first, then normal, then low —
 * while commits and pull requests keep input order.
 */

/** Priority of a TODO item; an absent priority means "normal". */
export type TodoPriority = "high" | "normal" | "low";

/** One recent commit, as accepted after validation. */
export interface HandoffCommit {
  /** Commit hash, rendered verbatim inside backticks. */
  hash: string;
  /** Commit subject line. */
  subject: string;
}

/** One open pull request, as accepted after validation. */
export interface HandoffOpenPr {
  /** Pull request number; an integer of at least 1. */
  number: number;
  /** Pull request title. */
  title: string;
  /** Whether the pull request is blocked; absent means false. */
  blocked: boolean;
}

/** One outstanding TODO item, as accepted after validation. */
export interface HandoffTodo {
  /** TODO text. */
  text: string;
  /** Where the TODO lives (for example a file path), when supplied. */
  source?: string;
  /** TODO priority; "normal" when absent in the input. */
  priority: TodoPriority;
}

/** The counts behind a handoff brief. */
export interface HandoffCounts {
  /** Number of commits supplied. */
  commits: number;
  /** Number of open pull requests supplied. */
  open_prs: number;
  /** Number of open pull requests flagged as blocked. */
  blocked_prs: number;
  /** Number of TODO items supplied. */
  todos: number;
  /** Number of TODO items with priority "high". */
  high_priority_todos: number;
}

/** The handoff brief and the counts behind it. */
export interface HandoffBriefResult {
  /** The rendered brief (lines joined with "\n", no trailing newline). */
  brief: string;
  /** Counts over the supplied commits, pull requests, and TODOs. */
  counts: HandoffCounts;
}
