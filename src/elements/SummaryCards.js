import React, { useEffect, useMemo, useState } from "react";
import {
  AiOutlineApartment,
  AiOutlineDatabase,
  AiOutlineHdd,
  AiOutlineUnorderedList,
} from "react-icons/ai";
import {
  MdCheckCircleOutline,
  MdChevronLeft,
  MdChevronRight,
  MdErrorOutline,
  MdEvent,
  MdInfoOutline,
  MdRefresh,
  MdWarningAmber,
} from "react-icons/md";
import QuotaButton from "./QuotaButton";
import { get_base_url } from "../utils/api_config.js";
import { generate_file_explorer_path_for_disk } from "../utils/generate_filepath";
import {
  formatNumber,
  formatPercent,
  cardClasses,
  cx,
  getUsageFillClass,
  getUsageToneClass,
  getNodeStatusStyle,
  isGpuPartition,
  NODE_STATUS_LABELS,
  NODE_STATUS_ORDER,
  normalizeNodeState,
  normalizeState,
  parseNumeric,
  parseStorageToMiB,
  useApi,
} from "./dashboardUtils";

const getNodePartitionName = (node) => String(node?.partition || node?.partitionName || "unknown");

const getUniqueNodeKey = (groupName, node, seenKeys) => {
  const partitionName = getNodePartitionName(node);
  const nodeName = String(node?.name || "unknown-node");
  const baseKey = `${groupName}-${partitionName}-${nodeName}`;

  if (!seenKeys.has(baseKey)) {
    seenKeys.set(baseKey, 1);
    return baseKey;
  }

  const duplicateCount = seenKeys.get(baseKey) + 1;
  seenKeys.set(baseKey, duplicateCount);
  return `${baseKey}-${duplicateCount}`;
};

const summaryStatTextClass = (tone) => {
  if (tone === "green") return "text-mosaic-success";
  if (tone === "amber") return "text-mosaic-caution";
  if (tone === "red") return "text-mosaic-danger";
  return "text-mosaic-primary";
};

const statusBadgeClass = (state) => {
  const normalized = normalizeState(state);
  if (normalized === "running") return "bg-mosaic-success-bg";
  if (normalized === "pending") return "bg-mosaic-caution-bg";
  if (normalized === "failed") return "bg-mosaic-danger-bg";
  if (normalized === "completed") return "bg-mosaic-border-strong";
  return "bg-mosaic-muted";
};

const dotButtonClass = (active) => cx(
  "non-draggable h-[7px] rounded-full border-0 p-0 transition-all",
  active ? "w-[18px] bg-mosaic-accent" : "w-[7px] bg-mosaic-border"
);

const statusDotClass = "h-2.5 w-2.5 rounded-full bg-[var(--node-status-color)]";

const usageFillColor = (tone) => {
    if (tone === "warning") return "#f59e0b";
    if (tone === "danger") return "#dc2626";
    return "#16a34a";
};

const usageBar = (percent, tone, label, extraClass = "") => (
  <span
    className={cx("block h-2.5 overflow-hidden rounded-full bg-mosaic-border", extraClass)}
    title={label}
    aria-label={label}
  >
    <span className={cx("block h-full rounded-full", getUsageFillClass(tone))} style={{ width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: usageFillColor(tone), }} />
  </span>
);

export const MyJobsSummaryCard = () => {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const { data, loading, error } = useApi(`/api/jobs?refresh=${refreshNonce}`);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [cancelingJobId, setCancelingJobId] = useState(null);
  const [localError, setLocalError] = useState("");
  const baseUrl = get_base_url();
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  const getJobId = (job, index) => String(job.job_id || job.id || `job-${index}`);
  const counts = jobs.reduce((summary, job) => {
    summary[normalizeState(job.state)] = (summary[normalizeState(job.state)] || 0) + 1;
    return summary;
  }, {});

  useEffect(() => {
    if (selectedJobId && !jobs.some((job, index) => getJobId(job, index) === selectedJobId)) {
      setSelectedJobId(null);
    }
  }, [jobs, selectedJobId]);

  const refreshJobs = () => {
    setLocalError("");
    setRefreshNonce((nonce) => nonce + 1);
  };
  const getJobRuntime = (job) => job.runtime || job.time_elapsed || "--";
  const getJobNodeCount = (job) => {
    if (job.node_count !== undefined) return job.node_count;
    if (job.num_nodes !== undefined) return job.num_nodes;
    if (typeof job.nodes === "number") return job.nodes;
    const nodeList = job.node_list || job.nodelist;
    if (!nodeList) return "--";
    return String(nodeList).split(",").filter(Boolean).length || "--";
  };
  const getJobMemory = (job) => job.memory || job.mem || job.mem_per_node || job.mem_per_cpu || "--";
  const getJobCpus = (job) => job.cpus ?? job.cpu_count ?? "--";
  const getJobGpus = (job) => job.gpus ?? job.gpu_count ?? "--";
  const getResourceSummary = (job) => {
    const partition = job.partition || "--";
    const nodeCount = getJobNodeCount(job);
    const cpus = getJobCpus(job);
    const gpus = getJobGpus(job);
    const gpuCount = Number(gpus);
    const showGpus = gpus !== "--" && (isGpuPartition(partition) || (Number.isFinite(gpuCount) && gpuCount > 0));
    const resourceTail = showGpus
      ? `${gpus} GPU`
      : nodeCount === "--" ? null : `${nodeCount} ${Number(nodeCount) === 1 ? "Node" : "Nodes"}`;

    return [
      partition,
      cpus === "--" ? null : `${cpus} CPU`,
      resourceTail,
    ].filter(Boolean).join(" • ");
  };
  const getJobStatusLabel = (state) => {
    const normalized = normalizeState(state);
    if (normalized === "unknown") return state || "Unknown";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };
  const getPendingReason = (job) => job.reason || job.pending_reason || job.state_reason || job.reason_list || "";
  const getPendingReasonMessage = (reason) => {
    const value = String(reason || "").trim();
    const normalized = value.toLowerCase();
    if (!value || value === "--" || normalized === "none") return "The scheduler has not provided a pending reason yet.";
    if (normalized.includes("priority")) return "This job is waiting because other queued jobs currently have higher priority.";
    if (normalized.includes("resources")) return "This job is waiting for enough requested resources to become available.";
    if (normalized.includes("dependency")) return "This job is waiting for another job or dependency to finish first.";
    if (normalized.includes("jobhelduser")) return "This job is on hold. Release the hold when you are ready for it to run.";
    if (normalized.includes("jobheldadmin")) return "This job is on hold by an administrator.";
    if (normalized.includes("reqnodenotavail")) return "Some requested nodes are unavailable, down, drained, or reserved.";
    if (normalized.includes("partitiontimelimit") || normalized.includes("timelimit")) return "The requested time may exceed a limit for this partition.";
    if (normalized.includes("begintime")) return "This job is scheduled to become eligible at a later start time.";
    if (normalized.includes("license")) return "This job is waiting for a required software license to become available.";
    if (normalized.includes("qos") || normalized.includes("assocgrp")) return "This job is waiting because an account, group, or QOS usage limit is currently reached.";
    if (normalized.includes("invalidaccount")) return "The selected account is not valid for this job.";
    if (normalized.includes("badconstraints")) return "The requested job constraints cannot currently be satisfied.";

    return `Scheduler reason: ${value}`;
  };
  const toggleJob = (jobId) => {
    setSelectedJobId((currentJobId) => currentJobId === jobId ? null : jobId);
  };
  const handleRowKeyDown = (event, jobId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleJob(jobId);
    }
  };
  const cancelJob = (jobId) => {
    if (!jobId) return;
    if (!window.confirm(`Cancel job ${jobId}?`)) return;

    setCancelingJobId(jobId);
    setLocalError("");

    fetch(`${baseUrl}/api/cancel_job/${jobId}`, { method: "POST" })
      .then((res) => res.json())
      .then((response) => {
        if (response.error) throw new Error(response.error);
        setSelectedJobId((currentJobId) => currentJobId === jobId ? null : currentJobId);
        refreshJobs();
      })
      .catch((cancelError) => setLocalError(cancelError.message))
      .finally(() => setCancelingJobId(null));
  };

  return (
    <section className={cx(cardClasses.shellPadded, "box-border flex min-h-0 min-w-0 flex-col")}>
      <div className={cx(cardClasses.title, "shrink-0 pr-8")}>
        <span className={cardClasses.icon}><AiOutlineUnorderedList /></span>
        <h3 className={cardClasses.titleText}>My Jobs</h3>
        <button type="button" className={cx(cardClasses.link, "inline-flex min-h-6 items-center gap-1 py-0.5")} onClick={refreshJobs} aria-label="Refresh jobs" title="Refresh jobs">
          <MdRefresh className="shrink-0 text-card-15" />
          <span>Refresh</span>
        </button>
      </div>
      {loading ? <div className={cardClasses.loading}>Loading</div> : error ? <div className={cardClasses.empty}>Unavailable</div> : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]">
          <div className="mb-2 grid shrink-0 grid-cols-2 gap-2 border-b border-mosaic-border px-0 pb-2 pt-px">
            <span className="text-center text-card-11 text-mosaic-muted"><strong className={cx("block text-card-19", summaryStatTextClass("green"))}>{counts.running || 0}</strong>Running</span>
            <span className="text-center text-card-11 text-mosaic-muted"><strong className={cx("block text-card-19", summaryStatTextClass("amber"))}>{counts.pending || 0}</strong>Pending</span>
          </div>
          {localError && <div className="mb-2 shrink-0 text-card-12 font-semibold text-mosaic-danger">{localError}</div>}
          {jobs.length > 0 ? (
            <div className="grid shrink-0 content-start gap-[7px]" aria-label="Jobs">
              {jobs.map((job, index) => {
                const jobId = getJobId(job, index);
                const isExpanded = selectedJobId === jobId;
                const resourceSummary = getResourceSummary(job);

                return (
                  <div
                    className={cx(
                      "non-draggable grid min-w-0 cursor-pointer gap-0 overflow-hidden rounded-[5px] border border-l-[3px] bg-mosaic-table transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mosaic-accent-hover",
                      isExpanded
                        ? "border-mosaic-border-strong border-l-mosaic-accent-hover bg-mosaic-surface-hover"
                        : "border-mosaic-border border-l-transparent hover:border-mosaic-border-strong hover:bg-mosaic-surface-hover"
                    )}
                    key={`${jobId}-${index}`}
                    onClick={() => toggleJob(jobId)}
                    onKeyDown={(event) => handleRowKeyDown(event, jobId)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                  >
                    <div className="grid min-w-0 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-[9px] pl-2">
                      <MdChevronRight className={cx("text-card-18 text-mosaic-muted transition-transform duration-150", isExpanded && "rotate-90 text-mosaic-secondary")} aria-hidden="true" />
                      <div className="grid min-w-0 gap-[3px]">
                        <strong className="[overflow-wrap:anywhere] text-card-12 font-extrabold text-mosaic-primary">{job.job_id || "-"}</strong>
                        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-card-11 font-semibold text-mosaic-secondary">{resourceSummary}</span>
                      </div>
                      <span className={cx("inline-flex rounded px-[5px] py-0.5 text-card-9 font-extrabold text-white", statusBadgeClass(job.state))}>{getJobStatusLabel(job.state)}</span>
                    </div>
                    <div className={cx("grid overflow-hidden transition-[grid-template-rows] duration-200", isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div className={cx("ml-[26px] grid min-h-0 gap-[9px] overflow-hidden px-2.5 transition-opacity duration-150", isExpanded ? "border-t border-mosaic-border pb-2.5 opacity-100" : "opacity-0")}>
                        <dl className="mt-[9px] grid grid-cols-3 gap-x-[9px] gap-y-[7px] max-[760px]:grid-cols-2 [&_dd]:m-0 [&_dd]:mt-px [&_dd]:[overflow-wrap:anywhere] [&_dd]:text-card-12 [&_dd]:font-semibold [&_dd]:text-mosaic-primary [&_dt]:text-card-10 [&_dt]:font-extrabold [&_dt]:uppercase [&_dt]:text-mosaic-muted">
                          <div><dt>Partition</dt><dd>{job.partition || "--"}</dd></div>
                          <div><dt>Runtime</dt><dd>{getJobRuntime(job)}</dd></div>
                          <div><dt>Nodes</dt><dd>{getJobNodeCount(job)}</dd></div>
                          <div><dt>CPUs</dt><dd>{getJobCpus(job)}</dd></div>
                          <div><dt>GPUs</dt><dd>{getJobGpus(job)}</dd></div>
                          <div><dt>Memory</dt><dd>{getJobMemory(job)}</dd></div>
                        </dl>
                        {normalizeState(job.state) === "pending" && (
                          <div className="grid gap-[3px] rounded-[5px] border border-mosaic-border bg-mosaic-app px-[9px] py-2">
                            <strong className="text-card-10 font-extrabold uppercase text-mosaic-caution">Why pending</strong>
                            <span className="text-card-12 font-semibold text-mosaic-primary">{getPendingReasonMessage(getPendingReason(job))}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          className="non-draggable w-auto justify-self-start rounded-[5px] bg-mosaic-danger-bg px-2.5 py-2 text-card-12 font-extrabold text-mosaic-accent-text hover:bg-mosaic-danger-hover disabled:cursor-not-allowed disabled:bg-mosaic-disabled-bg disabled:text-mosaic-disabled"
                          onClick={(event) => {
                            event.stopPropagation();
                            cancelJob(job.job_id);
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                          disabled={cancelingJobId === job.job_id || !job.job_id}
                        >
                          {cancelingJobId === job.job_id ? "Canceling..." : "Cancel Job"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={cardClasses.empty}>No active jobs</div>
          )}
        </div>
      )}
    </section>
  );
};

export const MyQuotasSummaryCard = () => {
  const { data, loading, error } = useApi("/api/showquota");
  const quotas = Array.isArray(data?.quotas) ? data.quotas : [];
  const isHomeDirectory = (disk = "") => String(disk).includes("/home");
  const getUsageTone = (percent) => {
    if (percent > 90) return "danger";
    if (percent >= 70) return "warning";
    return "healthy";
  };
  const renderQuotaPath = (disk) => (
    String(disk).startsWith("/") ? generate_file_explorer_path_for_disk(disk) : disk
  );

  const getQuotaUsage = (quota) => {
    const used = Number.isFinite(quota.disk_usage_mib) ? quota.disk_usage_mib : parseStorageToMiB(quota.disk_usage);
    const limit = Number.isFinite(quota.disk_limit_mib) ? quota.disk_limit_mib : parseStorageToMiB(quota.disk_limit);
    const rawDiskPercent = Number.isFinite(quota.disk_usage_percent)
      ? quota.disk_usage_percent
      : limit ? (used / limit) * 100 : 0;
    const fileUsed = Number.isFinite(quota.file_usage_count) ? quota.file_usage_count : parseNumeric(quota.file_usage);
    const fileLimit = Number.isFinite(quota.file_limit_count) ? quota.file_limit_count : parseNumeric(quota.file_limit);
    const rawFilePercent = Number.isFinite(quota.file_usage_percent)
      ? quota.file_usage_percent
      : fileLimit ? (fileUsed / fileLimit) * 100 : 0;

    return {
      diskPercent: formatPercent(rawDiskPercent),
      filePercent: formatPercent(rawFilePercent),
      diskOverQuota: quota.disk_over_quota === true || rawDiskPercent > 100,
      fileOverQuota: quota.file_over_quota === true || rawFilePercent > 100,
      diskUsageLabel: `${quota.disk_usage || formatNumber(used)}/${quota.disk_limit || formatNumber(limit)}`,
      fileUsageLabel: `${formatNumber(fileUsed)}/${formatNumber(fileLimit)}`,
    };
  };

  return (
    <section className={cx(cardClasses.shellPadded, "box-border flex min-h-0 min-w-0 flex-col")}>
      <div className={cx(cardClasses.title, "shrink-0")}>
        <span className={cardClasses.icon}><AiOutlineDatabase /></span>
        <h3 className={cardClasses.titleText}>My Quotas</h3>
      </div>
      {loading ? <div className={cardClasses.loading}>Loading</div> : error ? <div className={cardClasses.empty}>Unavailable</div> : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 content-start gap-[7px] overflow-y-auto pr-1 [scrollbar-gutter:stable]">
            {quotas.map((quota, index) => {
              const { diskPercent, diskUsageLabel, diskOverQuota, filePercent, fileUsageLabel, fileOverQuota } = getQuotaUsage(quota);
              const disk = String(quota.disk || "Unknown path");
              const isExpandable = !isHomeDirectory(disk);
              const diskTone = getUsageTone(diskPercent);
              const fileTone = getUsageTone(filePercent);

              return (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 rounded-[5px] border border-mosaic-border bg-mosaic-surface p-[9px] max-[520px]:grid-cols-1" key={`${disk}-${index}`} title={quota.additional_info || disk}>
                  <div className="grid min-w-0 gap-[5px]">
                    <strong className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-card-12 font-bold text-mosaic-primary [&_a]:block [&_a]:overflow-hidden [&_a]:text-ellipsis [&_a]:whitespace-nowrap">{renderQuotaPath(disk)}</strong>
                    <div className="grid grid-cols-2 gap-[7px] max-[520px]:grid-cols-1">
                      <div className="grid min-w-0 gap-1">
                        <span className="flex justify-between gap-[5px] text-card-11-5 text-mosaic-secondary">
                          Disk <strong className={cx("whitespace-nowrap", getUsageToneClass(diskTone))}>{diskPercent}%{diskOverQuota && " · Over quota"}</strong>
                        </span>
                        {usageBar(diskPercent, diskTone, `Disk usage ${diskUsageLabel}`, "h-1.5")}
                      </div>
                      <div className="grid min-w-0 gap-1">
                        <span className="flex justify-between gap-[5px] text-card-11-5 text-mosaic-secondary">
                          Files <strong className={cx("whitespace-nowrap", getUsageToneClass(fileTone))}>{filePercent}%{fileOverQuota && " · Over quota"}</strong>
                        </span>
                        {usageBar(filePercent, fileTone, `File usage ${fileUsageLabel}`, "h-1.5")}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end max-[520px]:justify-start">
                    {isExpandable ? (
                      <QuotaButton
                        disk={disk}
                        currentQuota={quota.disk_limit}
                        currentFileLimit={quota.file_limit}
                        buttonText="Request"
                        buttonClassName="min-h-[22px] whitespace-nowrap rounded border border-mosaic-accent-hover bg-mosaic-accent px-2 py-[3px] text-card-11 font-bold leading-none text-mosaic-accent-text no-underline"
                      />
                    ) : (
                      <span className="whitespace-nowrap text-card-11 font-bold text-mosaic-muted">Not expandable</span>
                    )}
                  </div>
                </div>
              );
            })}
            {quotas.length === 0 && <div className={cardClasses.empty}>No quota data</div>}
          </div>
          <div className="sticky bottom-0 mt-2 flex shrink-0 items-center gap-[5px] border-t border-mosaic-border bg-mosaic-surface pt-2 text-card-11-5 text-mosaic-secondary">To increase your quota click Request</div>
        </div>
      )}
    </section>
  );
};

export const AccountsUsageSummaryCard = () => {
  const { data, loading, error } = useApi("/api/projectinfo");
  const [defaultAccountStatus, setDefaultAccountStatus] = useState(null);
  const [updatingDefaultAccount, setUpdatingDefaultAccount] = useState(null);
  const projects = data?.projects?.projects || [];
  const accounts = useMemo(() => [...projects].sort((a, b) => {
    if (a.default === b.default) return 0;
    return a.default === "Y" ? -1 : 1;
  }), [projects]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rotationPausedUntil, setRotationPausedUntil] = useState(0);
  const AUTO_ROTATE_MS = 7000;
  const MANUAL_PAUSE_MS = 14000;

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(accounts.length - 1, 0)));
  }, [accounts.length]);

  useEffect(() => {
    if (accounts.length <= 1) return undefined;

    const interval = window.setInterval(() => {
      if (Date.now() < rotationPausedUntil) return;
      setActiveIndex((index) => (index + 1) % accounts.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(interval);
  }, [accounts.length, rotationPausedUntil]);

  const activeAccount = accounts[activeIndex];
  const hasMultipleAccounts = accounts.length > 1;
  const used = Number(activeAccount?.used_pending_sus || 0);
  const limit = Number(activeAccount?.allocation || 0);
  const percent = limit ? Math.min(100, formatPercent((used / limit) * 100)) : 0;

  const pauseAccountRotation = () => setRotationPausedUntil(Date.now() + MANUAL_PAUSE_MS);

  const showPreviousAccount = () => {
    pauseAccountRotation();
    setActiveIndex((index) => (index === 0 ? accounts.length - 1 : index - 1));
  };

  const showNextAccount = () => {
    pauseAccountRotation();
    setActiveIndex((index) => (index + 1) % accounts.length);
  };

  const showAccount = (index) => {
    pauseAccountRotation();
    setActiveIndex(index);
  };

  const setDefaultAccount = async (account) => {
    if (!account || updatingDefaultAccount) return;

    pauseAccountRotation();
    setDefaultAccountStatus(null);
    setUpdatingDefaultAccount(account);

    try {
      const response = await fetch(`${get_base_url()}/api/set_default_account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_no: account }),
      });
      const responseData = await response.json();

      if (!response.ok || responseData?.error) {
        throw new Error(responseData?.error || `Request failed with ${response.status}`);
      }

      window.dispatchEvent(new Event("mosaic-dashboard-refresh"));
      setActiveIndex(0);
      setDefaultAccountStatus({ type: "success", text: `${account} is now the default account.` });
    } catch (setDefaultError) {
      setDefaultAccountStatus({
        type: "error",
        text: setDefaultError.message || "Unable to update the default account.",
      });
    } finally {
      setUpdatingDefaultAccount(null);
    }
  };

  return (
    <section className={cx(cardClasses.shell, "flex min-h-0 flex-col")}>
      <div className={cardClasses.title}>
        <span className={cardClasses.icon}><AiOutlineApartment /></span>
        <h3 className={cardClasses.titleText}>Accounts <span className={cardClasses.titleSubtext}>(Current Usage)</span></h3>
      </div>
      {loading ? <div className={cardClasses.loading}>Loading</div> : error ? <div className={cardClasses.empty}>Unavailable</div> : (
        accounts.length === 0 ? <div className={cardClasses.empty}>No account data</div> : (
          <div className="grid min-h-0 gap-2.5 transition-opacity">
            <div className="relative min-h-[57px]">
              {hasMultipleAccounts && (
                <button type="button" onClick={showPreviousAccount} className={cx(cardClasses.iconButton, "absolute left-0 top-1/2 -translate-y-1/2")} aria-label="Previous account">
                  <MdChevronLeft />
                </button>
              )}
              <div className={cx("grid min-h-[57px] min-w-0 justify-items-center gap-1 text-center", hasMultipleAccounts && "px-9")}>
                <span className="text-card-10 font-bold uppercase text-mosaic-muted">Account number</span>
                <strong className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-card-22 font-extrabold text-mosaic-primary">{activeAccount.account || "-"}</strong>
                {activeAccount.default === "Y" ? (
                  <em className="rounded-full bg-mosaic-success-bg px-[7px] py-[3px] text-card-10 not-italic font-extrabold uppercase text-mosaic-success">Default</em>
                ) : (
                  <button
                    type="button"
                    className="non-draggable rounded border border-mosaic-accent-hover bg-mosaic-accent px-2 py-1 text-card-11 font-bold text-mosaic-accent-text disabled:cursor-wait disabled:opacity-60"
                    disabled={Boolean(updatingDefaultAccount)}
                    onClick={() => setDefaultAccount(activeAccount.account)}
                  >
                    {updatingDefaultAccount === activeAccount.account ? "Updating..." : "Set as Default"}
                  </button>
                )}
              </div>
              {hasMultipleAccounts && (
                <button type="button" onClick={showNextAccount} className={cx(cardClasses.iconButton, "absolute right-0 top-1/2 -translate-y-1/2")} aria-label="Next account">
                  <MdChevronRight />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-[7px]">
              <span className="grid min-h-[46px] min-w-0 gap-[3px] rounded-[5px] border border-mosaic-border bg-mosaic-app p-[7px]"><em className="text-card-10 not-italic font-bold uppercase text-mosaic-muted">FY</em><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-card-12 font-bold text-mosaic-primary">{activeAccount.fy || "-"}</strong></span>
              <span className="grid min-h-[46px] min-w-0 gap-[3px] rounded-[5px] border border-mosaic-border bg-mosaic-app p-[7px]"><em className="text-card-10 not-italic font-bold uppercase text-mosaic-muted">Default status</em><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-card-12 font-bold text-mosaic-primary">{activeAccount.default === "Y" ? "Yes" : "No"}</strong></span>
              <span className="grid min-h-[46px] min-w-0 gap-[3px] rounded-[5px] border border-mosaic-border bg-mosaic-app p-[7px]"><em className="text-card-10 not-italic font-bold uppercase text-mosaic-muted">Balance</em><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-card-12 font-bold text-mosaic-primary">{activeAccount.balance ?? "-"}</strong></span>
              <span className="grid min-h-[46px] min-w-0 gap-[3px] rounded-[5px] border border-mosaic-border bg-mosaic-app p-[7px]" title={activeAccount.pi || ""}><em className="text-card-10 not-italic font-bold uppercase text-mosaic-muted">PI</em><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-card-12 font-bold text-mosaic-primary">{activeAccount.pi || "-"}</strong></span>
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-card-10 font-bold uppercase text-mosaic-muted">Used / Allocated</span>
                <strong className="whitespace-nowrap text-card-12 font-extrabold text-mosaic-primary">{formatNumber(used)} / {formatNumber(limit)}</strong>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-card-10 font-bold uppercase text-mosaic-muted">Usage</span>
                <strong className="whitespace-nowrap text-card-12 font-extrabold text-mosaic-primary">{percent}%</strong>
              </div>
              {usageBar(percent, "healthy", `Account usage ${formatNumber(used)} / ${formatNumber(limit)}`)}
            </div>

            <div className="flex items-center justify-between gap-2 text-card-11 font-bold text-mosaic-muted">
              <span>Account {activeIndex + 1} of {accounts.length}</span>
              <div className="flex min-w-0 gap-[5px] overflow-hidden" aria-label="Account indicators">
                {accounts.map((account, index) => (
                  <button
                    type="button"
                    key={`${account.account || "account"}-${account.fy || index}`}
                    className={dotButtonClass(index === activeIndex)}
                    onClick={() => showAccount(index)}
                    aria-label={`Show account ${index + 1}`}
                    aria-pressed={index === activeIndex}
                  />
                ))}
              </div>
            </div>
            {defaultAccountStatus && (
              <div
                className={cx(
                  "rounded px-2 py-1.5 text-card-11 font-bold",
                  defaultAccountStatus.type === "success"
                    ? "bg-mosaic-success-bg text-mosaic-success"
                    : "bg-mosaic-danger-bg text-mosaic-danger"
                )}
                role="status"
              >
                {defaultAccountStatus.text}
              </div>
            )}
          </div>
        )
      )}
    </section>
  );
};

export const ClusterNodesOverviewCard = () => {
  const { data, loading, error } = useApi("/api/nodes");
  const nodes = Array.isArray(data) ? data : [];
  const groups = [
    ["CPU", nodes.filter((node) => !isGpuPartition(node.partition))],
    ["GPU", nodes.filter((node) => isGpuPartition(node.partition))],
  ].filter(([, groupNodes]) => groupNodes.length > 0);
  const nodeKeysByGroup = groups.reduce((keysByGroup, [label, groupNodes]) => {
    const seenKeys = new Map();
    keysByGroup[label] = groupNodes.map((node) => getUniqueNodeKey(label, node, seenKeys));
    return keysByGroup;
  }, {});

  return (
    <section className={cx(cardClasses.shell, "flex flex-col overflow-auto")}>
      <div className={cardClasses.title}>
        <span className={cardClasses.icon}><AiOutlineHdd /></span>
        <h3 className={cardClasses.titleText}>Cluster Nodes</h3>
      </div>
      {loading ? <div className={cardClasses.loading}>Loading</div> : error ? <div className={cardClasses.empty}>Unavailable</div> : (
        <>
          <div className="flex flex-col gap-2.5">
            {groups.map(([label, groupNodes]) => (
              <div key={label}>
                <h4 className="mb-2 text-card-13 font-bold text-mosaic-primary">{label} ({groupNodes.length})</h4>
                <div className="flex flex-wrap gap-[5px]">
                  {groupNodes.slice(0, 54).map((node, nodeIndex) => (
                    <span
                      className={cx(
                        "inline-flex h-[23px] w-[43px] items-center justify-center rounded text-card-10 font-extrabold leading-none text-white shadow-[inset_0_0_0_1px_var(--mosaic-color-focus-ring)]",
                        normalizeNodeState(node.status) === "mixed" && "text-slate-950",
                        "bg-[var(--node-status-color)]"
                      )}
                      style={getNodeStatusStyle(normalizeNodeState(node.status))}
                      title={`${node.name} ${node.status}`}
                      key={nodeKeysByGroup[label][nodeIndex]}
                    >
                      {node.name}
                    </span>
                  ))}
                  {groupNodes.length > 54 && <span className="inline-flex items-center text-card-16 text-mosaic-muted">...</span>}
                </div>
              </div>
            ))}
          </div>
          {nodes.length === 0 && <div className={cardClasses.empty}>No node data</div>}
          <div className="mt-auto flex items-center justify-between gap-3.5 pt-2.5">
            <span className="text-card-11 text-mosaic-muted">Showing {Math.min(nodes.length, 108)} of {nodes.length} nodes</span>
            <div className="flex flex-wrap gap-2 rounded-md border border-mosaic-border bg-mosaic-table px-2.5 py-[7px]">
              {NODE_STATUS_ORDER.map((status) => (
                <span key={status} className="inline-flex items-center gap-[7px] text-card-11 text-mosaic-secondary">
                  <i className={statusDotClass} style={getNodeStatusStyle(status)} />
                  {NODE_STATUS_LABELS[status]}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export const AnnouncementsSummaryCard = () => {
  const { data, loading, error } = useApi("/api/announcements");
  const announcements = Array.isArray(data?.announcements)
    ? data.announcements
    : [];

  const severityPresentation = {
    info: {
      icon: <MdInfoOutline />,
      iconClass: "text-mosaic-icon",
    },
    warning: {
      icon: <MdWarningAmber />,
      iconClass: "text-mosaic-caution",
    },
    critical: {
      icon: <MdErrorOutline />,
      iconClass: "text-mosaic-danger",
    },
  };

  return (
    <section
      className={cx(
        cardClasses.shellPadded,
        "box-border flex min-h-0 min-w-0 flex-col"
      )}
    >
      <div className={cx(cardClasses.title, "shrink-0")}>
        <span className={cardClasses.icon}>
          <MdEvent />
        </span>
        <h3 className={cardClasses.titleText}>Announcements</h3>
      </div>

      {loading ? (
        <div className={cardClasses.loading}>Loading</div>
      ) : error ? (
        <div className={cardClasses.empty}>Unavailable</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {announcements.length > 0 ? (
            <div
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 [overscroll-behavior:contain] [scrollbar-gutter:stable]"
              aria-label="Active announcements"
            >
              {announcements.map((announcement) => {
                const presentation =
                  severityPresentation[announcement.severity] ||
                  severityPresentation.info;

                return (
                  <article
                    className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3 rounded-md border border-mosaic-border p-3"
                    key={announcement.id}
                  >
                    <span
                      className={cx(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-card-22",
                        presentation.iconClass
                      )}
                    >
                      {presentation.icon}
                    </span>

                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <h4 className="mb-1 text-card-13 font-bold text-mosaic-primary">
                        {announcement.title}
                      </h4>

                      <p className="m-0 text-card-11-5 text-mosaic-secondary">
                        {announcement.message}
                      </p>

                      {announcement.link?.url &&
                        announcement.link?.label && (
                          <a
                            className="non-draggable mt-2 inline-block max-w-full rounded-sm text-card-11-5 font-semibold text-mosaic-link underline decoration-transparent underline-offset-2 transition-colors hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mosaic-focus"
                            href={announcement.link.url}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {announcement.link.label}
                          </a>
                        )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <article className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 rounded-md border border-mosaic-border p-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-card-22 text-mosaic-success">
                <MdCheckCircleOutline />
              </span>

              <div>
                <h4 className="mb-1 text-card-13 font-bold text-mosaic-primary">
                  No Active Announcements
                </h4>

                <p className="m-0 text-card-11-5 text-mosaic-secondary">
                  There are no current dashboard announcements.
                </p>
              </div>
            </article>
          )}
        </div>
      )}
    </section>
  );
};
