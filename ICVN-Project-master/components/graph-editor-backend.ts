import type {
  CreateEdgeRequest,
  CreateNodeRequest,
  GraphEdge,
  GraphNode,
  JsonValue,
  Position,
  UpdateEdgeRequest,
  UpdateNodeRequest,
} from "@/lib/domain/models";

import type { AppEdge, AppNode, GraphDocument, ShapeNodeData, ShapeNodeKind } from "./graph/sample-graph";

type ShapeNode = Extract<AppNode, { type: "shapeNode" }>;

const DEFAULT_NODE_LABEL = "未命名节点";
const DEFAULT_EDGE_RELATION = "关联";

function normalizeTextLine(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function getNodeLabel(text: string) {
  return normalizeTextLine(text) ?? DEFAULT_NODE_LABEL;
}

function mapShapeKindToNodeType(kind: ShapeNodeKind) {
  switch (kind) {
    case "rounded":
      return "person";
    case "ellipse":
      return "place";
    case "diamond":
      return "event";
    default:
      return "entity";
  }
}

function normalizePosition(position?: Position) {
  if (!position) {
    return undefined;
  }

  return {
    x: Number(position.x ?? 0),
    y: Number(position.y ?? 0),
  };
}

function buildNodeProperties(data: ShapeNodeData, baseProperties: Record<string, JsonValue> = {}): Record<string, JsonValue> {
  return {
    ...baseProperties,
    kind: data.kind,
    text: data.text,
    imageUrl: data.imageUrl ?? null,
    fillColor: data.fillColor ?? null,
    strokeColor: data.strokeColor ?? null,
    textColor: data.textColor ?? null,
  };
}

function buildEdgeProperties(edge: AppEdge, baseProperties: Record<string, JsonValue> = {}): Record<string, JsonValue> {
  return {
    ...baseProperties,
    pathStyle: edge.data?.pathStyle ?? "smoothstep",
    dashed: edge.data?.dashed ?? false,
    marker: edge.data?.marker ?? "arrow",
    color: edge.data?.color ?? null,
    labelOffset: edge.data?.labelOffset ?? null,
    labelAnchorPosition: edge.data?.labelAnchorPosition ?? null,
    manualRoute: edge.data?.manualRoute ?? null,
    manualRouteMode: edge.data?.manualRouteMode ?? null,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
  };
}

function normalizeNodeComparable(value: {
  label: string;
  properties: Record<string, JsonValue>;
  position?: Position;
  occurredAt?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  placeId?: string | null;
  participants?: string[];
}) {
  return JSON.stringify({
    label: value.label,
    properties: value.properties,
    position: normalizePosition(value.position),
    occurredAt: value.occurredAt ?? null,
    periodStart: value.periodStart ?? null,
    periodEnd: value.periodEnd ?? null,
    placeId: value.placeId ?? null,
    participants: value.participants ?? [],
  });
}

function normalizeEdgeComparable(value: {
  relation: string;
  label?: string | null;
  start?: string | null;
  end?: string | null;
  weight?: number | null;
  properties: Record<string, JsonValue>;
}) {
  return JSON.stringify({
    relation: value.relation,
    label: value.label ?? "",
    start: value.start ?? null,
    end: value.end ?? null,
    weight: value.weight ?? null,
    properties: value.properties,
  });
}

export function isBackendSyncableNode(node: AppNode): node is ShapeNode {
  return node.type === "shapeNode";
}

export function getBackendSyncDocument(document: GraphDocument) {
  const nodes = document.nodes.filter(isBackendSyncableNode);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = document.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  return {
    nodes,
    edges,
  };
}

export function createBackendNodeRequest(
  node: ShapeNode,
  graphId: string,
  baseProperties: Record<string, JsonValue> = {},
): CreateNodeRequest {
  return {
    id: node.id,
    graphId,
    type: mapShapeKindToNodeType(node.data.kind),
    label: getNodeLabel(node.data.text),
    properties: buildNodeProperties(node.data, baseProperties),
    position: normalizePosition(node.position),
    participants: [],
  };
}

export function updateBackendNodeRequest(
  node: ShapeNode,
  baseProperties: Record<string, JsonValue> = {},
): UpdateNodeRequest {
  return {
    label: getNodeLabel(node.data.text),
    properties: buildNodeProperties(node.data, baseProperties),
    position: normalizePosition(node.position),
    participants: [],
  };
}

export function hasBackendNodeChanged(node: ShapeNode, remoteNode: GraphNode) {
  const nextNode = updateBackendNodeRequest(node, remoteNode.properties);

  return (
    normalizeNodeComparable({
      label: nextNode.label ?? DEFAULT_NODE_LABEL,
      properties: nextNode.properties ?? {},
      position: nextNode.position,
      occurredAt: nextNode.occurredAt,
      periodStart: nextNode.periodStart,
      periodEnd: nextNode.periodEnd,
      placeId: nextNode.placeId,
      participants: nextNode.participants ?? [],
    }) !==
    normalizeNodeComparable({
      label: remoteNode.label,
      properties: remoteNode.properties,
      position: remoteNode.position,
      occurredAt: remoteNode.occurredAt,
      periodStart: remoteNode.periodStart,
      periodEnd: remoteNode.periodEnd,
      placeId: remoteNode.placeId,
      participants: remoteNode.participants,
    })
  );
}

export function createBackendEdgeRequest(
  edge: AppEdge,
  graphId: string,
  baseProperties: Record<string, JsonValue> = {},
): CreateEdgeRequest {
  return {
    id: edge.id,
    graphId,
    sourceId: edge.source,
    targetId: edge.target,
    relation: typeof edge.label === "string" && edge.label.trim().length > 0 ? edge.label.trim() : DEFAULT_EDGE_RELATION,
    label: typeof edge.label === "string" ? edge.label : "",
    properties: buildEdgeProperties(edge, baseProperties),
  };
}

export function updateBackendEdgeRequest(
  edge: AppEdge,
  baseProperties: Record<string, JsonValue> = {},
): UpdateEdgeRequest {
  return {
    relation: typeof edge.label === "string" && edge.label.trim().length > 0 ? edge.label.trim() : DEFAULT_EDGE_RELATION,
    label: typeof edge.label === "string" ? edge.label : "",
    properties: buildEdgeProperties(edge, baseProperties),
  };
}

export function haveBackendEdgeEndpointsChanged(edge: AppEdge, remoteEdge: GraphEdge) {
  const remoteSourceHandle =
    typeof remoteEdge.properties.sourceHandle === "string" ? remoteEdge.properties.sourceHandle : undefined;
  const remoteTargetHandle =
    typeof remoteEdge.properties.targetHandle === "string" ? remoteEdge.properties.targetHandle : undefined;

  return (
    edge.source !== remoteEdge.sourceId ||
    edge.target !== remoteEdge.targetId ||
    edge.sourceHandle !== remoteSourceHandle ||
    edge.targetHandle !== remoteTargetHandle
  );
}

export function hasBackendEdgeChanged(edge: AppEdge, remoteEdge: GraphEdge) {
  const nextEdge = updateBackendEdgeRequest(edge, remoteEdge.properties);

  return (
    normalizeEdgeComparable({
      relation: nextEdge.relation ?? DEFAULT_EDGE_RELATION,
      label: nextEdge.label ?? "",
      start: nextEdge.start,
      end: nextEdge.end,
      weight: nextEdge.weight,
      properties: nextEdge.properties ?? {},
    }) !==
    normalizeEdgeComparable({
      relation: remoteEdge.relation,
      label: remoteEdge.label ?? "",
      start: remoteEdge.start,
      end: remoteEdge.end,
      weight: remoteEdge.weight,
      properties: remoteEdge.properties,
    })
  );
}
