import React, { useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import "chart.js/auto";
import Spinner from "../framework/Spinner";
import { get_base_url } from "../utils/api_config.js";
import { cardClasses, cx } from "./dashboardUtils";

const STATE_ORDER = ["Running", "Pending", "Completed", "Failed", "Cancelled", "Timeout"];
const PAGE_SIZE = 50;
const STATE_COLORS = {
  Running: "#16a34a",
  Pending: "#eab308",
  Completed: "#2563eb",
  Failed: "#dc2626",
  Cancelled: "#6b7280",
  Timeout: "#f97316",
};

const emptySummary = {
  kpis: {
    running: 0,
    pending: 0,
    failed: 0,
    completed: 0,
  },
  state_distribution: STATE_ORDER.reduce((acc, state) => ({ ...acc, [state]: 0 }), {}),
  jobs_by_partition: {},
  submitted_over_time: {},
};

const normalizeValue = (value) => (value === undefined || value === null || value === "" ? "N/A" : value);

const getStateBadgeClass = (state) => {
  const normalized = (state || "").toLowerCase();
  if (normalized.includes("running")) return "bg-green-600";
  if (normalized.includes("pending")) return "bg-amber-500 text-slate-950";
  if (normalized.includes("failed")) return "bg-red-600";
  if (normalized.includes("cancel")) return "bg-slate-500";
  if (normalized.includes("complete")) return "bg-blue-600";
  if (normalized.includes("timeout")) return "bg-orange-500";
  return "bg-slate-500";
};

const explorerButtonClass = "rounded-[5px] border border-mosaic-border bg-mosaic-surface px-3 py-2 text-card-13 font-semibold text-mosaic-secondary transition-colors hover:border-mosaic-accent-hover hover:bg-mosaic-surface-hover hover:text-mosaic-primary disabled:cursor-not-allowed disabled:bg-mosaic-disabled-bg disabled:text-mosaic-disabled";
const explorerDangerButtonClass = "rounded-[5px] border border-mosaic-danger-bg bg-mosaic-danger-bg px-3 py-2 text-card-13 font-semibold text-mosaic-accent-text transition-colors hover:bg-mosaic-danger-hover disabled:cursor-not-allowed disabled:bg-mosaic-disabled-bg disabled:text-mosaic-disabled";
const explorerInputClass = "min-h-9 rounded-[5px] border border-mosaic-border-strong bg-mosaic-app px-3 py-2 text-card-13 text-mosaic-primary outline-none focus:border-mosaic-accent focus:shadow-[0_0_0_3px_var(--mosaic-color-focus-ring)]";
const explorerPanelClass = "rounded-[5px] border border-mosaic-border bg-mosaic-table p-3";

const uniqueOptions = (jobs, key) =>
  Array.from(new Set(jobs.map((job) => job[key]).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b))
  );

const buildChartData = (labels, values, colors) => ({
  labels,
  datasets: [
    {
      data: values,
      backgroundColor: colors,
      borderColor: colors,
      borderWidth: 1,
      tension: 0.3,
    },
  ],
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        boxWidth: 10,
        color: "#8a8f98",
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#8a8f98" },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: "#8a8f98", precision: 0 },
      grid: { color: "rgba(148, 163, 184, 0.16)" },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        boxWidth: 10,
        color: "#8a8f98",
      },
    },
  },
};

const JobExplorer = () => {
  const baseUrl = get_base_url();
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelingJob, setCancelingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    user: "",
    partition: "",
    state: "active",
    account: "",
    history_window: "24h",
  });

  const buildListUrl = (nextPage) => {
    const params = new URLSearchParams({
      page: String(nextPage),
      page_size: String(PAGE_SIZE),
      state: filters.state || "active",
      history_window: filters.history_window || "24h",
    });

    ["partition", "user", "account", "search"].forEach((key) => {
      const value = filters[key].trim();
      if (value) params.set(key, value);
    });

    return `${baseUrl}/api/jobs/list?${params.toString()}`;
  };

  const fetchSummary = () => {
    setSummaryLoading(true);
    fetch(`${baseUrl}/api/jobs/summary`)
      .then((response) =>
        response.json().then((data) => {
          if (!response.ok || data.error) {
            throw new Error(data.error || "Unable to load job summary");
          }
          return data;
        })
      )
      .then((data) => {
        setSummary(data || emptySummary);
        setWarnings(data.warnings || []);
      })
      .catch((err) => setWarnings((prev) => [...prev, err.message]))
      .finally(() => setSummaryLoading(false));
  };

  const fetchJobs = (nextPage = 1, append = false) => {
    setLoading(true);
    setError(null);
    fetch(buildListUrl(nextPage))
      .then((response) =>
        response.json().then((data) => {
          if (!response.ok || data.error) {
            throw new Error(data.error || "Unable to load jobs");
          }
          return data;
        })
      )
      .then((data) => {
        setJobs((prev) => (append ? [...prev, ...(data.jobs || [])] : data.jobs || []));
        setPage(data.page || nextPage);
        setHasNext(Boolean(data.has_next));
        setTotal(data.total === undefined ? null : data.total);
        setWarnings(data.warnings || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchJobs(1, false);
  }, [filters]);

  const refreshJobs = () => {
    fetchSummary();
    fetchJobs(1, false);
  };

  const loadMore = () => {
    if (!hasNext || loading) return;
    fetchJobs(page + 1, true);
  };

  const isHistoricalState = ["Completed", "Failed", "Cancelled", "Timeout"].includes(filters.state);

  const filterSummary = useMemo(() => {
    const stateLabel = filters.state === "active" ? "Active" : filters.state || "All";
    const countLabel = total === null ? `${jobs.length} loaded` : `${jobs.length} of ${total} loaded`;
    return `${stateLabel} jobs - ${countLabel}`;
  }, [filters.state, jobs.length, total]);

  const options = useMemo(
    () => ({
      user: uniqueOptions(jobs, "user"),
      partition: uniqueOptions(jobs, "partition"),
      account: uniqueOptions(jobs, "account"),
    }),
    [jobs]
  );

  const stateData = useMemo(() => {
    const distribution = summary.state_distribution || {};
    return buildChartData(
      STATE_ORDER,
      STATE_ORDER.map((state) => distribution[state] || 0),
      STATE_ORDER.map((state) => STATE_COLORS[state])
    );
  }, [summary]);

  const partitionData = useMemo(() => {
    const partitions = summary.jobs_by_partition || {};
    const labels = Object.keys(partitions);
    return buildChartData(labels, labels.map((label) => partitions[label]), "#2563eb");
  }, [summary]);

  const submittedData = useMemo(() => {
    const submitted = summary.submitted_over_time || {};
    const labels = Object.keys(submitted);
    return {
      labels,
      datasets: [
        {
          label: "Jobs",
          data: labels.map((label) => submitted[label]),
          borderColor: "#16a34a",
          backgroundColor: "rgba(22, 163, 74, 0.16)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [summary]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const exportCsv = () => {
    const columns = [
      "Job ID",
      "Job Name",
      "User",
      "Account",
      "Partition",
      "State",
      "Nodes",
      "CPUs",
      "GPUs",
      "Runtime",
      "Time Limit",
      "Submit Time",
    ];
    const rows = jobs.map((job) => [
      job.job_id,
      job.job_name,
      job.user,
      job.account,
      job.partition,
      job.state,
      job.nodes,
      job.cpus,
      job.gpus,
      job.runtime,
      job.time_limit,
      job.submit_time,
    ]);
    const csv = [columns, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value === undefined || value === null ? "" : value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "job-explorer.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const cancelJob = (jobId) => {
    setCancelingJob(jobId);
    fetch(`${baseUrl}/api/cancel_job/${jobId}`, { method: "POST" })
      .then((response) =>
        response.json().then((data) => {
          if (!response.ok || data.error) {
            throw new Error(data.error || `Unable to cancel job ${jobId}`);
          }
          return data;
        })
      )
      .then(() => {
        setJobs((currentJobs) => currentJobs.filter((job) => String(job.job_id) !== String(jobId)));
        setTotal((currentTotal) => (
          typeof currentTotal === "number" ? Math.max(0, currentTotal - 1) : currentTotal
        ));
        if (String(selectedJob?.job_id) === String(jobId)) {
          setSelectedJob(null);
          setDetailsLoading(false);
        }
        refreshJobs();
      })
      .catch((err) => setError(err.message))
      .finally(() => setCancelingJob(null));
  };

  const openDetails = (job) => {
    setSelectedJob(job);
    setDetailsLoading(true);
    fetch(`${baseUrl}/api/jobs/${encodeURIComponent(job.job_id)}`)
      .then((response) =>
        response.json().then((data) => {
          if (!response.ok || data.error) {
            throw new Error(data.error || "Unable to load job details");
          }
          return data.job;
        })
      )
      .then((details) => setSelectedJob({ ...job, ...details }))
      .catch(() => setSelectedJob(job))
      .finally(() => setDetailsLoading(false));
  };

  const renderContent = () => {
    if (loading && jobs.length === 0) return <Spinner />;

    return (
      <>
        {error && <div className="rounded-[5px] border border-mosaic-danger-bg bg-mosaic-danger-bg/10 p-2.5 text-card-13 font-semibold text-mosaic-danger">{error}</div>}
        {warnings.length > 0 && <div className="rounded-[5px] border border-mosaic-caution-bg bg-mosaic-caution-bg/10 p-2.5 text-card-13 font-semibold text-mosaic-caution">{warnings.join(" | ")}</div>}

        <section className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2" aria-label="Job summary">
          <div className={explorerPanelClass}>
            <div className="text-card-11 font-bold uppercase text-mosaic-muted">Running Jobs</div>
            <div className="text-card-26 font-extrabold text-mosaic-primary">{summaryLoading ? "..." : summary.kpis?.running || 0}</div>
          </div>
          <div className={explorerPanelClass}>
            <div className="text-card-11 font-bold uppercase text-mosaic-muted">Pending Jobs</div>
            <div className="text-card-26 font-extrabold text-mosaic-primary">{summaryLoading ? "..." : summary.kpis?.pending || 0}</div>
          </div>
          <div className={explorerPanelClass}>
            <div className="text-card-11 font-bold uppercase text-mosaic-muted">Failed Jobs</div>
            <div className="text-card-26 font-extrabold text-mosaic-primary">{summaryLoading ? "..." : summary.kpis?.failed || 0}</div>
          </div>
          <div className={explorerPanelClass}>
            <div className="text-card-11 font-bold uppercase text-mosaic-muted">Completed Jobs</div>
            <div className="text-card-26 font-extrabold text-mosaic-primary">{summaryLoading ? "..." : summary.kpis?.completed || 0}</div>
          </div>
        </section>

        <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2" aria-label="Job charts">
          <div className={explorerPanelClass}>
            <h3 className="mb-2 text-card-13 font-bold text-mosaic-primary">Job State Distribution</h3>
            <div className="h-44">
              <Doughnut data={stateData} options={doughnutOptions} />
            </div>
          </div>
          <div className={explorerPanelClass}>
            <h3 className="mb-2 text-card-13 font-bold text-mosaic-primary">Jobs By Partition</h3>
            <div className="h-44">
              <Bar data={partitionData} options={chartOptions} />
            </div>
          </div>
          <div className={explorerPanelClass}>
            <h3 className="mb-2 text-card-13 font-bold text-mosaic-primary">Jobs Submitted Over Time</h3>
            <div className="h-44">
              <Line data={submittedData} options={chartOptions} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2" aria-label="Job filters">
          <input
            className={explorerInputClass}
            type="search"
            placeholder="Search jobs"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
          />
          <select
            className={explorerInputClass}
            aria-label="State"
            value={filters.state}
            onChange={(event) => updateFilter("state", event.target.value)}
          >
            <option value="active">Active</option>
            {STATE_ORDER.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <input
            className={explorerInputClass}
            type="text"
            placeholder="Partition"
            list="job-explorer-partitions"
            value={filters.partition}
            onChange={(event) => updateFilter("partition", event.target.value)}
          />
          <input
            className={explorerInputClass}
            type="text"
            placeholder="User"
            list="job-explorer-users"
            value={filters.user}
            onChange={(event) => updateFilter("user", event.target.value)}
          />
          <input
            className={explorerInputClass}
            type="text"
            placeholder="Account"
            list="job-explorer-accounts"
            value={filters.account}
            onChange={(event) => updateFilter("account", event.target.value)}
          />
          <select
            className={explorerInputClass}
            aria-label="History window"
            value={filters.history_window}
            onChange={(event) => updateFilter("history_window", event.target.value)}
            disabled={!isHistoricalState}
          >
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
            <option value="14d">14 days</option>
            <option value="30d">30 days</option>
          </select>
          <datalist id="job-explorer-partitions">
            {options.partition.map((option) => <option key={option} value={option} />)}
          </datalist>
          <datalist id="job-explorer-users">
            {options.user.map((option) => <option key={option} value={option} />)}
          </datalist>
          <datalist id="job-explorer-accounts">
            {options.account.map((option) => <option key={option} value={option} />)}
          </datalist>
        </section>

        <div className="flex items-center justify-between gap-2 text-card-13 font-semibold text-mosaic-muted">
          <span>{filterSummary}</span>
          {loading && <span>Refreshing</span>}
        </div>

        {jobs.length === 0 ? (
          <div className="grid min-h-28 place-items-center gap-2 rounded-[5px] border border-mosaic-border bg-mosaic-table p-4 text-card-13 text-mosaic-muted">
            <div>No jobs found</div>
            <button className={explorerButtonClass} type="button" onClick={refreshJobs}>
              Refresh
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-auto rounded-[5px] border border-mosaic-border">
              <table className="w-full border-collapse text-card-12 text-mosaic-primary [&_td]:whitespace-nowrap [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5">
                <thead>
                  <tr className="bg-mosaic-table text-left text-card-11 font-bold uppercase text-mosaic-muted">
                    <th>Job ID</th>
                    <th>Job Name</th>
                    <th>User</th>
                    <th>Account</th>
                    <th>Partition</th>
                    <th>State</th>
                    <th>Nodes</th>
                    <th>CPUs</th>
                    <th>GPUs</th>
                    <th>Runtime</th>
                    <th>Time Limit</th>
                    <th>Submit Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.job_id} className="border-t border-mosaic-border hover:bg-mosaic-surface-hover">
                      <td>{normalizeValue(job.job_id)}</td>
                      <td>{normalizeValue(job.job_name)}</td>
                      <td>{normalizeValue(job.user)}</td>
                      <td>{normalizeValue(job.account)}</td>
                      <td>{normalizeValue(job.partition)}</td>
                      <td>
                        <span className={cx("inline-flex rounded px-1.5 py-0.5 text-card-10 font-extrabold text-white", getStateBadgeClass(job.state))}>
                          {normalizeValue(job.state)}
                        </span>
                      </td>
                      <td>{normalizeValue(job.nodes)}</td>
                      <td>{normalizeValue(job.cpus)}</td>
                      <td>{normalizeValue(job.gpus)}</td>
                      <td>{normalizeValue(job.runtime)}</td>
                      <td>{normalizeValue(job.time_limit)}</td>
                      <td>{normalizeValue(job.submit_time)}</td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          <button className={explorerButtonClass} type="button" onClick={() => openDetails(job)}>
                            View Details
                          </button>
                          {["Running", "Pending"].includes(job.state) && (
                            <button
                              className={explorerDangerButtonClass}
                              type="button"
                              disabled={cancelingJob === job.job_id}
                              onClick={() => cancelJob(job.job_id)}
                            >
                              {cancelingJob === job.job_id ? "Canceling" : "Cancel Job"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasNext && (
              <div className="flex justify-center">
                <button className={explorerButtonClass} type="button" onClick={loadMore} disabled={loading}>
                  {loading ? "Loading" : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </>
    );
  };

  return (
    <div className={cx(cardClasses.shellPadded, "flex h-full min-h-0 flex-col gap-3 overflow-auto")}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-card-22 font-extrabold text-mosaic-primary">Job Explorer</h2>
        <div className="flex flex-wrap gap-2">
          <button className={explorerButtonClass} type="button" onClick={refreshJobs} disabled={loading}>
            Refresh
          </button>
          <button className={explorerButtonClass} type="button" onClick={exportCsv} disabled={jobs.length === 0}>
            Export CSV
          </button>
        </div>
      </header>

      {renderContent()}

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelectedJob(null)}>
          <aside className="h-full w-full max-w-xl overflow-auto border-l border-mosaic-border bg-mosaic-surface p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-mosaic-border pb-3">
              <h3 className="m-0 text-card-18 font-bold text-mosaic-primary">Job Details</h3>
              <button className={explorerButtonClass} type="button" onClick={() => setSelectedJob(null)}>
                Close
              </button>
            </div>
            {detailsLoading ? (
              <Spinner />
            ) : (
              <>
                <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2 text-card-13 [&_dd]:m-0 [&_dd]:[overflow-wrap:anywhere] [&_dd]:text-mosaic-primary [&_dt]:font-bold [&_dt]:text-mosaic-muted">
                  <dt>Job ID</dt>
                  <dd>{normalizeValue(selectedJob.job_id)}</dd>
                  <dt>Job Name</dt>
                  <dd>{normalizeValue(selectedJob.job_name)}</dd>
                  <dt>User</dt>
                  <dd>{normalizeValue(selectedJob.user)}</dd>
                  <dt>Account</dt>
                  <dd>{normalizeValue(selectedJob.account)}</dd>
                  <dt>Partition</dt>
                  <dd>{normalizeValue(selectedJob.partition)}</dd>
                  <dt>State</dt>
                  <dd>{normalizeValue(selectedJob.state)}</dd>
                  <dt>Node List</dt>
                  <dd>{normalizeValue(selectedJob.node_list)}</dd>
                  <dt>Working Directory</dt>
                  <dd>{normalizeValue(selectedJob.working_directory)}</dd>
                  <dt>Submit Command</dt>
                  <dd>{normalizeValue(selectedJob.submit_command)}</dd>
                  <dt>Runtime</dt>
                  <dd>{normalizeValue(selectedJob.runtime)}</dd>
                  <dt>Time Limit</dt>
                  <dd>{normalizeValue(selectedJob.time_limit)}</dd>
                  <dt>Exit Code</dt>
                  <dd>{normalizeValue(selectedJob.exit_code)}</dd>
                </dl>
                <ul className="mt-4 grid gap-2 rounded-[5px] border border-mosaic-border bg-mosaic-table p-3 text-card-13 text-mosaic-secondary">
                  <li>CPU Efficiency</li>
                  <li>Memory Efficiency</li>
                  <li>GPU Resources</li>
                  <li>Job Output Preview</li>
                </ul>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

export default JobExplorer;
