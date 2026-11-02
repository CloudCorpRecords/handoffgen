/**
 * handoffgen MCP server. Tools: build_handoff_brief.
 *
 * Why the low-level Server instead of McpServer: the high-level
 * helper converts zod schemas to JSON Schema and injects keys
 * not in this tool's defined spec ("$schema" and
 * "additionalProperties"), which breaks exact tool-list/schema
 * parity with the spec. This file serves tools/list with the
 * spec's exact input schema as an explicit literal, and every
 * tools/call is validated by the core, which names the
 * offending path on invalid input.
 *
 * The rendering is pure and local: no upstream API, no
 * authentication, and no configuration — the caller supplies
 * every fact the brief is rendered from.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { buildHandoffBrief, formatPayload, VERSION } from "./handoffgen.js";

const TOOLS = [
  {
    name: "build_handoff_brief",
    description:
      "Build a cold-start handoff brief for the next agent from caller-supplied commits, open pull requests, and TODO items. Returns the brief as markdown and the counts behind it. Pure rendering over supplied facts: nothing is fetched, executed, or inferred.",
    inputSchema: {
      type: "object" as const,
      properties: {
        commits: {
          type: "array",
          description: "Recent commits, rendered in input order",
          items: {
            type: "object",
            properties: {
              hash: {
                type: "string",
                description: "Commit hash, rendered verbatim",
              },
              subject: {
                type: "string",
                description: "Commit subject line",
              },
            },
            required: ["hash", "subject"],
          },
        },
        open_prs: {
          type: "array",
          description: "Open pull requests, rendered in input order",
          items: {
            type: "object",
            properties: {
              number: {
                type: "integer",
                description: "Pull request number",
              },
              title: {
                type: "string",
                description: "Pull request title",
              },
              blocked: {
                type: "boolean",
                description: "Whether the pull request is blocked",
              },
            },
            required: ["number", "title"],
          },
        },
        todos: {
          type: "array",
          description: "Outstanding TODO items",
          items: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "TODO text",
              },
              source: {
                type: "string",
                description: "Where the TODO lives, e.g. a file path (optional)",
              },
              priority: {
                type: "string",
                enum: ["high", "normal", "low"],
                description: "TODO priority (optional)",
              },
            },
            required: ["text"],
          },
        },
        context: {
          type: "string",
          description:
            "Free-text current-state note, included verbatim when supplied (optional)",
        },
      },
      required: ["commits", "open_prs", "todos"],
    },
  },
];

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorResult(err: unknown) {
  return {
    content: [
      { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
    ],
    isError: true,
  };
}

const server = new Server(
  { name: "handoffgen", version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let out: unknown;
    if (name === "build_handoff_brief") {
      out = buildHandoffBrief(args ?? {});
    } else {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return textResult(formatPayload(out));
  } catch (err) {
    if (err instanceof McpError) throw err;
    return errorResult(err);
  }
});

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

void main();
