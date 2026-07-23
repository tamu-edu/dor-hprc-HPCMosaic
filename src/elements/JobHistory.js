import React, { useCallback, useEffect, useState } from "react";
import { AiOutlineHistory } from "react-icons/ai";
import { MdChevronRight, MdRefresh } from "react-icons/md";
import { get_base_url } from "../utils/api_config.js";
import { cardClasses, cx, normalizeState } from "./dashboardUtils";

const PAGE_SIZE = 10;

const formatDate = (value) => {
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

const getStateTone = (state) => {
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

const JobHistory = () => {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const loadPage = useCallback(async (requestedPage, append, signal) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        page: String(requestedPage),
        page_size: String(PAGE_SIZE),
      });
      const response = await fetch(`${get_base_url()}/api/jobs/past_jobs?${query}`, { signal });
      const data = await response.json();

      if (!response.ok || data?.error) {
        throw new Error(data?.error || `Request failed with ${response.status}`);
      }

      const incomingJobs = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs((currentJobs) => {
        if (!append) return incomingJobs;

        const knownIds = new Set(currentJobs.map((job) => String(job.job_id)));
        return [...currentJobs, ...incomingJobs.filter((job) => !knownIds.has(String(job.job_id)))];
      });
      setPage(Number(data.page) || requestedPage);
      setTotal(Number(data.total) || 0);
      setHasNext(Boolean(data.has_next));
    } catch (loadError) {
      if (loadError.name !== "AbortError") setError(loadError.message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setExpandedJobId(null);
    loadPage(1, false, controller.signal);
    return () => controller.abort();
  }, [loadPage, refreshNonce]);

  const refresh = () => setRefreshNonce((nonce) => nonce + 1);

  return (
    <section className={cx(cardClasses.shellPadded, "box-border flex min-h-0 min-w-0 flex-col")}>
      <div className={cx(cardClasses.title, "shrink-0 pr-8")}>
        <span className={cardClasses.icon}><AiOutlineHistory /></span>
        <h3 className={cardClasses.titleText}>Job History</h3>
        <button
          type="button"
          className={cx(cardClasses.link, "inline-flex min-h-6 items-center gap-1 py-0.5")}
          onClick={refresh}
          aria-label="Refresh job history"
          title="Refresh job history"
        >
          <MdRefresh className="text-card-15" />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className={cardClasses.loading}>Loading job history</div>
      ) : jobs.length === 0 && !error ? (
        <div className={cardClasses.empty}>No jobs in the past 24 hours</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2 text-card-11 font-semibold text-mosaic-muted">
            <span>Past 24 hours</span>
            <span>{jobs.length} of {total} loaded</span>
          </div>

          {error && (
            <div className="mb-2 shrink-0 rounded-[5px] border border-mosaic-danger-bg bg-mosaic-danger-bg/10 p-2 text-card-12 font-semibold text-mosaic-danger" role="alert">
              {error}
            </div>
          )}

          <div className="grid min-h-0 flex-1 auto-rows-max content-start gap-[7px] overflow-y-auto pr-1 [overscroll-behavior:contain] [scrollbar-gutter:stable]" aria-label="Past jobs">
            {jobs.map((job, index) => {
              const jobId = String(job.job_id || `job-${index}`);
              const expanded = expandedJobId === jobId;

              return (
                <article className="overflow-hidden rounded-[5px] border border-mosaic-border bg-mosaic-table" key={jobId}>
                  <button
                    type="button"
                    className="non-draggable grid min-h-[47px] w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 border-0 bg-transparent px-2 py-2 text-left hover:bg-mosaic-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-mosaic-focus"
                    onClick={() => setExpandedJobId(expanded ? null : jobId)}
                    aria-expanded={expanded}
                  >
                    <MdChevronRight className={cx("text-card-18 text-mosaic-muted transition-transform", expanded && "rotate-90")} aria-hidden="true" />
                    <span className="grid min-w-0 gap-0.5">
                      <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-card-12 font-extrabold text-mosaic-primary">
                        {job.job_name || `Job ${jobId}`}
                      </strong>
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap text-card-11 text-mosaic-secondary">
                        {jobId} • {formatDate(job.submit_time)} • {job.runtime || "--"}
                      </span>
                    </span>
                    <span className={cx("rounded px-1.5 py-0.5 text-card-9 font-extrabold", getStateTone(job.state))}>
                      {job.state || "Unknown"}
                    </span>
                  </button>

                  {expanded && (
                    <dl className="ml-[26px] grid grid-cols-3 gap-x-3 gap-y-2 border-t border-mosaic-border px-2 pb-2.5 pt-2 max-[620px]:grid-cols-2 [&_dd]:m-0 [&_dd]:break-words [&_dd]:text-card-12 [&_dd]:font-semibold [&_dd]:text-mosaic-primary [&_dt]:text-card-10 [&_dt]:font-extrabold [&_dt]:uppercase [&_dt]:text-mosaic-muted">
                      <div><dt>Account</dt><dd>{displayValue(job.account)}</dd></div>
                      <div><dt>Partition</dt><dd>{displayValue(job.partition)}</dd></div>
                      <div><dt>Time limit</dt><dd>{displayValue(job.time_limit)}</dd></div>
                      <div><dt>Nodes</dt><dd>{displayValue(job.nodes)}</dd></div>
                      <div><dt>CPUs</dt><dd>{displayValue(job.cpus)}</dd></div>
                      <div><dt>GPUs</dt><dd>{displayValue(job.gpus)}</dd></div>
                      <div><dt>Exit code</dt><dd>{displayValue(job.exit_code)}</dd></div>
                    </dl>
                  )}
                </article>
              );
            })}
          </div>

          {hasNext && (
            <button
              type="button"
              className="non-draggable mt-2 min-h-8 shrink-0 rounded-[5px] border border-mosaic-border bg-mosaic-surface px-3 py-1.5 text-card-12 font-bold text-mosaic-link hover:border-mosaic-accent hover:bg-mosaic-surface-hover disabled:cursor-wait disabled:text-mosaic-disabled"
              onClick={() => loadPage(page + 1, true)}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default JobHistory;
