import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { AiOutlineUnorderedList } from "react-icons/ai";
import { MdChevronRight, MdClose, MdInfoOutline, MdRefresh, MdSearch } from "react-icons/md";

import { get_base_url } from "../utils/api_config.js";
import { cardClasses, cx, normalizeState } from "./dashboardUtils";
import {
  DetailField,
  DetailSection,
  formatDate,
  formatSlurmDuration,
  formatSlurmSize,
  getStateTone,
  ResourceUsage,
} from "./JobDetailsShared";

const HISTORY_PAGE_SIZE = 10;
const SIZE_BREAKPOINTS = { mediumWidth: 420, mediumHeight: 300, largeWidth: 680, largeHeight: 480 };
const FINISHED_STATES = new Set(["completed", "failed", "cancelled", "canceled", "timeout"]);
const tabs = [
  ["all", "All"],
  ["pending", "Pending"],
  ["running", "Running"],
  ["finished", "Finished"],
];

const useful = (value) => value !== undefined && value !== null && value !== "" && !["n/a", "(null)", "unknown"].includes(String(value).toLowerCase());
const jobIdOf = (job) => String(job?.job_id || "");
const jobKind = (job) => {
  const state = normalizeState(job?.state);
  if (state === "pending") return "pending";
  if (state === "running" || state === "completing" || state === "suspended") return "running";
  return FINISHED_STATES.has(state) ? "finished" : "finished";
};
const priority = { pending: 0, running: 1, finished: 2 };

const age = (value) => {
  const submitted = new Date(String(value || "").replace(" ", "T")).getTime();
  if (!Number.isFinite(submitted)) return "--";
  const seconds = Math.max(0, Math.floor((Date.now() - submitted) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const statusLabel = (state) => {
  const value = normalizeState(state);
  return value === "unknown" ? (state || "Unknown") : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

const useCardSize = (ref) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  if (size.width >= SIZE_BREAKPOINTS.largeWidth && size.height >= SIZE_BREAKPOINTS.largeHeight) return "large";
  if (size.width >= SIZE_BREAKPOINTS.mediumWidth && size.height >= SIZE_BREAKPOINTS.mediumHeight) return "medium";
  return "small";
};

const SummaryLine = ({ job }) => {
  const kind = jobKind(job);
  const duration = kind === "pending" ? age(job.submit_time) : formatSlurmDuration(job.runtime);
  return <span>{jobIdOf(job)} • {job.partition || "--"} • {duration}</span>;
};

const missing = (value) => !useful(value);
const shown = (value, fallback = "—") => missing(value) ? fallback : value;
const formattedDuration = (value) => missing(value) ? "—" : formatSlurmDuration(value);
const formattedSize = (value) => missing(value) ? "—" : formatSlurmSize(value);
const formattedPriority = (value) => {
  if (missing(value)) return "—";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : value;
};

const useQueueInsight = (jobId, enabled, refreshNonce) => {
  const [state, setState] = useState({ loading: enabled, data: null, error: "" });
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    setState({ loading: true, data: null, error: "" });
    fetch(`${get_base_url()}/api/priority/queue-insight?job_id=${encodeURIComponent(jobId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data?.error) throw new Error(data?.error || "Queue details unavailable");
        setState({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setState({ loading: false, data: null, error: error.message });
      });
    return () => controller.abort();
  }, [enabled, jobId, refreshNonce]);
  return state;
};

const MetricGroup = ({ metrics }) => (
  <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[5px] border border-mosaic-border bg-mosaic-surface/50 p-3 sm:grid-cols-4">
    {metrics.map(([label, value], index) => <DetailField key={typeof label === "string" ? label : index} label={label} value={value} />)}
  </dl>
);

const PriorityRankLabel = () => <span className="inline-flex items-center gap-1">Priority Rank<Tippy content="Rank among competing pending jobs based on current Slurm priority. Actual start order may differ due to resource availability and scheduling rules."><button type="button" className="non-draggable inline-flex border-0 bg-transparent p-0 text-mosaic-muted" aria-label="About priority rank"><MdInfoOutline aria-hidden="true" /></button></Tippy></span>;

const ResultPanel = ({ job }) => {
  const state = statusLabel(job.state);
  const normalized = normalizeState(job.state);
  const didNotStart = !useful(job.start_time) && ["cancelled", "canceled"].includes(normalized);
  const problematic = normalized !== "completed" && normalized !== "running" && normalized !== "pending";
  if (!problematic && !useful(job.exit_code)) return null;
  let explanation = "The job did not complete successfully.";
  if (didNotStart) explanation = "This job was cancelled before it started.";
  else if (normalized.includes("out_of_memory") || normalized.includes("out of memory")) explanation = "The job exceeded its available memory.";
  else if (normalized.includes("timeout")) explanation = "The job reached its time limit.";
  else if (normalized.includes("cancel")) explanation = "The job was cancelled after it started.";
  return <section className={cx("border-l-[3px] py-1 pl-3", problematic ? "border-mosaic-danger-bg" : "border-mosaic-border-strong")}><h4 className="m-0 text-card-10 font-extrabold uppercase tracking-wide text-mosaic-muted">Result</h4><p className="mb-0 mt-1 text-card-18 font-extrabold text-mosaic-primary">{state}</p>{problematic && <p className="mb-0 mt-1 text-card-12 text-mosaic-secondary">{explanation}</p>}{useful(job.exit_code) && <p className="mb-0 mt-1 text-card-11 text-mosaic-muted">Exit code {job.exit_code}</p>}</section>;
};

const ResourcesPanel = ({ job }) => {
  const metrics = [
    ["CPUs", shown(job.req_cpus || job.cpus)],
    ["GPUs", shown(job.gpus)],
    ["Memory", missing(job.req_mem) ? "—" : formatSlurmSize(job.req_mem, true)],
    ["Nodes", shown(job.req_nodes || job.nodes)],
  ];
  return <div className="grid gap-4"><MetricGroup metrics={metrics} /><dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2"><DetailField label="Node list" value={shown(job.node_list)} /><DetailField label="Time limit" value={formattedDuration(job.time_limit)} /></dl></div>;
};

const QueuePanel = ({ state }) => {
  if (state.loading) return <p className="m-0 text-card-11 text-mosaic-muted">Loading queue information…</p>;
  if (state.error || !state.data) return <p className="m-0 text-card-11 text-mosaic-muted">Queue information is unavailable.</p>;
  const insight = state.data; const scheduler = insight.job || {};
  const competingJobs = Array.isArray(insight.competing_jobs) ? insight.competing_jobs : [];
  const requestedResources = (job) => [
    Number(job.nodes) > 0 ? `${job.nodes} node${Number(job.nodes) === 1 ? "" : "s"}` : null,
    Number(job.cpus) > 0 ? `${job.cpus} CPU${Number(job.cpus) === 1 ? "" : "s"}` : null,
    useful(job.gres) ? job.gres : null,
  ].filter(Boolean).join(" • ") || "—";
  return <div className="grid gap-4"><MetricGroup metrics={[["Priority", formattedPriority(insight.priority?.priority ?? scheduler.Priority)], [<PriorityRankLabel />, insight.queue_position ? `#${insight.queue_position}` : "—"], ["Pending ahead", insight.competing_job_count ?? "—"], ["Running now", insight.partition_jobs?.running ?? "—"]]} /><DetailSection title="Priority context"><DetailField label="Partition pending" value={insight.partition_pending_count ?? "—"} /><DetailField label="Cluster average priority" value={formattedPriority(insight.cluster_average_priority)} /><DetailField label="Partition utilization" value={insight.partition_utilization?.percent == null ? "—" : `${Math.round(insight.partition_utilization.percent)}%`} /></DetailSection>{insight.competing_job_count === 0 && Number(insight.partition_jobs?.running) > 0 && <p className="m-0 text-card-11 text-mosaic-muted">This job is first among pending jobs, but {insight.partition_jobs.running} running job{Number(insight.partition_jobs.running) === 1 ? " is" : "s are"} currently using this partition.</p>}<details className="rounded-[5px] border border-mosaic-border bg-mosaic-surface/40"><summary className="non-draggable cursor-pointer px-3 py-2.5 text-card-12 font-extrabold text-mosaic-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-mosaic-focus">Competing jobs <span className="font-semibold text-mosaic-muted">({insight.competing_job_count ?? "—"})</span></summary><div className="border-t border-mosaic-border">{competingJobs.length === 0 ? <p className="m-0 px-3 py-3 text-card-11 text-mosaic-muted">No pending jobs ahead are available in the current scheduler snapshot.</p> : <div className="overflow-x-auto"><table className="w-full border-collapse text-card-11"><thead><tr className="bg-mosaic-table text-left text-card-10 font-bold uppercase tracking-wide text-mosaic-muted"><th className="px-3 py-2">Job ID</th><th className="px-3 py-2">Priority</th><th className="px-3 py-2">Resources requested</th><th className="px-3 py-2">Wait time</th></tr></thead><tbody>{competingJobs.map((job) => <tr key={job.job_id} className="border-t border-mosaic-border first:border-t-0"><td className="whitespace-nowrap px-3 py-2 font-bold text-mosaic-primary">{job.job_id}</td><td className="whitespace-nowrap px-3 py-2 text-mosaic-secondary">{formattedPriority(job.priority)}</td><td className="px-3 py-2 text-mosaic-secondary">{requestedResources(job)}</td><td className="whitespace-nowrap px-3 py-2 text-mosaic-secondary">{job.submit_time ? age(job.submit_time) : "—"}</td></tr>)}</tbody></table></div>}</div></details></div>;
};

const LogsPanel = ({ job }) => {
  const [copied, setCopied] = useState("");
  const expandJobId = (value) => String(value || "").replace(/%j/g, jobIdOf(job));
  const entries = [["Working directory", job.working_directory], ["Standard output", job.stdout_path], ["Standard error", job.stderr_path]].filter(([, value]) => useful(value)).map(([label, value]) => [label, expandJobId(value)]);
  const copy = async (label, value) => { if (!navigator.clipboard) return; await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(""), 1200); };
  if (entries.length === 0) return <p className="m-0 text-card-11 text-mosaic-muted">Slurm did not report job file locations.</p>;
  return <dl className="m-0 grid gap-4">{entries.map(([label, value]) => <div key={label} className="min-w-0 border-b border-mosaic-border pb-3 last:border-0"><dt className="text-card-10 font-bold uppercase tracking-wide text-mosaic-muted">{label}</dt><dd className="m-0 mt-1 flex items-start gap-2"><code className="min-w-0 flex-1 break-all text-card-12 text-mosaic-primary">{value}</code>{navigator.clipboard && <button type="button" className="non-draggable shrink-0 rounded-[5px] border border-mosaic-border px-2 py-1 text-card-10 font-bold text-mosaic-link hover:bg-mosaic-surface-hover" onClick={() => copy(label, value)}>{copied === label ? "Copied" : "Copy"}</button>}</dd></div>)}</dl>;
};

const JobDetails = ({ job, cancelJob, canceling, refreshNonce = 0 }) => {
  const kind = jobKind(job);
  const [detail, setDetail] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  useEffect(() => { setActiveTab("overview"); }, [job]);
  useEffect(() => {
    if (kind === "finished") return undefined;
    const controller = new AbortController();
    fetch(`${get_base_url()}/api/jobs/${encodeURIComponent(jobIdOf(job))}`, { signal: controller.signal, cache: "no-store" }).then((response) => response.json()).then((data) => setDetail(data?.job || null)).catch(() => {});
    return () => controller.abort();
  }, [job, kind, refreshNonce]);
  const full = { ...job, ...(detail || {}) };
  const queue = useQueueInsight(jobIdOf(job), kind === "pending", refreshNonce);
  const availableTabs = kind === "pending" ? [["overview", "Overview"], ["queue", "Queue"], ["resources", "Resources"], ["logs", "Logs"]] : [["overview", "Overview"], ["resources", "Resources"], ["usage", "Usage"], ["logs", "Logs"]];
  const reason = queue.data?.job?.Reason || queue.data?.estimated_start?.reason || full.reason;
  const requestedSummary = [[full.req_cpus || full.cpus, "CPU"], [full.gpus, "GPU"], [full.req_nodes || full.nodes, "node"]].filter(([value]) => !missing(value)).map(([value, label]) => `${value} ${label}${Number(value) === 1 ? "" : "s"}`).join(" • ") || "—";
  const overviewMetrics = kind === "pending"
    ? [["Submitted", formatDate(full.submit_time)], ["Waiting", age(full.submit_time)], ["Priority", formattedPriority(queue.data?.priority?.priority ?? queue.data?.job?.Priority)], ["Jobs ahead", queue.data?.competing_job_count ?? "—"], ["Expected start", queue.data?.estimated_start?.start_time ? formatDate(queue.data.estimated_start.start_time) : "Not yet estimated"], ["Requested", requestedSummary]]
    : kind === "running"
      ? [["Runtime", formattedDuration(full.runtime)], ["Time limit", formattedDuration(full.time_limit)], ["Node", shown(full.node_list)], ["Allocated CPUs", shown(full.alloc_cpus || full.cpus)]]
      : [["Submitted", formatDate(full.submit_time)], ["Started", useful(full.start_time) ? formatDate(full.start_time) : "Not started"], ["Ended", useful(full.end_time) ? formatDate(full.end_time) : "—"], ["Runtime", formattedDuration(full.runtime)]];
  const hasStarted = useful(full.start_time) || kind === "running";
  const usageMetrics = hasStarted ? [["CPU Time", formattedDuration(full.total_cpu)], ["Peak Memory", formattedSize(full.max_rss)], ["Disk Read", formattedSize(full.max_disk_read)], ["Disk Written", formattedSize(full.max_disk_write)]] : [["CPU Time", "—"], ["Peak Memory", "—"], ["Disk Read", "—"], ["Disk Written", "—"]];

  return <div className="grid gap-4"><nav className="flex gap-1 overflow-x-auto border-b border-mosaic-border" role="tablist" aria-label="Job detail sections">{availableTabs.map(([value, label]) => <button key={value} id={`job-tab-${value}`} type="button" role="tab" aria-selected={activeTab === value} aria-controls={`job-panel-${value}`} onClick={() => setActiveTab(value)} className={cx("non-draggable -mb-px border-b-2 px-3 py-2 text-card-12 font-bold", activeTab === value ? "border-mosaic-accent text-mosaic-primary" : "border-transparent text-mosaic-muted hover:text-mosaic-primary")}>{label}</button>)}</nav><div id={`job-panel-${activeTab}`} role="tabpanel" aria-labelledby={`job-tab-${activeTab}`}>
    {activeTab === "overview" && <div className="grid gap-4">{kind === "finished" && <ResultPanel job={full} />}{kind === "pending" && <section><h4 className="mb-1 mt-0 text-card-10 font-extrabold uppercase tracking-wide text-mosaic-muted">Pending reason</h4><p className="m-0 text-card-13 font-semibold text-mosaic-primary">{reason || (queue.loading ? "Loading…" : "Not provided")}</p></section>}<MetricGroup metrics={overviewMetrics} />{kind === "finished" && <MetricGroup metrics={usageMetrics} />}</div>}
    {activeTab === "queue" && <QueuePanel state={queue} />}
    {activeTab === "resources" && <ResourcesPanel job={full} />}
    {activeTab === "usage" && <div className="grid gap-4"><MetricGroup metrics={usageMetrics} /><ResourceUsage key={`usage-${refreshNonce}`} jobId={jobIdOf(job)} /></div>}
    {activeTab === "logs" && <LogsPanel job={full} />}
  </div>{kind !== "finished" && <div className="border-t border-mosaic-border pt-4"><button type="button" className="non-draggable w-fit rounded-[5px] bg-mosaic-danger-bg px-3 py-2 text-card-12 font-extrabold text-white hover:bg-mosaic-danger-hover disabled:cursor-wait disabled:bg-mosaic-disabled-bg" disabled={canceling === jobIdOf(job)} onClick={() => cancelJob(jobIdOf(job))}>{canceling === jobIdOf(job) ? "Canceling…" : "Cancel Job"}</button></div>}</div>;
};

const JobDrawer = ({ job, onClose, onRefresh, cancelJob, canceling }) => {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  useEffect(() => {
    const keydown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onClose]);
  if (!job) return null;
  const active = jobKind(job) !== "finished";
  const refresh = async () => {
    setRefreshing(true);
    setRefreshError("");
    try {
      await onRefresh(jobIdOf(job));
      setRefreshNonce((value) => value + 1);
    } catch (error) {
      setRefreshError(error.message || "Unable to refresh job details");
    } finally {
      setRefreshing(false);
    }
  };
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside aria-label={`Details for job ${jobIdOf(job)}`} aria-modal="true" role="dialog" className="h-full w-full max-w-2xl overflow-auto border-l border-mosaic-border bg-mosaic-surface p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="mb-4 flex items-start justify-between gap-3 border-b border-mosaic-border pb-3">
          <div className="min-w-0"><div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"><h3 className="m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-card-18 font-bold text-mosaic-primary">{job.job_name || `Job ${jobIdOf(job)}`}</h3><span className={cx("inline-flex shrink-0 rounded px-2 py-1 text-card-10 font-extrabold", getStateTone(job.state))}>{statusLabel(job.state)}</span></div><p className="m-0 mt-1 text-card-11 font-semibold text-mosaic-muted">Job {jobIdOf(job)} • {job.partition || "Unknown partition"}</p></div>
          <div className="flex items-center gap-2">
            {active && <button type="button" disabled={refreshing} className="non-draggable inline-flex items-center gap-1.5 rounded-[5px] border border-mosaic-border px-2.5 py-2 text-card-11 font-bold text-mosaic-link hover:bg-mosaic-surface-hover disabled:cursor-wait disabled:text-mosaic-disabled" onClick={refresh} aria-label="Refresh job details"><MdRefresh className={refreshing ? "animate-spin" : ""} /><span>{refreshing ? "Refreshing…" : "Refresh"}</span></button>}
            <button autoFocus type="button" aria-label="Close job details" className="non-draggable rounded-[5px] border border-mosaic-border p-2 text-mosaic-secondary hover:bg-mosaic-surface-hover" onClick={onClose}><MdClose /></button>
          </div>
        </header>
        {refreshError && <p className="mb-3 mt-0 text-card-11 font-semibold text-mosaic-danger" role="alert">{refreshError}</p>}
        <JobDetails job={job} cancelJob={cancelJob} canceling={canceling} refreshNonce={refreshNonce} />
      </aside>
    </div>, document.body
  );
};

const MyJobsCard = () => {
  const rootRef = useRef(null);
  const size = useCardSize(rootRef);
  const [activeJobs, setActiveJobs] = useState([]);
  const [pastJobs, setPastJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [historyWindow, setHistoryWindow] = useState("24h");
  const [selected, setSelected] = useState(null);
  const [canceling, setCanceling] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const load = useCallback(async (requestedPage = 1, append = false, signal) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const manualRefresh = refreshNonce > 0 && !append;
      const historyQuery = new URLSearchParams({ page: String(requestedPage), page_size: String(HISTORY_PAGE_SIZE), history_window: historyWindow });
      if (manualRefresh) historyQuery.set("refresh", "true");
      const fetchOptions = { signal, cache: manualRefresh ? "no-store" : "default" };
      const requests = [fetch(`${get_base_url()}/api/jobs/past_jobs?${historyQuery}`, fetchOptions)];
      if (!append) requests.unshift(fetch(`${get_base_url()}/api/jobs${manualRefresh ? "?refresh=true" : ""}`, fetchOptions));
      const responses = await Promise.all(requests);
      const bodies = await Promise.all(responses.map((response) => response.json()));
      const failedIndex = responses.findIndex((response, index) => !response.ok || bodies[index]?.error);
      if (failedIndex >= 0) throw new Error(bodies[failedIndex]?.error || "Unable to load jobs");
      const history = bodies[bodies.length - 1];
      if (!append) setActiveJobs(Array.isArray(bodies[0]?.jobs) ? bodies[0].jobs : []);
      setPastJobs((current) => append ? [...current, ...(history.jobs || [])] : (history.jobs || []));
      setPage(history.page || requestedPage);
      setHasNext(Boolean(history.has_next));
      setTotal(Number(history.total) || 0);
    } catch (loadError) {
      if (loadError.name !== "AbortError") setError(loadError.message);
    } finally {
      if (!signal?.aborted) { setLoading(false); setLoadingMore(false); }
    }
  }, [historyWindow, refreshNonce]);

  useEffect(() => {
    const controller = new AbortController();
    setSelected(null);
    load(1, false, controller.signal);
    return () => controller.abort();
  }, [load, refreshNonce]);

  const allJobs = useMemo(() => {
    const seen = new Set();
    return [...activeJobs, ...pastJobs]
      .filter((job) => { const id = jobIdOf(job); if (!id || seen.has(id)) return false; seen.add(id); return true; })
      .sort((left, right) => priority[jobKind(left)] - priority[jobKind(right)] || String(right.submit_time || "").localeCompare(String(left.submit_time || "")));
  }, [activeJobs, pastJobs]);
  const counts = allJobs.reduce((result, job) => ({ ...result, [jobKind(job)]: (result[jobKind(job)] || 0) + 1 }), {});
  const visibleJobs = allJobs.filter((job) => {
    if (filter !== "all" && jobKind(job) !== filter) return false;
    const needle = search.trim().toLowerCase();
    return !needle || `${job.job_name || ""} ${jobIdOf(job)}`.toLowerCase().includes(needle);
  });

  const openJob = (job) => setSelected(job);
  const refreshSelectedJob = async (jobId) => {
    const historyQuery = new URLSearchParams({
      page: "1",
      page_size: String(HISTORY_PAGE_SIZE),
      history_window: historyWindow,
      search: jobId,
      refresh: "true",
    });
    const [activeResponse, historyResponse] = await Promise.all([
      fetch(`${get_base_url()}/api/jobs?refresh=true`, { cache: "no-store" }),
      fetch(`${get_base_url()}/api/jobs/past_jobs?${historyQuery}`, { cache: "no-store" }),
    ]);
    const [activeData, historyData] = await Promise.all([activeResponse.json(), historyResponse.json()]);
    if (!activeResponse.ok || activeData?.error) throw new Error(activeData?.error || "Unable to refresh active jobs");
    if (!historyResponse.ok || historyData?.error) throw new Error(historyData?.error || "Unable to refresh job history");

    const refreshedActive = Array.isArray(activeData.jobs) ? activeData.jobs : [];
    const historicalMatch = (historyData.jobs || []).find((candidate) => jobIdOf(candidate) === jobId);
    const activeMatch = refreshedActive.find((candidate) => jobIdOf(candidate) === jobId);
    const refreshedJob = activeMatch || historicalMatch;
    setActiveJobs(refreshedActive);
    if (historicalMatch) {
      setPastJobs((current) => [historicalMatch, ...current.filter((candidate) => jobIdOf(candidate) !== jobId)]);
    }
    if (refreshedJob) setSelected(refreshedJob);
  };
  const cancelJob = async (jobId) => {
    if (!window.confirm(`Cancel job ${jobId}?`)) return;
    setCanceling(jobId);
    try {
      const response = await fetch(`${get_base_url()}/api/cancel_job/${encodeURIComponent(jobId)}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || data?.error) throw new Error(data?.error || "Unable to cancel job");
      setSelected(null);
      setRefreshNonce((value) => value + 1);
    } catch (cancelError) { setError(cancelError.message); }
    finally { setCanceling(""); }
  };

  return (
    <section ref={rootRef} data-card-size={size} className={cx(cardClasses.shellPadded, "box-border flex h-full min-h-0 min-w-0 flex-col")}>
      <div className={cx(cardClasses.title, "shrink-0 pr-8")}>
        <span className={cardClasses.icon}><AiOutlineUnorderedList /></span>
        <h3 className={cardClasses.titleText}>My Jobs</h3>
        <button type="button" className={cx(cardClasses.link, "inline-flex min-h-6 items-center gap-1 py-0.5")} onClick={() => setRefreshNonce((value) => value + 1)} aria-label="Refresh jobs"><MdRefresh /><span className={size === "small" ? "sr-only" : ""}>Refresh</span></button>
      </div>
      <div className="mb-2 shrink-0 text-card-11 font-semibold text-mosaic-muted"><span className="text-mosaic-caution">Pending {counts.pending || 0}</span> • <span className="text-mosaic-success">Running {counts.running || 0}</span>{size !== "small" && <> • Finished {counts.finished || 0}</>}</div>

      {size !== "small" && <div className="mb-2 grid shrink-0 gap-2">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter jobs by status">{tabs.map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} type="button" onClick={() => setFilter(value)} className={cx("non-draggable rounded-[5px] px-2 py-1.5 text-card-11 font-bold", filter === value ? "bg-mosaic-accent text-mosaic-accent-text" : "border border-mosaic-border bg-mosaic-surface text-mosaic-secondary")}>{label}</button>)}</div>
        <div className={cx("grid gap-2", size === "large" || rootRef.current?.clientWidth >= 560 ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-1")}>
          {(size === "large" || rootRef.current?.clientWidth >= 560) && <label className="relative"><span className="sr-only">Search jobs</span><MdSearch className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-mosaic-muted" /><input className="non-draggable min-h-8 w-full rounded-[5px] border border-mosaic-border-strong bg-mosaic-app py-1.5 pl-7 pr-2 text-card-11 text-mosaic-primary" type="search" placeholder="Search name or ID" value={search} onChange={(event) => setSearch(event.target.value)} /></label>}
          <select aria-label="Finished jobs time range" className="non-draggable min-h-8 rounded-[5px] border border-mosaic-border-strong bg-mosaic-app px-2 text-card-11 text-mosaic-primary" value={historyWindow} onChange={(event) => setHistoryWindow(event.target.value)}><option value="24h">24 hours</option><option value="7d">7 days</option><option value="14d">14 days</option><option value="30d">30 days</option></select>
        </div>
      </div>}

      {error && <div role="alert" className="mb-2 text-card-11 font-semibold text-mosaic-danger">{error}</div>}
      {loading ? <div className={cardClasses.loading}>Loading jobs</div> : visibleJobs.length === 0 ? <div className={cardClasses.empty}>No jobs match this view</div> : <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        <div className="grid content-start gap-[7px]" aria-label="Jobs">{visibleJobs.map((job) => {
          const id = jobIdOf(job); const kind = jobKind(job);
          return <article key={id} className="overflow-hidden rounded-[5px] border border-mosaic-border bg-mosaic-table">
            <button type="button" onClick={() => openJob(job)} aria-haspopup="dialog" className="non-draggable grid min-h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-0 bg-transparent px-2.5 py-2 text-left hover:bg-mosaic-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-mosaic-focus">
              <span className="grid min-w-0 gap-1"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-card-12 font-extrabold text-mosaic-primary">{job.job_name || `Job ${id}`}</strong><span className="overflow-hidden text-ellipsis whitespace-nowrap text-card-11 text-mosaic-secondary"><SummaryLine job={job} /></span>{size !== "small" && <span className="overflow-hidden text-ellipsis whitespace-nowrap text-card-10 text-mosaic-muted">{kind === "pending" ? `Reason: ${job.reason || "Not provided"}` : kind === "running" ? `${job.nodes || "--"} node${Number(job.nodes) === 1 ? "" : "s"} • limit ${formatSlurmDuration(job.time_limit)}` : `Result: ${job.state || "Unknown"}`}</span>}</span>
              <span className={cx("inline-flex rounded px-1.5 py-0.5 text-card-9 font-extrabold", getStateTone(job.state))}>{statusLabel(job.state)}</span>
            </button>
          </article>;
        })}</div>
        {hasNext && (filter === "all" || filter === "finished") && <button type="button" disabled={loadingMore} onClick={() => load(page + 1, true)} className="non-draggable mt-2 min-h-8 w-full rounded-[5px] border border-mosaic-border bg-mosaic-surface text-card-11 font-bold text-mosaic-link">{loadingMore ? "Loading…" : `Load more jobs (${pastJobs.length} of ${total})`}</button>}
      </div>}
      {selected && <JobDrawer job={selected} onClose={() => setSelected(null)} onRefresh={refreshSelectedJob} cancelJob={cancelJob} canceling={canceling} />}
    </section>
  );
};

export default MyJobsCard;
