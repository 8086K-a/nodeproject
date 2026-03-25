import type { AiParseResult, GraphEdge, GraphNode, JsonValue, TaskSourceType } from "@/lib/domain/models";

import { buildSyntheticParseResult, createId, truncateText } from "./utils";

type ParseInput = {
  graphId: string;
  taskId: string;
  title: string;
  sourceType: TaskSourceType;
  content?: string;
  language?: string;
};

type ProviderConfig = {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export type ParseGenerationResult = {
  result: AiParseResult;
  provider: string;
  model: string;
  usedFallback: boolean;
  fallbackReason?: string;
};

function getProviderConfig(): ProviderConfig {
  return {
    enabled: process.env.AI_PROVIDER_ENABLED === "true",
    apiKey: process.env.AI_PROVIDER_API_KEY,
    baseUrl: process.env.AI_PROVIDER_BASE_URL,
    model: process.env.AI_PROVIDER_MODEL,
  };
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asJsonRecord(value: unknown): Record<string, JsonValue> {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record).filter(([, entry]) => {
      const kind = typeof entry;
      return entry === null || kind === "string" || kind === "number" || kind === "boolean" || Array.isArray(entry) || kind === "object";
    }),
  ) as Record<string, JsonValue>;
}

function extractJsonBlock(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("AI provider returned empty content");
  }

  if (trimmed.startsWith("```")) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return trimmed;
}

function buildFallbackResult(input: ParseInput, reason?: string): ParseGenerationResult {
  const fallback = buildSyntheticParseResult(input);
  return {
    result: {
      ...fallback,
      meta: {
        ...fallback.meta,
        summary: truncateText(
          [reason ? `fallback: ${reason}` : null, fallback.meta.summary].filter(Boolean).join(" | "),
          160,
        ),
      },
    },
    provider: "local",
    model: "synthetic-task-parser",
    usedFallback: true,
    fallbackReason: reason,
  };
}

function normalizeNode(
  value: unknown,
  input: ParseInput,
  index: number,
  kind: "node" | "event",
): GraphNode {
  const record = asRecord(value);
  const position = asRecord(record.position);

  return {
    id: typeof record.id === "string" && record.id.trim() ? record.id.trim() : createId(`${kind}_${input.taskId}_${index + 1}`),
    graphId: input.graphId,
    type: typeof record.type === "string" && record.type.trim() ? record.type.trim() : kind === "event" ? "event" : "person",
    label:
      typeof record.label === "string" && record.label.trim()
        ? record.label.trim()
        : kind === "event"
          ? input.title
          : `Entity ${index + 1}`,
    properties: asJsonRecord(record.properties),
    position:
      typeof position.x === "number" && typeof position.y === "number"
        ? { x: position.x, y: position.y }
        : {
            x: 160 + index * 220,
            y: kind === "event" ? 340 : 140,
          },
    occurredAt: typeof record.occurredAt === "string" ? record.occurredAt : null,
    periodStart: typeof record.periodStart === "string" ? record.periodStart : null,
    periodEnd: typeof record.periodEnd === "string" ? record.periodEnd : null,
    placeId: typeof record.placeId === "string" ? record.placeId : null,
    participants: Array.isArray(record.participants)
      ? record.participants.filter((item): item is string => typeof item === "string")
      : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeEdge(value: unknown, input: ParseInput, index: number, knownIds: Set<string>): GraphEdge {
  const record = asRecord(value);
  const sourceId = typeof record.sourceId === "string" ? record.sourceId.trim() : "";
  const targetId = typeof record.targetId === "string" ? record.targetId.trim() : "";

  if (!sourceId || !targetId) {
    throw new Error(`AI edge ${index + 1} is missing sourceId or targetId`);
  }

  if (!knownIds.has(sourceId) || !knownIds.has(targetId)) {
    throw new Error(`AI edge ${index + 1} references unknown node ids`);
  }

  return {
    id: typeof record.id === "string" && record.id.trim() ? record.id.trim() : createId(`edge_${input.taskId}_${index + 1}`),
    graphId: input.graphId,
    sourceId,
    targetId,
    relation: typeof record.relation === "string" && record.relation.trim() ? record.relation.trim() : "related_to",
    label: typeof record.label === "string" ? record.label : null,
    start: typeof record.start === "string" ? record.start : null,
    end: typeof record.end === "string" ? record.end : null,
    weight: typeof record.weight === "number" ? record.weight : null,
    properties: asJsonRecord(record.properties),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeProviderResult(raw: unknown, input: ParseInput, provider: string, model: string): AiParseResult {
  const payload = asRecord(raw);
  const meta = asRecord(payload.meta);
  const nodes = Array.isArray(payload.nodes) ? payload.nodes.map((item, index) => normalizeNode(item, input, index, "node")) : [];
  const events = Array.isArray(payload.events) ? payload.events.map((item, index) => normalizeNode(item, input, index, "event")) : [];

  if (nodes.length === 0 && events.length === 0) {
    throw new Error("AI provider returned no nodes or events");
  }

  const knownIds = new Set([...nodes, ...events].map((item) => item.id));
  const edges = Array.isArray(payload.edges)
    ? payload.edges.map((item, index) => normalizeEdge(item, input, index, knownIds))
    : [];

  return {
    meta: {
      sourceType: typeof meta.sourceType === "string" ? meta.sourceType : input.sourceType,
      language: typeof meta.language === "string" ? meta.language : input.language ?? "zh-CN",
      summary:
        typeof meta.summary === "string" && meta.summary.trim()
          ? truncateText(meta.summary.trim(), 160)
          : truncateText(input.content?.trim() || input.title, 160),
      provider,
      model,
    },
    nodes,
    edges,
    events,
  };
}

async function requestOpenAiCompatibleResult(config: Required<Pick<ProviderConfig, "apiKey" | "baseUrl" | "model">>, input: ParseInput) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You extract relationship graph data and must return JSON only.",
            "Return an object with keys: meta, nodes, edges, events.",
            "Each node/event must include id, type, label, optional properties, optional position.",
            "Each edge must include id, sourceId, targetId, relation, optional label, optional properties.",
            "All ids must be short ASCII strings under 64 chars.",
            "The response must be compatible with an AiParseResult payload.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            sourceType: input.sourceType,
            language: input.language ?? "zh-CN",
            content: input.content ?? "",
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const message = asRecord(asRecord(choices[0]).message);
  const content = message.content;

  if (typeof content === "string") {
    return JSON.parse(extractJsonBlock(content));
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((item) => {
        const record = asRecord(item);
        return typeof record.text === "string" ? record.text : "";
      })
      .join("\n");

    return JSON.parse(extractJsonBlock(joined));
  }

  throw new Error("AI provider returned unsupported message content");
}

export async function generateAiParseResult(input: ParseInput): Promise<ParseGenerationResult> {
  const config = getProviderConfig();

  if (!config.enabled) {
    return buildFallbackResult(input, "AI provider disabled");
  }

  if (!config.apiKey || !config.baseUrl || !config.model) {
    return buildFallbackResult(input, "AI provider config incomplete");
  }

  try {
    const raw = await requestOpenAiCompatibleResult(
      {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
      },
      input,
    );

    return {
      result: normalizeProviderResult(raw, input, "openai-compatible", config.model),
      provider: "openai-compatible",
      model: config.model,
      usedFallback: false,
    };
  } catch (error) {
    return buildFallbackResult(input, error instanceof Error ? error.message : String(error));
  }
}
