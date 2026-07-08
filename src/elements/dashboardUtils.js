import React, { useEffect, useState } from "react";
import { get_base_url } from "../utils/api_config.js";

export const refreshEventName = "mosaic-dashboard-refresh";

export const formatNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : "0";
};

export const formatPercent = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
};

export const parseNumeric = (value) => {
  if (value === null || value === undefined) return 0;
  const numeric = Number(String(value).replace(/,/g, "").match(/[\d.]+/)?.[0]);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const DASHBOARD_REFRESH_EVENTS = {
  jobs: "dashboard:jobs:refresh",
  quotas: "dashboard:quotas:refresh",
  accounts: "dashboard:accounts:refresh",
  nodes: "dashboard:nodes:refresh",
  announcements: "dashboard:announcements:refresh",
};

export const parseStorageToMiB = (value) => {
  if (value === null || value === undefined) return 0;

  const match = String(value).trim().match(/^([\d.]+)\s*([KMGTPE]?)$/i);
  if (!match) return 0;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 0;

  const multipliers = {
    "": 1 / 1024,
    K: 1 / 1024,
    M: 1,
    G: 1024,
    T: 1024 * 1024,
    P: 1024 * 1024 * 1024,
    E: 1024 * 1024 * 1024 * 1024,
  };

  return amount * (multipliers[match[2].toUpperCase()] || 1);
};

export const normalizeState = (state = "") => {
  const value = String(state).toLowerCase();
  if (value.startsWith("r") || value.includes("running")) return "running";
  if (value.startsWith("pd") || value.includes("pending")) return "pending";
  if (value.includes("fail")) return "failed";
  if (value.includes("complete") || value === "cd") return "completed";
  return value || "unknown";
};

export const normalizeNodeState = (state = "") => {
  const value = String(state).toLowerCase().replace(/[*+#-]/g, "");
  if (value.includes("down")) return "down";
  if (value.includes("drain")) return "drained";
  if (value.includes("fail")) return "down";
  if (value.includes("maint") || value.includes("reserv")) return "maintenance";
  if (value.includes("mix")) return "mixed";
  if (value.includes("alloc") || value.includes("comp")) return "allocated";
  if (value.includes("idle")) return "idle";
  return "unknown";
};

export const NODE_STATUS_COLORS = {
  idle: "#0072B2",
  allocated: "#009E73",
  mixed: "#D8C84A",
  drained: "#E69F00",
  down: "#D55E00",
  maintenance: "#CC79A7",
  unknown: "#6B7280",
};

export const NODE_STATUS_LABELS = {
  idle: "Idle",
  allocated: "Allocated",
  mixed: "Mixed",
  down: "Down",
  drained: "Drained",
  maintenance: "Maintenance",
  unknown: "Unknown",
};

export const NODE_STATUS_SYMBOLS = {
  idle: "✓",
  allocated: "●",
  mixed: "◐",
  drained: "⏸",
  down: "✕",
  maintenance: "M",
  unknown: "?",
};

export const NODE_STATUS_TEXT_COLORS = {
  idle: "#ffffff",
  allocated: "#ffffff",
  mixed: "#111827",
  drained: "#111827",
  down: "#ffffff",
  maintenance: "#ffffff",
  unknown: "#ffffff",
};

export const NODE_STATUS_PRIORITY = {
  down: 6,
  drained: 5,
  maintenance: 4,
  allocated: 3,
  mixed: 2,
  idle: 1,
  unknown: 0,
};

export const NODE_STATUS_ORDER = ["idle", "allocated", "mixed", "drained", "down", "maintenance", "unknown"];

export const getNodeStatusColor = (status) => NODE_STATUS_COLORS[status] || NODE_STATUS_COLORS.unknown;
export const getNodeStatusTextColor = (status) => NODE_STATUS_TEXT_COLORS[status] || NODE_STATUS_TEXT_COLORS.unknown;

export const getNodeStatusStyle = (status) => ({
  "--node-status-color": getNodeStatusColor(status),
  "--node-status-text-color": getNodeStatusTextColor(status),
});

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const cardClasses = {
  shell: "h-full w-full overflow-hidden rounded-[5px] border border-mosaic-border bg-mosaic-surface p-3 font-sans text-mosaic-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors duration-200",
  shellPadded: "h-full w-full overflow-hidden rounded-[5px] border border-mosaic-border bg-mosaic-surface px-3.5 py-3 font-sans text-mosaic-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors duration-200",
  title: "mb-[9px] flex min-h-6 items-center gap-[9px] border-b border-mosaic-border pb-2 text-mosaic-primary",
  titleText: "m-0 min-w-0 text-card-15 font-bold uppercase tracking-normal",
  titleSubtext: "text-card-12 text-mosaic-muted",
  icon: "inline-flex shrink-0 items-center justify-center text-card-18 text-mosaic-secondary",
  loading: "flex min-h-11 items-center text-card-12 font-semibold text-mosaic-muted",
  empty: "flex min-h-11 items-center text-card-12 font-semibold text-mosaic-muted",
  link: "ml-auto whitespace-nowrap text-card-12 font-semibold text-mosaic-link no-underline",
  progressTrack: "block h-2.5 overflow-hidden rounded-full bg-mosaic-border",
  progressFill: "block h-full rounded-full bg-gradient-to-r from-green-600 to-green-500",
  subtlePanel: "rounded-[5px] border border-mosaic-border bg-mosaic-table",
  iconButton: "inline-flex h-7 w-7 items-center justify-center rounded-[5px] border border-mosaic-border bg-mosaic-surface text-card-18 text-mosaic-secondary hover:border-mosaic-accent hover:text-mosaic-primary",
};

export const getToneTextClass = (tone) => {
  if (tone === "green") return "text-mosaic-success";
  if (tone === "amber" || tone === "warning") return "text-mosaic-caution";
  if (tone === "red" || tone === "danger") return "text-mosaic-danger";
  return "text-mosaic-primary";
};

export const getUsageToneClass = (tone) => {
  if (tone === "healthy") return "text-mosaic-success";
  if (tone === "warning") return "text-mosaic-caution";
  if (tone === "danger") return "text-mosaic-danger";
  return "text-mosaic-secondary";
};

export const getUsageFillClass = (tone) => {
  if (tone === "warning") return "bg-gradient-to-r from-amber-500 to-amber-400";
  if (tone === "danger") return "bg-gradient-to-r from-red-600 to-red-500";
  return "bg-gradient-to-r from-green-600 to-green-500";
};

export const isGpuPartition = (partition = "") => String(partition)
  .split(",")
  .some((value) => value.trim().replace(/\*$/, "").toLowerCase() === "gpu");

export const useApi = (endpoint) => {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((previous) => ({ ...previous, loading: true, error: null }));

      try {
        const response = await fetch(`${get_base_url()}${endpoint}`);
        const data = await response.json();

        if (!response.ok || data?.error) {
          throw new Error(data?.error || `Request failed with ${response.status}`);
        }

        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (error) {
        if (!cancelled) setState({ data: null, loading: false, error: error.message });
      }
    };

    load();
    window.addEventListener(refreshEventName, load);

    return () => {
      cancelled = true;
      window.removeEventListener(refreshEventName, load);
    };
  }, [endpoint]);

  return state;
};

export const MiniNodeBar = ({ counts }) => {
  const values = counts || { idle: 0, allocated: 0, mixed: 0, drained: 0, down: 0, maintenance: 0, unknown: 0 };
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);

  if (!total) return <div className={cardClasses.empty}>No node data</div>;

  return (
    <div className="mt-2.5 flex h-3.5 gap-[3px] overflow-hidden rounded-[5px]" aria-hidden="true">
      {NODE_STATUS_ORDER.map((status) => values[status] > 0 && (
        <span
          className="block min-w-2.5 bg-[var(--node-status-color)]"
          style={{ ...getNodeStatusStyle(status), flex: values[status] }}
          key={status}
        />
      ))}
    </div>
  );
};

export const KpiCard = ({ icon, title, value, suffix, detail, tone = "red", loading, error, progressPercent = null, progressLabel = "Current usage", children }) => (
  <section className={cx(cardClasses.shell, "relative")}>
    <div className={cardClasses.title}>
      <span className={cardClasses.icon}>{icon}</span>
      <h3 className={cardClasses.titleText}>{title}</h3>
    </div>
    {loading ? (
      <div className={cardClasses.loading}>Loading</div>
    ) : error ? (
      <div className={cardClasses.empty}>Unavailable</div>
    ) : (
      <>
        <div className={cx("mt-[5px] text-card-28 font-extrabold tracking-normal text-mosaic-primary", getToneTextClass(tone))}>
          {value}
          {suffix && <span className="ml-[5px] text-[0.72em] font-bold text-current">{suffix}</span>}
        </div>
        <p className="my-1.5 min-h-[19px] text-card-12-5 text-mosaic-secondary">{detail}</p>
        {Number.isFinite(progressPercent) && (
          <div className="mt-[9px] grid gap-[5px]">
            <div className="block h-2 overflow-hidden rounded-full bg-mosaic-border">
              <span
                className={cardClasses.progressFill}
                style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%`, backgroundColor: "#16a34a", }}
              />
            </div>
            <span className="text-card-11 text-mosaic-muted">{progressLabel}</span>
          </div>
        )}
        {children}
      </>
    )}
  </section>
);
