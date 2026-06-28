// ─── MCP Tool Definitions ────────────────────────────────────
// OpenAI-compatible tool definitions for GLM-4.7-Flash function calling.

export interface McpTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolMessage {
  role: 'tool'
  tool_call_id: string
  content: string
}

// ─── Tool Definitions ────────────────────────────────────────

export const SCP_TOOLS: McpTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_scp_entries',
      description:
        'Search SCP entries by name or keyword. Returns matching entries with their SCP number, name, object class, and summary.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search term to match against entry names (partial match, case-insensitive)',
          },
          language: {
            type: 'string',
            enum: ['en', 'cn'],
            description: "Language of entries to search. Defaults to the user's current language.",
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (1-10, default 5)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_scp_entry',
      description:
        "Get detailed information about a specific SCP entry by its SCP number. Returns the entry's name, object class, containment procedures, and description.",
      parameters: {
        type: 'object',
        properties: {
          scp_number: {
            type: 'number',
            description: 'The SCP number (e.g., 173 for SCP-173)',
          },
          language: {
            type: 'string',
            enum: ['en', 'cn'],
            description: 'Language of the entry. Defaults to English.',
          },
        },
        required: ['scp_number'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_scp_entries_by_class',
      description:
        'List SCP entries filtered by object class (Safe, Euclid, Keter, Thaumiel, Apollyon, Neutralized). Returns entries with their SCP number, name, and object class.',
      parameters: {
        type: 'object',
        properties: {
          object_class: {
            type: 'string',
            enum: ['Safe', 'Euclid', 'Keter', 'Thaumiel', 'Apollyon', 'Neutralized'],
            description: 'The containment class to filter by',
          },
          language: {
            type: 'string',
            enum: ['en', 'cn'],
            description: 'Language of entries. Defaults to English.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (1-10, default 5)',
          },
        },
        required: ['object_class'],
      },
    },
  },
]
