"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DatasetSummaryItem } from "@/lib/api";
import { useReducedMotion } from "@/lib/motion";
import { Badge, Card } from "./ui";

type DatasetChartsProps = {
  datasetId: string;
  dataset: DatasetSummaryItem;
};

type TooltipEntry = {
  name?: string;
  value?: number | string | Array<number | string>;
  color?: string;
  payload?: Record<string, unknown>;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  unitLabel?: string;
  formatEntry?: (entry: TooltipEntry) => string;
};

const integerFormatter = new Intl.NumberFormat("en-US");
const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const SPLIT_ORDER = [
  "train",
  "validation",
  "test",
  "sampled_train",
  "sampled_validation",
  "sampled_test",
];

const SPLIT_DISPLAY_LABEL: Record<string, string> = {
  train: "Train",
  validation: "Validation",
  test: "Test",
  sampled_train: "Sampled train",
  sampled_validation: "Sampled validation",
  sampled_test: "Sampled test",
};

const QUANTILE_ORDER: Array<{ key: string; label: string }> = [
  { key: "min", label: "Min" },
  { key: "p50", label: "p50" },
  { key: "mean", label: "Mean" },
  { key: "p75", label: "p75" },
  { key: "p90", label: "p90" },
  { key: "p95", label: "p95" },
  { key: "p99", label: "p99" },
  { key: "max", label: "Max" },
];

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? integerFormatter.format(value)
    : decimalFormatter.format(value);
}

function formatCompactTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

function orderSplits(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const idxA = SPLIT_ORDER.indexOf(a);
    const idxB = SPLIT_ORDER.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
}

function ChartTooltip({
  active,
  payload,
  label,
  unitLabel,
  formatEntry,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="dataset-tooltip">
      <p className="dataset-tooltip__title">{String(label ?? "")}</p>
      <ul className="dataset-tooltip__list">
        {payload.map((entry, idx) => {
          if (entry.value === null || entry.value === undefined) return null;
          const formatted = formatEntry
            ? formatEntry(entry)
            : typeof entry.value === "number"
              ? `${formatNumber(entry.value)}${unitLabel ? ` ${unitLabel}` : ""}`
              : String(entry.value);
          return (
            <li className="dataset-tooltip__row" key={`${entry.name ?? idx}`}>
              <span className="dataset-tooltip__name">{entry.name}</span>
              <span className="dataset-tooltip__value">{formatted}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DatasetCharts({ datasetId, dataset }: DatasetChartsProps) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAmazon = datasetId === "amazon_reviews";
  const isGoEmotions = datasetId === "go_emotions";

  // 1. Class distribution / Emotion prevalence splits
  const distributionSource = useMemo(
    () => dataset.class_distribution ?? dataset.class_prevalence ?? null,
    [dataset.class_distribution, dataset.class_prevalence],
  );

  const availableDistributionSplits = useMemo(
    () => (distributionSource ? orderSplits(Object.keys(distributionSource)) : []),
    [distributionSource],
  );

  const [selectedSplit, setSelectedSplit] = useState<string>(
    availableDistributionSplits[0] ?? "train",
  );
  const [emotionView, setEmotionView] = useState<"head_tail" | "all_28">(
    "head_tail",
  );
  const [cardinalityMode, setCardinalityMode] = useState<"share" | "count">(
    "share",
  );

  useEffect(() => {
    if (
      availableDistributionSplits.length > 0 &&
      !availableDistributionSplits.includes(selectedSplit)
    ) {
      setSelectedSplit(availableDistributionSplits[0]);
    }
  }, [availableDistributionSplits, selectedSplit]);

  const activeDistributionSplit = availableDistributionSplits.includes(
    selectedSplit,
  )
    ? selectedSplit
    : availableDistributionSplits[0];

  const activeSplitCounts = useMemo(() => {
    if (!distributionSource || !activeDistributionSplit) return null;
    return distributionSource[activeDistributionSplit] ?? null;
  }, [distributionSource, activeDistributionSplit]);

  const activeSplitTotal = useMemo(() => {
    if (!activeDistributionSplit) return 0;
    const explicitSplitTotal = dataset.splits?.[activeDistributionSplit];
    if (typeof explicitSplitTotal === "number" && explicitSplitTotal > 0) {
      return explicitSplitTotal;
    }
    if (!activeSplitCounts) return 0;
    return Object.values(activeSplitCounts).reduce((acc, n) => acc + n, 0);
  }, [dataset.splits, activeDistributionSplit, activeSplitCounts]);

  const amazonDistributionData = useMemo(() => {
    if (!isAmazon || !activeSplitCounts) return [];
    const total = activeSplitTotal || 1;
    return Object.entries(activeSplitCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([rating, count]) => ({
        label: `${rating} star${rating === "1" ? "" : "s"}`,
        count,
        sharePct: (count / total) * 100,
      }));
  }, [isAmazon, activeSplitCounts, activeSplitTotal]);

  const goEmotionsRanked = useMemo(() => {
    if (!isGoEmotions || !activeSplitCounts) return [];
    const total = activeSplitTotal || 1;
    return Object.entries(activeSplitCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([emotion, count], index) => ({
        rank: index + 1,
        emotion,
        count,
        sharePct: (count / total) * 100,
      }));
  }, [isGoEmotions, activeSplitCounts, activeSplitTotal]);

  const goEmotionsChartData = useMemo(() => {
    if (goEmotionsRanked.length === 0) return [];
    if (emotionView === "all_28" || goEmotionsRanked.length <= 15) {
      return goEmotionsRanked.map((row) => ({
        emotion: row.emotion,
        rank: row.rank,
        count: row.count,
        sharePct: row.sharePct,
      }));
    }
    const head = goEmotionsRanked.slice(0, 10).map((row) => ({
      emotion: row.emotion,
      rank: row.rank,
      headCount: row.count,
      tailCount: null as number | null,
      count: row.count,
      sharePct: row.sharePct,
    }));
    const tail = goEmotionsRanked.slice(-5).map((row) => ({
      emotion: row.emotion,
      rank: row.rank,
      headCount: null as number | null,
      tailCount: row.count,
      count: row.count,
      sharePct: row.sharePct,
    }));
    return [...head, ...tail];
  }, [goEmotionsRanked, emotionView]);

  const imbalanceStats = useMemo(() => {
    if (goEmotionsRanked.length < 2) return null;
    const head = goEmotionsRanked[0];
    const tail = goEmotionsRanked[goEmotionsRanked.length - 1];
    if (!head || !tail || tail.count <= 0) return null;
    return {
      head,
      tail,
      ratio: head.count / tail.count,
    };
  }, [goEmotionsRanked]);

  // 2. Multi-label cardinality across splits
  const cardinalitySplits = useMemo(
    () =>
      dataset.labels_per_example
        ? orderSplits(Object.keys(dataset.labels_per_example))
        : [],
    [dataset.labels_per_example],
  );

  const cardinalityData = useMemo(() => {
    if (!dataset.labels_per_example || cardinalitySplits.length === 0) {
      return [];
    }
    const cardinalities = new Set<string>();
    const splitTotals: Record<string, number> = {};
    for (const split of cardinalitySplits) {
      const counts = dataset.labels_per_example[split] ?? {};
      let sum = 0;
      for (const [k, v] of Object.entries(counts)) {
        cardinalities.add(k);
        sum += v;
      }
      splitTotals[split] = dataset.splits?.[split] || sum || 1;
    }

    return [...cardinalities]
      .sort((a, b) => Number(a) - Number(b))
      .map((countKey) => {
        const row: Record<string, string | number> = {
          labels: `${countKey} label${countKey === "1" ? "" : "s"}`,
        };
        for (const split of cardinalitySplits) {
          const raw = dataset.labels_per_example?.[split]?.[countKey] ?? 0;
          const total = splitTotals[split] || 1;
          row[`${split}_count`] = raw;
          row[`${split}_pct`] = (raw / total) * 100;
        }
        return row;
      });
  }, [dataset.labels_per_example, dataset.splits, cardinalitySplits]);

  // 3. Sequence length quantile profile
  const lengthStats = dataset.text_length_stats;
  const quantileData = useMemo(() => {
    if (!lengthStats?.recorded) return [];
    return QUANTILE_ORDER.filter(
      (q) => typeof lengthStats[q.key] === "number",
    ).map((q) => ({
      quantile: q.label,
      value: lengthStats[q.key] as number,
    }));
  }, [lengthStats]);

  const sequenceCap =
    typeof lengthStats?.max_sequence_cap === "number"
      ? lengthStats.max_sequence_cap
      : null;

  const axisTickStyle = {
    fill: "var(--color-text-muted)",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
  };

  const goEmotionsChartHeight =
    emotionView === "all_28" && goEmotionsRanked.length > 15 ? 640 : 380;

  return (
    <div className="datasets-charts-stack">
      {/* Chart A: Class Distribution / Emotion Prevalence */}
      {distributionSource && availableDistributionSplits.length > 0 ? (
        <Card
          className="dataset-chart-card"
          kicker={
            isAmazon
              ? "Chart 01 / Class distribution"
              : "Chart 01 / Label prevalence"
          }
          title={
            isAmazon
              ? "Star rating class distribution"
              : "Emotion label prevalence across splits"
          }
        >
          <div className="dataset-chart__toolbar">
            <div
              aria-label="Select dataset split"
              className="dataset-segmented"
              role="group"
            >
              {availableDistributionSplits.map((split) => (
                <button
                  aria-pressed={activeDistributionSplit === split}
                  className="dataset-segmented__btn"
                  key={split}
                  onClick={() => setSelectedSplit(split)}
                  type="button"
                >
                  {SPLIT_DISPLAY_LABEL[split] ?? split}
                </button>
              ))}
            </div>

            {isGoEmotions ? (
              <div
                aria-label="Emotion list view"
                className="dataset-segmented"
                role="group"
              >
                <button
                  aria-pressed={emotionView === "head_tail"}
                  className="dataset-segmented__btn"
                  onClick={() => setEmotionView("head_tail")}
                  type="button"
                >
                  Top 10 vs Tail 5
                </button>
                <button
                  aria-pressed={emotionView === "all_28"}
                  className="dataset-segmented__btn"
                  onClick={() => setEmotionView("all_28")}
                  type="button"
                >
                  All {goEmotionsRanked.length} Ranked
                </button>
              </div>
            ) : null}
          </div>

          {isGoEmotions && imbalanceStats ? (
            <div className="dataset-chart__summary">
              <Badge tone="warning">
                {imbalanceStats.ratio.toFixed(1)}:1 head-to-tail ratio (
                {SPLIT_DISPLAY_LABEL[activeDistributionSplit ?? ""] ??
                  activeDistributionSplit}
                )
              </Badge>
              <span className="dataset-chart__stat">
                {imbalanceStats.head.emotion}:{" "}
                {formatNumber(imbalanceStats.head.count)} vs{" "}
                {imbalanceStats.tail.emotion}:{" "}
                {formatNumber(imbalanceStats.tail.count)}
              </span>
            </div>
          ) : null}

          {isAmazon && activeSplitTotal > 0 ? (
            <p className="dataset-chart__caption">
              Split total:{" "}
              <span className="tabular-nums">
                {formatNumber(activeSplitTotal)}
              </span>{" "}
              reviews across 5 star classes.
            </p>
          ) : null}

          {isAmazon ? (
            <div className="dataset-chart__frame">
              {mounted ? (
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart
                    data={amazonDistributionData}
                    margin={{ top: 14, right: 12, left: 6, bottom: 8 }}
                  >
                    <CartesianGrid
                      stroke="var(--color-border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      axisLine={{ stroke: "var(--color-border-strong)" }}
                      dataKey="label"
                      tick={axisTickStyle}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={{ stroke: "var(--color-border-strong)" }}
                      tick={axisTickStyle}
                      tickFormatter={formatCompactTick}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatEntry={(entry) => {
                            const count =
                              typeof entry.value === "number" ? entry.value : 0;
                            const share =
                              typeof entry.payload?.sharePct === "number"
                                ? entry.payload.sharePct
                                : 0;
                            return `${formatNumber(count)} (${share.toFixed(1)}%)`;
                          }}
                        />
                      }
                      cursor={{ fill: "var(--color-surface-raised)" }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: "12px",
                        color: "var(--color-text-muted)",
                        fontFamily: "var(--font-sans)",
                      }}
                    />
                    <Bar
                      animationDuration={280}
                      dataKey="count"
                      fill="var(--color-primary)"
                      isAnimationActive={!reducedMotion}
                      name={`${SPLIT_DISPLAY_LABEL[activeDistributionSplit ?? ""] ?? activeDistributionSplit} review count`}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="dataset-chart__placeholder" />
              )}
            </div>
          ) : (
            <div
              className="dataset-chart__frame"
              style={{ height: `${goEmotionsChartHeight}px` }}
            >
              {mounted ? (
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart
                    data={goEmotionsChartData}
                    key={`go-${emotionView}-${activeDistributionSplit}`}
                    layout="vertical"
                    margin={{ top: 10, right: 16, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid
                      horizontal={false}
                      stroke="var(--color-border)"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      axisLine={{ stroke: "var(--color-border-strong)" }}
                      tick={axisTickStyle}
                      tickFormatter={formatCompactTick}
                      tickLine={false}
                      type="number"
                    />
                    <YAxis
                      axisLine={{ stroke: "var(--color-border-strong)" }}
                      dataKey="emotion"
                      interval={0}
                      tick={axisTickStyle}
                      tickLine={false}
                      type="category"
                      width={106}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatEntry={(entry) => {
                            const count =
                              typeof entry.value === "number" ? entry.value : 0;
                            const share =
                              typeof entry.payload?.sharePct === "number"
                                ? entry.payload.sharePct
                                : 0;
                            const rank =
                              typeof entry.payload?.rank === "number"
                                ? ` · #${entry.payload.rank}`
                                : "";
                            return `${formatNumber(count)} (${share.toFixed(2)}%${rank})`;
                          }}
                        />
                      }
                      cursor={{ fill: "var(--color-surface-raised)" }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: "12px",
                        color: "var(--color-text-muted)",
                        fontFamily: "var(--font-sans)",
                      }}
                    />
                    {emotionView === "head_tail" &&
                    goEmotionsRanked.length > 15 ? (
                      <>
                        <Bar
                          animationDuration={280}
                          dataKey="headCount"
                          fill="var(--color-primary)"
                          isAnimationActive={!reducedMotion}
                          name="Top 10 head labels"
                          radius={[0, 4, 4, 0]}
                          stackId="prevalence"
                        />
                        <Bar
                          animationDuration={280}
                          dataKey="tailCount"
                          fill="var(--color-warning)"
                          isAnimationActive={!reducedMotion}
                          name="Tail 5 rare labels"
                          radius={[0, 4, 4, 0]}
                          stackId="prevalence"
                        />
                      </>
                    ) : (
                      <Bar
                        animationDuration={280}
                        dataKey="count"
                        fill="var(--color-primary)"
                        isAnimationActive={!reducedMotion}
                        name="Label occurrences"
                        radius={[0, 4, 4, 0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="dataset-chart__placeholder" />
              )}
            </div>
          )}
        </Card>
      ) : null}

      {/* Chart B: GoEmotions Multi-Label Cardinality */}
      {cardinalityData.length > 0 ? (
        <Card
          className="dataset-chart-card"
          kicker="Chart 02 / Multi-label cardinality"
          title="Labels per comment across splits"
        >
          <div className="dataset-chart__toolbar">
            <p className="dataset-chart__caption">
              Share of comments carrying 1 through 5 simultaneous emotion labels.
            </p>
            <div
              aria-label="Cardinality metric mode"
              className="dataset-segmented"
              role="group"
            >
              <button
                aria-pressed={cardinalityMode === "share"}
                className="dataset-segmented__btn"
                onClick={() => setCardinalityMode("share")}
                type="button"
              >
                Share (%)
              </button>
              <button
                aria-pressed={cardinalityMode === "count"}
                className="dataset-segmented__btn"
                onClick={() => setCardinalityMode("count")}
                type="button"
              >
                Row count
              </button>
            </div>
          </div>

          <div className="dataset-chart__frame">
            {mounted ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={cardinalityData}
                  margin={{ top: 14, right: 12, left: 6, bottom: 8 }}
                >
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={{ stroke: "var(--color-border-strong)" }}
                    dataKey="labels"
                    tick={axisTickStyle}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={{ stroke: "var(--color-border-strong)" }}
                    tick={axisTickStyle}
                    tickFormatter={(v: number) =>
                      cardinalityMode === "share"
                        ? `${v}%`
                        : formatCompactTick(v)
                    }
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatEntry={(entry) => {
                          const splitKey =
                            entry.name === "Train"
                              ? "train"
                              : entry.name === "Validation"
                                ? "validation"
                                : "test";
                          const rawCount = entry.payload?.[`${splitKey}_count`];
                          const pct = entry.payload?.[`${splitKey}_pct`];
                          const countStr =
                            typeof rawCount === "number"
                              ? formatNumber(rawCount)
                              : "0";
                          const pctStr =
                            typeof pct === "number" ? pct.toFixed(2) : "0.00";
                          return `${countStr} rows (${pctStr}%)`;
                        }}
                      />
                    }
                    cursor={{ fill: "var(--color-surface-raised)" }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                      fontFamily: "var(--font-sans)",
                    }}
                  />
                  {cardinalitySplits.includes("train") ? (
                    <Bar
                      animationDuration={280}
                      dataKey={
                        cardinalityMode === "share"
                          ? "train_pct"
                          : "train_count"
                      }
                      fill="var(--color-primary)"
                      isAnimationActive={!reducedMotion}
                      name="Train"
                      radius={[4, 4, 0, 0]}
                    />
                  ) : null}
                  {cardinalitySplits.includes("validation") ? (
                    <Bar
                      animationDuration={280}
                      dataKey={
                        cardinalityMode === "share"
                          ? "validation_pct"
                          : "validation_count"
                      }
                      fill="var(--color-ai-accent)"
                      isAnimationActive={!reducedMotion}
                      name="Validation"
                      radius={[4, 4, 0, 0]}
                    />
                  ) : null}
                  {cardinalitySplits.includes("test") ? (
                    <Bar
                      animationDuration={280}
                      dataKey={
                        cardinalityMode === "share"
                          ? "test_pct"
                          : "test_count"
                      }
                      fill="var(--color-success)"
                      isAnimationActive={!reducedMotion}
                      name="Test"
                      radius={[4, 4, 0, 0]}
                    />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="dataset-chart__placeholder" />
            )}
          </div>
        </Card>
      ) : null}

      {/* Chart C: Sequence Length Quantile Profile */}
      {lengthStats?.recorded && quantileData.length > 0 ? (
        <Card
          className="dataset-chart-card"
          kicker="Chart 03 / Verified quantile summary stats"
          title={`Sequence length quantile profile (${lengthStats.unit ?? "tokens"})`}
        >
          <div className="dataset-chart__summary">
            <Badge tone="model">Verified quantile summary</Badge>
            {sequenceCap !== null ? (
              <Badge tone="warning">
                max_sequence_cap: {formatNumber(sequenceCap)}{" "}
                {lengthStats.unit ?? ""}
              </Badge>
            ) : null}
          </div>

          <p className="dataset-chart__caption">
            {lengthStats.scope ? `${lengthStats.scope}. ` : ""}
            Plots only recorded summary quantiles from repository audit artifacts
            (no fabricated histogram bins).
            {typeof lengthStats.std === "number"
              ? ` Standard deviation: ${formatNumber(lengthStats.std)}.`
              : ""}
            {typeof lengthStats.exceeding_max_length === "number"
              ? ` Examples exceeding cap: ${formatNumber(lengthStats.exceeding_max_length)}.`
              : ""}
          </p>

          <div className="dataset-chart__frame">
            {mounted ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={quantileData}
                  margin={{ top: 20, right: 16, left: 6, bottom: 8 }}
                >
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={{ stroke: "var(--color-border-strong)" }}
                    dataKey="quantile"
                    tick={axisTickStyle}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={{ stroke: "var(--color-border-strong)" }}
                    tick={axisTickStyle}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip unitLabel={lengthStats.unit ?? "units"} />
                    }
                    cursor={{ fill: "var(--color-surface-raised)" }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                      fontFamily: "var(--font-sans)",
                    }}
                  />
                  {sequenceCap !== null ? (
                    <ReferenceLine
                      ifOverflow="extendDomain"
                      label={{
                        value: `Cap ${sequenceCap}`,
                        position: "insideTopRight",
                        fill: "var(--color-warning)",
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                      }}
                      stroke="var(--color-warning)"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      y={sequenceCap}
                    />
                  ) : null}
                  <Bar
                    animationDuration={280}
                    dataKey="value"
                    fill="var(--color-ai-accent)"
                    isAnimationActive={!reducedMotion}
                    name={lengthStats.unit ?? "Sequence length"}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="dataset-chart__placeholder" />
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default DatasetCharts;
