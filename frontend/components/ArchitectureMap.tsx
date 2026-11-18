"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  DIAGRAM_TABS,
  NODE_CATEGORY_META,
  NODE_STATUS_LABELS,
  type DiagramEdgeSpec,
  type DiagramNodeSpec,
  type DiagramTabId,
  type DiagramTabSpec,
  type NodeCategory,
  type NodeStatus,
  type PersistenceBehavior,
  type SequenceStepSpec,
  type TrainingTrackDiagramSpec,
} from "@/lib/documentationData";
import { useReducedMotion } from "@/lib/motion";
import { Badge, Button, Card, type BadgeTone } from "./ui";

const TAB_SHORT_LABELS: Record<DiagramTabId, string> = {
  system: "System",
  inference: "Inference",
  training: "Training",
  storage: "Storage",
  deployment: "Deployment",
};

const CATEGORY_ORDER: NodeCategory[] = [
  "api",
  "model",
  "dataset",
  "saved",
  "external",
];

const STATUS_ORDER: NodeStatus[] = ["implemented", "partial", "proposed"];

const STATUS_BADGE_TONE: Record<NodeStatus, BadgeTone> = {
  implemented: "success",
  partial: "warning",
  proposed: "neutral",
};

const PERSISTENCE_BADGE_TONE: Record<PersistenceBehavior, BadgeTone> = {
  Persistent: "success",
  Ephemeral: "warning",
  "Excluded from Git": "danger",
  "Runtime Memory": "neutral",
  "Build / CI": "model",
};

function getSequenceStatusTone(status: string): BadgeTone {
  const lower = status.toLowerCase();
  if (lower.includes("200")) return "success";
  if (lower.includes("422") || lower.includes("503") || lower.includes("4s")) {
    return "warning";
  }
  if (lower.includes("500") || lower.includes("30s") || lower.includes("timeout")) {
    return "danger";
  }
  return "neutral";
}

function formatStepNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function getOrderedNodesForTab(tab: DiagramTabSpec): DiagramNodeSpec[] {
  if (tab.layout === "dual_track" && tab.tracks) {
    return tab.tracks.flatMap((track) => track.nodes);
  }
  return tab.nodes;
}

function getAllEdgesForTab(tab: DiagramTabSpec): DiagramEdgeSpec[] {
  if (tab.layout === "dual_track" && tab.tracks) {
    return tab.tracks.flatMap((track) => track.edges);
  }
  return tab.edges;
}

type EdgeArrowProps = {
  active?: boolean;
  label?: string;
  orientation?: "both" | "vertical";
  proposed?: boolean;
};

function EdgeArrow({
  active = false,
  label,
  orientation = "both",
  proposed = false,
}: EdgeArrowProps) {
  return (
    <div
      aria-hidden="true"
      className={`doc-connector doc-connector--${orientation}`}
      data-active={active ? "true" : "false"}
      data-proposed={proposed ? "true" : "false"}
      title={label}
    >
      {orientation === "both" ? (
        <svg className="doc-edge doc-edge--horizontal" fill="none" viewBox="0 0 36 16">
          <path
            className="doc-edge__path"
            d="M2 8 H31"
            pathLength={100}
            strokeDasharray="100"
          />
          <path className="doc-edge__arrow" d="M27 4 L32 8 L27 12" />
        </svg>
      ) : null}
      <svg className="doc-edge doc-edge--vertical" fill="none" viewBox="0 0 16 28">
        <path
          className="doc-edge__path"
          d="M8 2 V23"
          pathLength={100}
          strokeDasharray="100"
        />
        <path className="doc-edge__arrow" d="M4 19 L8 24 L12 19" />
      </svg>
      {label ? <span className="doc-connector__label">{label}</span> : null}
    </div>
  );
}

type NodeButtonProps = {
  node: DiagramNodeSpec;
  stepNumber: number;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
};

function DiagramNodeButton({
  node,
  stepNumber,
  isSelected,
  onSelect,
}: NodeButtonProps) {
  const categoryMeta = NODE_CATEGORY_META[node.category];

  return (
    <button
      aria-current={isSelected ? "step" : undefined}
      aria-pressed={isSelected}
      className="doc-node"
      data-active={isSelected ? "true" : "false"}
      data-category={node.category}
      data-status={node.status}
      id={`doc-node-${node.id}`}
      onClick={() => onSelect(node.id)}
      type="button"
    >
      <div className="doc-node__top">
        <span className="doc-node__index tabular-nums">
          {String(stepNumber).padStart(2, "0")}
        </span>
        <span className="doc-node__category" data-category={node.category}>
          {categoryMeta.label}
        </span>
      </div>

      <span className="doc-node__title">{node.label}</span>

      {node.subtitle ? (
        <span className="doc-node__subtitle">{node.subtitle}</span>
      ) : null}

      <div className="doc-node__badges">
        <Badge tone={STATUS_BADGE_TONE[node.status]}>
          {NODE_STATUS_LABELS[node.status]}
        </Badge>
        {node.persistence ? (
          <Badge tone={PERSISTENCE_BADGE_TONE[node.persistence]}>
            {node.persistence}
          </Badge>
        ) : null}
      </div>

      <span className="doc-node__source">{node.sourceRef}</span>
    </button>
  );
}

/**
 * Interactive architecture, inference lifecycle, dual-track training, storage
 * hierarchy, and deployment/CI explorer for `/documentation`.
 */
export function ArchitectureMap() {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [activeTabId, setActiveTabId] = useState<DiagramTabId>("system");
  const [inferenceView, setInferenceView] = useState<"flowchart" | "sequence">(
    "flowchart",
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    DIAGRAM_TABS[0]?.nodes[0]?.id ?? "sys-browser-ui",
  );
  const [isPlaying, setIsPlaying] = useState(false);

  const activeTab = useMemo(
    () => DIAGRAM_TABS.find((tab) => tab.id === activeTabId) ?? DIAGRAM_TABS[0],
    [activeTabId],
  );

  const orderedNodes = useMemo(
    () => getOrderedNodesForTab(activeTab),
    [activeTab],
  );

  const allEdges = useMemo(() => getAllEdgesForTab(activeTab), [activeTab]);

  const activeIndex = useMemo(() => {
    const found = orderedNodes.findIndex((node) => node.id === selectedNodeId);
    return found >= 0 ? found : 0;
  }, [orderedNodes, selectedNodeId]);

  const activeNode = orderedNodes[activeIndex] ?? orderedNodes[0] ?? null;

  const nodeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of orderedNodes) {
      map.set(node.id, node.label);
    }
    return map;
  }, [orderedNodes]);

  const stepNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    orderedNodes.forEach((node, idx) => {
      map.set(node.id, idx + 1);
    });
    return map;
  }, [orderedNodes]);

  const connectedEdges = useMemo(() => {
    if (!activeNode) return { incoming: [], outgoing: [] };
    return {
      incoming: allEdges.filter((edge) => edge.to === activeNode.id),
      outgoing: allEdges.filter((edge) => edge.from === activeNode.id),
    };
  }, [activeNode, allEdges]);

  useEffect(() => {
    if (!isPlaying || orderedNodes.length <= 1) return;

    const timer = window.setInterval(() => {
      setSelectedNodeId((currentId) => {
        const currentIdx = orderedNodes.findIndex((n) => n.id === currentId);
        const resolvedIdx = currentIdx >= 0 ? currentIdx : 0;
        if (resolvedIdx >= orderedNodes.length - 1) {
          setIsPlaying(false);
          return orderedNodes[resolvedIdx].id;
        }
        return orderedNodes[resolvedIdx + 1].id;
      });
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isPlaying, orderedNodes]);

  useGSAP(
    () => {
      if (reducedMotion || !diagramRef.current) return;

      gsap.registerPlugin(useGSAP, ScrollTrigger);

      const nodes = gsap.utils.toArray<HTMLElement>(".doc-node");
      const edges = gsap.utils.toArray<SVGPathElement>(".doc-edge__path");
      if (nodes.length === 0 && edges.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const timeline = gsap.timeline();
        const lastIdx = Math.max(1, nodes.length - 1);

        nodes.forEach((node, index) => {
          const progress = index / lastIdx;
          const waveDelay = 0.22 * (1 - Math.pow(1 - progress, 2));

          timeline.fromTo(
            node,
            { opacity: 0, y: 10, scale: 0.98 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.24,
              ease: "power2.out",
              clearProps: "transform,opacity",
            },
            waveDelay,
          );
        });

        edges.forEach((edge, index) => {
          timeline.fromTo(
            edge,
            { strokeDashoffset: 100 },
            {
              strokeDashoffset: 0,
              duration: 0.22,
              ease: "power2.out",
              clearProps: "strokeDashoffset",
            },
            Math.min(0.24, index * 0.03 + 0.06),
          );
        });
      });

      return () => mm.revert();
    },
    {
      scope: containerRef,
      dependencies: [activeTabId, inferenceView, reducedMotion],
      revertOnUpdate: true,
    },
  );

  function selectTab(nextTabId: DiagramTabId, focusIndex?: number) {
    const nextTab =
      DIAGRAM_TABS.find((tab) => tab.id === nextTabId) ?? DIAGRAM_TABS[0];
    const nextNodes = getOrderedNodesForTab(nextTab);
    setIsPlaying(false);
    setActiveTabId(nextTabId);
    setSelectedNodeId(nextNodes[0]?.id ?? "");
    if (typeof focusIndex === "number") {
      tabRefs.current[focusIndex]?.focus();
    }
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % DIAGRAM_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + DIAGRAM_TABS.length) % DIAGRAM_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = DIAGRAM_TABS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      selectTab(DIAGRAM_TABS[nextIndex].id, nextIndex);
    }
  }

  function handleSelectNode(nodeId: string) {
    setIsPlaying(false);
    setSelectedNodeId(nodeId);
  }

  function handleStepBy(delta: number) {
    if (orderedNodes.length === 0) return;
    const bounded = Math.max(
      0,
      Math.min(orderedNodes.length - 1, activeIndex + delta),
    );
    setIsPlaying(false);
    setSelectedNodeId(orderedNodes[bounded].id);
  }

  function handlePlayPause() {
    if (orderedNodes.length <= 1) return;
    if (activeTab.layout === "inference" && inferenceView === "sequence") {
      setInferenceView("flowchart");
    }
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (activeIndex >= orderedNodes.length - 1) {
      setSelectedNodeId(orderedNodes[0].id);
    }
    setIsPlaying(true);
  }

  function handleReplay() {
    if (orderedNodes.length === 0) return;
    if (activeTab.layout === "inference" && inferenceView === "sequence") {
      setInferenceView("flowchart");
    }
    setSelectedNodeId(orderedNodes[0].id);
    setIsPlaying(orderedNodes.length > 1);
  }

  function isEdgeHighlighted(fromId: string, toId?: string): boolean {
    if (!activeNode) return false;
    if (toId) {
      return activeNode.id === fromId || activeNode.id === toId;
    }
    return activeNode.id === fromId;
  }

  function renderFlowTab(tab: DiagramTabSpec) {
    const columnMap = new Map<number, DiagramNodeSpec[]>();
    for (const node of tab.nodes) {
      const col = node.column ?? 1;
      const existing = columnMap.get(col) ?? [];
      existing.push(node);
      columnMap.set(col, existing);
    }
    const columns = Array.from(columnMap.entries()).sort((a, b) => a[0] - b[0]);

    return (
      <div className="doc-flow-grid">
        {columns.map(([colNum, colNodes], colIdx) => (
          <div className="doc-flow-stage" key={colNum}>
            <div className="doc-flow-column">
              <span className="doc-lane-label tabular-nums">
                Layer 0{colNum}
              </span>
              <div className="doc-lane-nodes">
                {colNodes.map((node) => (
                  <DiagramNodeButton
                    isSelected={activeNode?.id === node.id}
                    key={node.id}
                    node={node}
                    onSelect={handleSelectNode}
                    stepNumber={stepNumberMap.get(node.id) ?? 1}
                  />
                ))}
              </div>
            </div>

            {colIdx < columns.length - 1 ? (
              <EdgeArrow
                active={colNodes.some((n) => isEdgeHighlighted(n.id))}
                label={
                  colIdx === 0
                    ? "Fetch client"
                    : colIdx === 1
                      ? "HTTP/JSON"
                      : colIdx === 2
                        ? "Inference & manifests"
                        : "Sync & corpora"
                }
              />
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  function renderInferenceFlowchart(tab: DiagramTabSpec) {
    const byId = new Map(tab.nodes.map((node) => [node.id, node]));
    const leadIds = ["inf-browser", "inf-fetch", "inf-cors", "inf-routes"];
    const branchIds = ["inf-amazon-loader", "inf-goemotions-loader"];
    const tailId = "inf-ui-render";

    const leadNodes = leadIds
      .map((id) => byId.get(id))
      .filter((n): n is DiagramNodeSpec => Boolean(n));
    const branchNodes = branchIds
      .map((id) => byId.get(id))
      .filter((n): n is DiagramNodeSpec => Boolean(n));
    const tailNode = byId.get(tailId);

    return (
      <div className="doc-inference-flow">
        {leadNodes.map((node, idx) => {
          const nextNode = leadNodes[idx + 1];
          const edge = tab.edges.find(
            (e) =>
              e.from === node.id &&
              (nextNode ? e.to === nextNode.id : e.to === branchIds[0]),
          );
          return (
            <div className="doc-inference-stage" key={node.id}>
              <DiagramNodeButton
                isSelected={activeNode?.id === node.id}
                node={node}
                onSelect={handleSelectNode}
                stepNumber={stepNumberMap.get(node.id) ?? idx + 1}
              />
              <EdgeArrow
                active={isEdgeHighlighted(node.id, nextNode?.id)}
                label={edge?.label}
              />
            </div>
          );
        })}

        <div className="doc-inference-branch">
          <div className="doc-lane-nodes">
            {branchNodes.map((node) => (
              <DiagramNodeButton
                isSelected={activeNode?.id === node.id}
                key={node.id}
                node={node}
                onSelect={handleSelectNode}
                stepNumber={stepNumberMap.get(node.id) ?? 5}
              />
            ))}
          </div>
          <EdgeArrow
            active={
              branchNodes.some((n) => n.id === activeNode?.id) ||
              activeNode?.id === tailId
            }
            label="Raw prediction JSON"
          />
        </div>

        {tailNode ? (
          <div className="doc-inference-stage">
            <DiagramNodeButton
              isSelected={activeNode?.id === tailNode.id}
              node={tailNode}
              onSelect={handleSelectNode}
              stepNumber={stepNumberMap.get(tailNode.id) ?? 7}
            />
          </div>
        ) : null}
      </div>
    );
  }

  function renderSequenceView(steps: SequenceStepSpec[]) {
    return (
      <div className="doc-sequence">
        <p className="doc-sequence__intro">
          Ordered caller-to-callee request lifecycle showing CORS preflight
          avoidance, 4s stall notice, 30s AbortController cancellation, and exact
          FastAPI HTTP status codes.
        </p>
        <ol className="doc-sequence-list">
          {steps.map((step) => (
            <li className="doc-sequence-item" key={step.step}>
              <div className="doc-sequence-item__head">
                <span className="doc-node__index tabular-nums">
                  {String(step.step).padStart(2, "0")}
                </span>
                <div className="doc-sequence-lanes">
                  <span className="doc-sequence-actor">{step.from}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="doc-sequence-arrow"
                    size={14}
                  />
                  <span className="doc-sequence-actor doc-sequence-actor--callee">
                    {step.to}
                  </span>
                </div>
                <Badge tone={getSequenceStatusTone(step.status)}>
                  {step.status}
                </Badge>
              </div>
              <p className="doc-sequence-item__message">{step.message}</p>
              <p className="doc-sequence-item__detail">
                <code>{step.payloadOrDetail}</code>
              </p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  function renderTrainingTracks(tracks: TrainingTrackDiagramSpec[]) {
    return (
      <div className="doc-tracks">
        {tracks.map((track) => (
          <section
            aria-label={track.title}
            className="doc-track-panel"
            data-track={track.id}
            key={track.id}
          >
            <div className="doc-track-panel__head">
              <div>
                <h3 className="doc-track-panel__title">{track.title}</h3>
                <p className="doc-track-panel__subtitle">{track.subtitle}</p>
              </div>
              <div className="doc-track-panel__links">
                <a
                  className="doc-inline-link"
                  href={track.sourceUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span>Dataset source</span>
                  <ExternalLink aria-hidden="true" size={13} />
                </a>
                <Link className="doc-inline-link" href="/model-lab">
                  <span>Inspect in Model Lab</span>
                </Link>
              </div>
            </div>

            <div className="doc-track-chain">
              {track.nodes.map((node, idx) => {
                const nextNode = track.nodes[idx + 1];
                const edge = track.edges.find(
                  (e) => e.from === node.id && e.to === nextNode?.id,
                );
                return (
                  <div className="doc-chain-item" key={node.id}>
                    <DiagramNodeButton
                      isSelected={activeNode?.id === node.id}
                      node={node}
                      onSelect={handleSelectNode}
                      stepNumber={stepNumberMap.get(node.id) ?? idx + 1}
                    />
                    {nextNode ? (
                      <EdgeArrow
                        active={isEdgeHighlighted(node.id, nextNode.id)}
                        label={edge?.label}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderStorageTree(tab: DiagramTabSpec) {
    const colabNodes = tab.nodes.filter((n) => n.group === "Colab Runtime");
    const driveRoot = tab.nodes.find((n) => n.id === "st-drive-root");
    const driveChildren = tab.nodes.filter(
      (n) =>
        n.group === "Logical Google Drive Tree" && n.id !== "st-drive-root",
    );
    const localNodes = tab.nodes.filter((n) => n.group === "Local Workspace");

    return (
      <div className="doc-storage-tree">
        <div className="doc-storage-tier">
          <div className="doc-storage-tier__head">
            <span className="doc-lane-label">Tier 01 — Ephemeral Compute</span>
            <Badge tone="warning">Ephemeral</Badge>
          </div>
          <div className="doc-lane-nodes">
            {colabNodes.map((node) => (
              <DiagramNodeButton
                isSelected={activeNode?.id === node.id}
                key={node.id}
                node={node}
                onSelect={handleSelectNode}
                stepNumber={stepNumberMap.get(node.id) ?? 1}
              />
            ))}
          </div>
        </div>

        <EdgeArrow
          active={
            activeNode?.id === "st-colab-vm" ||
            activeNode?.id === "st-drive-root"
          }
          label="Persist outputs before disconnect"
          orientation="vertical"
        />

        <div className="doc-storage-tier doc-storage-tier--drive">
          <div className="doc-storage-tier__head">
            <span className="doc-lane-label">
              Tier 02 — Google Drive (NLP Lab Workspace)
            </span>
            <Badge tone="success">Persistent Workspace</Badge>
          </div>

          {driveRoot ? (
            <div className="doc-storage-root">
              <DiagramNodeButton
                isSelected={activeNode?.id === driveRoot.id}
                node={driveRoot}
                onSelect={handleSelectNode}
                stepNumber={stepNumberMap.get(driveRoot.id) ?? 2}
              />
            </div>
          ) : null}

          <div className="doc-storage-children">
            {driveChildren.map((node) => (
              <DiagramNodeButton
                isSelected={activeNode?.id === node.id}
                key={node.id}
                node={node}
                onSelect={handleSelectNode}
                stepNumber={stepNumberMap.get(node.id) ?? 3}
              />
            ))}
          </div>
        </div>

        <EdgeArrow
          active={
            activeNode?.id === "st-drive-root" ||
            activeNode?.id === "st-local-repo"
          }
          label="sync_drive.py (sanitized manifests & serving weights)"
          orientation="vertical"
        />

        <div className="doc-storage-tier">
          <div className="doc-storage-tier__head">
            <span className="doc-lane-label">
              Tier 03 — Local Repository &amp; sync_drive.py
            </span>
            <Badge tone="danger">Raw Corpora Excluded from Git</Badge>
          </div>
          <div className="doc-lane-nodes">
            {localNodes.map((node) => (
              <DiagramNodeButton
                isSelected={activeNode?.id === node.id}
                key={node.id}
                node={node}
                onSelect={handleSelectNode}
                stepNumber={stepNumberMap.get(node.id) ?? 10}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderDeploymentTab(tab: DiagramTabSpec) {
    const groupMap = new Map<string, DiagramNodeSpec[]>();
    for (const node of tab.nodes) {
      const title = node.group?.trim() || "Pipeline";
      const existing = groupMap.get(title);
      if (existing) {
        existing.push(node);
      } else {
        groupMap.set(title, [node]);
      }
    }

    const groups = Array.from(groupMap.entries(), ([title, nodes]) => ({
      title,
      nodes,
    }));

    return (
      <div className="doc-deploy-grid">
        {groups.map((group) => (
          <div className="doc-deploy-lane" key={group.title}>
            <span className="doc-lane-label">{group.title}</span>
            <div className="doc-deploy-chain">
              {group.nodes.map((node, idx) => {
                const nextNode = group.nodes[idx + 1];
                const edge = tab.edges.find(
                  (e) =>
                    (e.from === node.id && e.to === nextNode?.id) ||
                    (e.to === node.id && e.from === nextNode?.id),
                );
                return (
                  <div className="doc-deploy-item" key={node.id}>
                    <DiagramNodeButton
                      isSelected={activeNode?.id === node.id}
                      node={node}
                      onSelect={handleSelectNode}
                      stepNumber={stepNumberMap.get(node.id) ?? idx + 1}
                    />
                    {nextNode ? (
                      <EdgeArrow
                        active={isEdgeHighlighted(node.id, nextNode.id)}
                        label={edge?.label}
                        orientation="vertical"
                        proposed={edge?.status === "proposed"}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label="Interactive architecture diagrams"
      className="doc-section"
      data-reduced-motion={reducedMotion ? "true" : undefined}
      id="architecture-map"
      ref={containerRef}
    >
      <Card kicker={activeTab.kicker} title="Interactive Architecture Map">
        <div className="doc-map-toolbar">
          <div
            aria-label="Architecture diagram views"
            className="doc-tablist"
            role="tablist"
          >
            {DIAGRAM_TABS.map((tab, index) => {
              const isSelected = tab.id === activeTab.id;
              return (
                <button
                  aria-controls={`doc-tabpanel-${tab.id}`}
                  aria-selected={isSelected}
                  className="doc-tab"
                  id={`doc-tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => selectTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  role="tab"
                  tabIndex={isSelected ? 0 : -1}
                  type="button"
                >
                  {TAB_SHORT_LABELS[tab.id]}
                </button>
              );
            })}
          </div>

          <div className="doc-step-controls">
            <span className="specimen tabular-nums">
              Step {formatStepNumber(activeIndex)} /{" "}
              {String(orderedNodes.length).padStart(2, "0")}
            </span>
            <div className="doc-step-buttons">
              <Button
                aria-pressed={isPlaying}
                disabled={orderedNodes.length <= 1}
                onClick={handlePlayPause}
                type="button"
                variant="secondary"
              >
                {isPlaying ? (
                  <>
                    <Pause aria-hidden="true" size={14} />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play aria-hidden="true" size={14} />
                    <span>Play</span>
                  </>
                )}
              </Button>
              <Button
                disabled={orderedNodes.length === 0}
                onClick={handleReplay}
                type="button"
                variant="secondary"
              >
                <RotateCcw aria-hidden="true" size={14} />
                <span>Replay</span>
              </Button>
              <Button
                aria-label="Previous architecture node"
                disabled={activeIndex <= 0}
                onClick={() => handleStepBy(-1)}
                type="button"
                variant="secondary"
              >
                <ChevronLeft aria-hidden="true" size={14} />
                <span>Prev</span>
              </Button>
              <Button
                aria-label="Next architecture node"
                disabled={activeIndex >= orderedNodes.length - 1}
                onClick={() => handleStepBy(1)}
                type="button"
                variant="secondary"
              >
                <span>Next</span>
                <ChevronRight aria-hidden="true" size={14} />
              </Button>
            </div>
          </div>
        </div>

        <div className="doc-legend" aria-label="Diagram legend">
          <div className="doc-legend__group">
            <span className="doc-legend__heading">Node categories</span>
            <ul className="doc-legend__items">
              {CATEGORY_ORDER.map((cat) => (
                <li
                  className="doc-legend__item"
                  data-category={cat}
                  key={cat}
                  title={NODE_CATEGORY_META[cat].description}
                >
                  <span
                    aria-hidden="true"
                    className="doc-legend__swatch"
                    data-category={cat}
                  />
                  <span>{NODE_CATEGORY_META[cat].label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="doc-legend__group">
            <span className="doc-legend__heading">Lifecycle status</span>
            <ul className="doc-legend__items">
              {STATUS_ORDER.map((status) => (
                <li
                  className="doc-legend__item"
                  data-status={status}
                  key={status}
                >
                  <span
                    aria-hidden="true"
                    className="doc-legend__border-sample"
                    data-status={status}
                  />
                  <Badge tone={STATUS_BADGE_TONE[status]}>
                    {NODE_STATUS_LABELS[status]}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          aria-labelledby={`doc-tab-${activeTab.id}`}
          className="doc-tabpanel"
          id={`doc-tabpanel-${activeTab.id}`}
          role="tabpanel"
        >
          <div className="doc-tabpanel__head">
            <div>
              <h3 className="doc-tabpanel__title">{activeTab.label}</h3>
              <p className="doc-tabpanel__desc">{activeTab.description}</p>
            </div>

            {activeTab.layout === "inference" && activeTab.sequenceSteps ? (
              <div
                aria-label="Inference diagram view"
                className="dataset-segmented"
                role="radiogroup"
              >
                <button
                  aria-checked={inferenceView === "flowchart"}
                  className="dataset-segmented__btn"
                  onClick={() => setInferenceView("flowchart")}
                  role="radio"
                  type="button"
                >
                  Flowchart
                </button>
                <button
                  aria-checked={inferenceView === "sequence"}
                  className="dataset-segmented__btn"
                  onClick={() => {
                    setIsPlaying(false);
                    setInferenceView("sequence");
                  }}
                  role="radio"
                  type="button"
                >
                  Sequence view
                </button>
              </div>
            ) : null}
          </div>

          <div className="doc-diagram-canvas" ref={diagramRef}>
            {activeTab.layout === "flow" ? renderFlowTab(activeTab) : null}

            {activeTab.layout === "inference"
              ? inferenceView === "sequence" && activeTab.sequenceSteps
                ? renderSequenceView(activeTab.sequenceSteps)
                : renderInferenceFlowchart(activeTab)
              : null}

            {activeTab.layout === "dual_track" && activeTab.tracks
              ? renderTrainingTracks(activeTab.tracks)
              : null}

            {activeTab.layout === "storage_tree"
              ? renderStorageTree(activeTab)
              : null}

            {activeTab.layout === "deployment"
              ? renderDeploymentTab(activeTab)
              : null}
          </div>

          {activeNode &&
          !(activeTab.layout === "inference" && inferenceView === "sequence") ? (
            <div
              aria-label="Selected node details"
              className="doc-inspector"
              role="region"
            >
              <div className="doc-inspector__head">
                <div className="doc-inspector__title-group">
                  <div className="doc-inspector__kicker-row">
                    <span className="specimen tabular-nums">
                      Node {formatStepNumber(activeIndex)} of{" "}
                      {String(orderedNodes.length).padStart(2, "0")}
                    </span>
                    <span
                      className="doc-node__category"
                      data-category={activeNode.category}
                    >
                      {NODE_CATEGORY_META[activeNode.category].label}
                    </span>
                  </div>
                  <h3 className="doc-inspector__title">{activeNode.label}</h3>
                  {activeNode.subtitle ? (
                    <p className="doc-inspector__subtitle">
                      {activeNode.subtitle}
                    </p>
                  ) : null}
                </div>

                <div className="doc-inspector__badges">
                  <Badge tone={STATUS_BADGE_TONE[activeNode.status]}>
                    {NODE_STATUS_LABELS[activeNode.status]}
                  </Badge>
                  {activeNode.persistence ? (
                    <Badge
                      tone={PERSISTENCE_BADGE_TONE[activeNode.persistence]}
                    >
                      {activeNode.persistence}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <p className="doc-inspector__summary">{activeNode.summary}</p>

              <dl className="doc-inspector__meta">
                <div>
                  <dt>Inputs</dt>
                  <dd>
                    {activeNode.inputs.length > 0 ? (
                      <ul className="doc-code-list">
                        {activeNode.inputs.map((item) => (
                          <li key={item}>
                            <code>{item}</code>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="muted">None</span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Outputs</dt>
                  <dd>
                    {activeNode.outputs.length > 0 ? (
                      <ul className="doc-code-list">
                        {activeNode.outputs.map((item) => (
                          <li key={item}>
                            <code>{item}</code>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="muted">None</span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Connections</dt>
                  <dd>
                    {connectedEdges.incoming.length > 0 ||
                    connectedEdges.outgoing.length > 0 ? (
                      <ul className="doc-edge-list">
                        {connectedEdges.incoming.map((edge) => (
                          <li key={edge.id}>
                            <span className="doc-edge-dir">In</span>{" "}
                            <span>
                              {nodeLabelMap.get(edge.from) ?? edge.from}
                            </span>{" "}
                            <span className="muted">— {edge.label}</span>
                            {edge.protocolOrFormat ? (
                              <code>{edge.protocolOrFormat}</code>
                            ) : null}
                          </li>
                        ))}
                        {connectedEdges.outgoing.map((edge) => (
                          <li key={edge.id}>
                            <span className="doc-edge-dir">Out</span>{" "}
                            <span>{nodeLabelMap.get(edge.to) ?? edge.to}</span>{" "}
                            <span className="muted">— {edge.label}</span>
                            {edge.protocolOrFormat ? (
                              <code>{edge.protocolOrFormat}</code>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="muted">
                        Standalone node in this view
                      </span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Source reference</dt>
                  <dd>
                    <code>{activeNode.sourceRef}</code>
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
