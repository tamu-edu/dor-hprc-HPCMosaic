import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { useTheme } from "../context/ThemeContext";
import { get_base_url } from "../utils/api_config.js";
import { cx, normalizeState } from "./dashboardUtils";

export const formatDate = (value) => {
  if (!value) return "--";

  const parsed = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const getStateTone = (state) => {
  const normalized = normalizeState(state);
  if (normalized === "completed") return "bg-mosaic-success-bg text-mosaic-success";
  if (normalized === "failed") return "bg-mosaic-danger-bg text-white";
  if (normalized.includes("cancel")) return "bg-mosaic-border-strong text-mosaic-primary";
  if (normalized.includes("timeout")) return "bg-mosaic-caution-bg text-mosaic-caution";
  return "bg-mosaic-border text-mosaic-secondary";
};

const displayValue = (value) => (
  value === undefined || value === null || value === "" ? "--" : value
);

const hasUsefulValue = (value) => (
  value !== undefined
  && value !== null
  && value !== ""
  && !["n/a", "(null)", "unknown"].includes(String(value).trim().toLowerCase())
);

export const formatSlurmSize = (value, includeScope = false) => {
  if (value === undefined || value === null || value === "") return "--";

  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*([KMGTPE]?)B?([cn]?)$/i);
  if (!match) return value;

  const units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB"];
  const inputUnit = match[2].toUpperCase();
  let unitIndex = ["", "K", "M", "G", "T", "P", "E"].indexOf(inputUnit);
  let amount = Number(match[1]);

  // Promote values close to the next binary unit to avoid noisy displays such as 1001 MB.
  while (unitIndex < units.length - 1 && amount >= 0.9 * 1024) {
    amount /= 1024;
    unitIndex += 1;
  }

  const rounded = amount >= 10 ? Math.round(amount) : Math.round(amount * 10) / 10;
  const scope = includeScope && match[3]
    ? (match[3].toLowerCase() === "n" ? "/node" : "/CPU")
    : "";
  return `${rounded.toLocaleString()} ${units[unitIndex]}${scope}`;
};

export const formatSlurmDuration = (value) => {
  if (value === undefined || value === null || value === "") return "--";

  const match = String(value).trim().match(/^(?:(\d+)-)?(\d+)(?::(\d+))?(?::(\d+(?:\.\d+)?))?$/);
  if (!match) return value;

  const [, daysText, first, second, third] = match;
  let days = Number(daysText || 0);
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (third !== undefined) {
    hours = Number(first);
    minutes = Number(second);
    seconds = Number(third);
  } else if (second !== undefined) {
    minutes = Number(first);
    seconds = Number(second);
  } else {
    seconds = Number(first);
  }

  hours += days * 24;
  days = Math.floor(hours / 24);
  hours %= 24;
  const formattedSeconds = Number.isInteger(seconds)
    ? seconds
    : Math.round(seconds * 10) / 10;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (formattedSeconds || parts.length === 0) parts.push(`${formattedSeconds}s`);
  return parts.join(" ");
};

export const DetailField = ({ label, value, className = "" }) => (
  <div className={cx("min-w-0", className)}>
    <dt className="text-card-10 font-semibold text-mosaic-muted">{label}</dt>
    <dd className="m-0 mt-0.5 break-words text-card-13 font-bold leading-snug text-mosaic-primary">{displayValue(value)}</dd>
  </div>
);

export const DetailSection = ({ title, children, usage = false }) => (
  <section>
    <h4 className="mb-2 mt-0 text-card-13 font-extrabold tracking-wide text-mosaic-primary">{title}</h4>
    <dl className={cx(
      "m-0 grid gap-x-4 gap-y-2.5",
      usage
        ? "grid-cols-1 rounded-[5px] border border-mosaic-border bg-mosaic-surface/60 p-2.5 min-[420px]:grid-cols-2 min-[760px]:grid-cols-4"
        : "grid-cols-1 min-[480px]:grid-cols-2 min-[720px]:grid-cols-3",
    )}>
      {children}
    </dl>
  </section>
);

const formatElapsed = (seconds) => {
  const value = Math.max(0, Number(seconds) || 0);
  if (value >= 3600) return `${Math.round(value / 360) / 10}h`;
  if (value >= 60) return `${Math.round(value / 6) / 10}m`;
  return `${Math.round(value)}s`;
};

const UsageChart = ({ title, datasets, yTitle, secondaryYTitle }) => {
  const { theme } = useTheme();
  const data = useMemo(() => ({ datasets }), [datasets]);
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    normalized: true,
    parsing: false,
    interaction: { intersect: false, mode: "nearest" },
    plugins: {
      legend: {
        display: datasets.length > 1,
        labels: { color: theme.colors.textSecondary, boxWidth: 10, boxHeight: 2 },
      },
      tooltip: {
        backgroundColor: theme.colors.tooltipBg,
        titleColor: theme.colors.tooltipText,
        bodyColor: theme.colors.tooltipText,
        callbacks: { title: (items) => formatElapsed(items[0]?.parsed?.x) },
      },
    },
    scales: {
      x: {
        type: "linear",
        grid: { display: false },
        ticks: { color: theme.colors.textMuted, callback: formatElapsed, maxTicksLimit: 6 },
        border: { color: theme.colors.border },
        title: { display: true, text: "Elapsed time", color: theme.colors.textSecondary },
      },
      y: {
        beginAtZero: true,
        grid: { color: theme.colors.border },
        ticks: { color: theme.colors.textMuted },
        border: { display: false },
        title: { display: true, text: yTitle, color: theme.colors.textSecondary },
      },
      ...(secondaryYTitle ? {
        yMemory: {
          beginAtZero: true,
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: { color: theme.colors.textMuted },
          border: { display: false },
          title: { display: true, text: secondaryYTitle, color: theme.colors.textSecondary },
        },
      } : {}),
    },
  }), [datasets, secondaryYTitle, theme, yTitle]);

  return (
    <div className="min-w-0 rounded-[5px] border border-mosaic-border bg-mosaic-surface/40 p-2">
      <h5 className="mb-1 mt-0 text-card-11 font-bold text-mosaic-secondary">{title}</h5>
      <div className="h-44"><Line data={data} options={options} /></div>
    </div>
  );
};

const series = (label, points, field, color, yAxisID = "y") => ({
  label,
  data: points.map((point) => ({ x: point.elapsed_seconds, y: point[field] })),
  borderColor: color,
  backgroundColor: color,
  borderWidth: 1.75,
  pointRadius: 0,
  pointHoverRadius: 3,
  pointHitRadius: 8,
  tension: 0.15,
  yAxisID,
});

export const ResourceUsage = ({ jobId }) => {
  const { theme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`${get_base_url()}/api/jobs/${encodeURIComponent(jobId)}/jobstats`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || body?.error) throw new Error(body?.error || `Request failed with ${response.status}`);
        setData(body);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [jobId]);

  const cpu = Array.isArray(data?.cpu) ? data.cpu : [];
  const gpu = Array.isArray(data?.gpu) ? data.gpu : [];
  const io = Array.isArray(data?.io) ? data.io : [];
  const gpuIds = [...new Set(gpu.map((point) => point.gpu))];
  const palette = [theme.colors.link, theme.colors.successText, theme.colors.cautionText, theme.colors.dangerText];

  return (
    <section>
      <h4 className="mb-2 mt-0 text-card-13 font-extrabold tracking-wide text-mosaic-primary">Resource Usage Over Time</h4>
      {loading ? (
        <p className="m-0 text-card-11 text-mosaic-muted">Loading detailed monitoring data…</p>
      ) : error ? (
        <p className="m-0 text-card-11 text-mosaic-muted">Detailed monitoring data is unavailable.</p>
      ) : !data?.available ? (
        <p className="m-0 text-card-11 text-mosaic-muted">
          No detailed jobstats monitoring data is available for this job. HPCMosaic only checks for jobstats log files in the directory from which the job was submitted.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 min-[760px]:grid-cols-2">
          {cpu.length > 0 && <UsageChart
            title="CPU and memory"
            yTitle="Core utilization (%)"
            secondaryYTitle="Memory (GB)"
            datasets={[
              series("CPU", cpu, "cpu_percent", theme.colors.dangerText),
              series("Memory", cpu, "memory_gb", theme.colors.link, "yMemory"),
            ]}
          />}
          {gpu.length > 0 && <UsageChart
            title="GPU utilization"
            yTitle="Utilization (%)"
            datasets={gpuIds.map((gpuId, index) => series(
              `GPU ${gpuId}`,
              gpu.filter((point) => point.gpu === gpuId),
              "utilization_percent",
              palette[index % palette.length],
            ))}
          />}
          {gpu.length > 0 && <UsageChart
            title="GPU memory"
            yTitle="Memory used (GB)"
            datasets={gpuIds.map((gpuId, index) => series(
              `GPU ${gpuId}`,
              gpu.filter((point) => point.gpu === gpuId),
              "memory_used_gb",
              palette[index % palette.length],
            ))}
          />}
          {io.length > 0 && <UsageChart
            title="Temporary disk I/O"
            yTitle="Cumulative bytes"
            datasets={[
              series("Read", io, "read_bytes", theme.colors.link),
              series("Written", io, "write_bytes", theme.colors.cautionText),
            ]}
          />}
        </div>
      )}
    </section>
  );
};
