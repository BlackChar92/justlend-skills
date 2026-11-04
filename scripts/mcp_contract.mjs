/** Stable machine contract shared by every bundled MCP tool. */
export const MCP_OUTPUT_SCHEMA_VERSION = "1.0.0";

/**
 * MCP outputSchema for both successful and failed tool calls. Successful calls
 * retain their legacy JSON text payload and add the envelope as
 * structuredContent, so older clients remain compatible.
 */
export const MCP_TOOL_OUTPUT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: {
    schemaVersion: { type: "string", const: MCP_OUTPUT_SCHEMA_VERSION },
    tool: { type: "string", minLength: 1 },
    result: {},
    error: { type: "string", minLength: 1 },
    errorCode: {
      type: "string",
      enum: ["invalid_input", "authentication", "rate_limit", "transient", "internal"],
    },
    retryable: { type: "boolean" },
    hint: { type: "string", minLength: 1 },
  },
  required: ["schemaVersion", "tool"],
  oneOf: [
    {
      required: ["result"],
      not: { required: ["error"] },
    },
    {
      required: ["error", "errorCode", "retryable", "hint"],
      not: { required: ["result"] },
    },
  ],
  additionalProperties: false,
};

export function createToolSuccess(tool, result) {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: {
      schemaVersion: MCP_OUTPUT_SCHEMA_VERSION,
      tool,
      result,
    },
  };
}

export function classifyToolError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const normalized = message.toLowerCase();

  // Input values that resemble HTTP errors must not select a retryable class.
  if (error?.code === "INVALID_ASSET") {
    return {
      error: message,
      errorCode: "invalid_input",
      retryable: false,
      hint: "Correct the tool name or arguments before retrying.",
    };
  }

  // Contract codes are uint256 values, not HTTP statuses embedded in text.
  if (error?.code === "COMPTROLLER_QUERY_FAILED") {
    return {
      error: message,
      errorCode: "internal",
      retryable: false,
      hint: "Treat account risk as unknown; inspect the contract/RPC failure before trying again.",
    };
  }

  if (/429|rate.?limit|too many requests/.test(normalized)) {
    return {
      error: message,
      errorCode: "rate_limit",
      retryable: true,
      hint: "Retry this read after exponential backoff and respect any Retry-After value.",
    };
  }

  if (/401|403|api.?key|unauthori[sz]ed|forbidden|authentication/.test(normalized)) {
    return {
      error: message,
      errorCode: "authentication",
      retryable: false,
      hint: "Set a valid TRONGRID_API_KEY locally, then retry the read.",
    };
  }

  if (/unknown|invalid|missing|required|malformed|bad address|unsupported/.test(normalized)) {
    return {
      error: message,
      errorCode: "invalid_input",
      retryable: false,
      hint: "Correct the tool name or arguments before retrying.",
    };
  }

  if (/timeout|timed out|econn|enotfound|network|fetch failed|socket|temporar/.test(normalized)) {
    return {
      error: message,
      errorCode: "transient",
      retryable: true,
      hint: "Retry this read with exponential backoff; no transaction can be created by this server.",
    };
  }

  return {
    error: message,
    errorCode: "internal",
    retryable: false,
    hint: "Check server stderr and arguments; do not loop automatically on an unclassified failure.",
  };
}

export function createToolError(tool, error) {
  const structuredContent = {
    schemaVersion: MCP_OUTPUT_SCHEMA_VERSION,
    tool,
    ...classifyToolError(error),
  };

  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
    isError: true,
  };
}
