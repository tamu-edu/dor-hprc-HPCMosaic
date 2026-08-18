import React, { useEffect, useMemo, useState } from "react";
import config from "../../config.yml";
import {
  AiOutlineApartment,
  AiOutlineDatabase,
  AiOutlineHdd,
} from "react-icons/ai";
import {
  MdCheckCircleOutline,
  MdChevronLeft,
  MdChevronRight,
  MdErrorOutline,
  MdEvent,
  MdInfoOutline,
  MdMenuBook,
  MdOpenInNew,
  MdWarningAmber,
} from "react-icons/md";
import QuotaButton from "./QuotaButton";
import { get_base_url } from "../utils/api_config.js";
import { generate_file_explorer_path_for_disk } from "../utils/generate_filepath";
import { formatIsoDate, isIsoDateBeforeToday } from "../utils/format_date.js";
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

export { default as MyJobsSummaryCard } from "./MyJobsCard";

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
              const quotaExpirationHasPassed = isIsoDateBeforeToday(quota.expiration_date);

              return (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 rounded-[5px] border border-mosaic-border bg-mosaic-surface p-[9px] max-[520px]:grid-cols-1" key={`${disk}-${index}`} title={quota.additional_info || disk}>
                  <div className="grid min-w-0 gap-[5px]">
                    <strong className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-card-12 font-bold text-mosaic-primary [&_a]:block [&_a]:overflow-hidden [&_a]:text-ellipsis [&_a]:whitespace-nowrap">{renderQuotaPath(disk)}</strong>
                    {quota.expiration_date && (
                      <span className={cx("text-card-11 font-bold", quotaExpirationHasPassed ? "text-mosaic-danger" : "text-mosaic-caution")}>
                        Extended quota {quotaExpirationHasPassed ? "expired on" : "expires"}{" "}
                        <time dateTime={quota.expiration_date}>{formatIsoDate(quota.expiration_date)}</time>
                      </span>
                    )}
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

export const GettingStartedCard = () => {
  const configuredCluster = String(
    config.production?.cluster_name || config.development?.cluster_name || ""
  ).trim().toLowerCase();
  const clusterGuides = {
    aces: {
      name: "ACES",
      href: "https://hprc.tamu.edu/kb/User-Guides/ACES/",
    },
    grace: {
      name: "Grace",
      href: "https://hprc.tamu.edu/kb/User-Guides/Grace/",
    },
    faster: {
      name: "FASTER",
      href: "https://hprc.tamu.edu/kb/User-Guides/FASTER/",
    },
    launch: {
      name: "Launch",
      href: "https://hprc.tamu.edu/kb/User-Guides/Launch/",
    },
  };
  const clusterGuide = clusterGuides[configuredCluster] || {
    name: config.production?.cluster_name || config.development?.cluster_name || "HPRC",
    href: "https://hprc.tamu.edu/kb/User-Guides/",
  };
  const resources = [
    {
      title: "New User Information",
      description: "Accounts, resources, training, and first steps",
      href: "https://hprc.tamu.edu/user_services/new_user_information.html",
    },
    {
      title: "HPRC Knowledge Base",
      description: "Quick starts, user guides, batch jobs, and FAQs",
      href: "https://hprc.tamu.edu/kb/",
    },
    {
      title: `${clusterGuide.name} Quick Start Guide`,
      description: `Connect to ${clusterGuide.name} and submit your first job`,
      href: clusterGuide.href,
    },
    {
      title: "Open OnDemand Portal",
      description: "Use files, shells, jobs, and interactive applications",
      href: "https://hprc.tamu.edu/kb/Software/Portal/",
    },
    {
      title: "File Transfer",
      description: "Move data with Globus, SFTP, rsync, or the portal",
      href: "https://hprc.tamu.edu/kb/Helpful-Pages/File-Transfer/",
    },
    {
      title: "Software",
      description: "Find installed applications and environment modules",
      href: "https://hprc.tamu.edu/kb/Software/",
    },
    {
      title: "Youtube Channel",
      description: "Watch introductory videos and shortcourse vods",
      href: "https://youtube.com/channel/UCgeDEHE5GwkxYUGS0FDLmPw/",
    },
  ];

  return (
    <section className={cx(cardClasses.shellPadded, "flex min-h-0 flex-col")}>
      <div className={cx(cardClasses.title, "shrink-0")}>
        <span className={cardClasses.icon}><MdMenuBook /></span>
        <h3 className={cardClasses.titleText}>Getting Started</h3>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        {resources.map(({ title, description, href }) => (
          <a
            aria-label={`${title} (opens in a new tab)`}
            className="non-draggable group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-mosaic-border py-[9px] no-underline transition-colors focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-mosaic-accent"
            href={href}
            key={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>
              <strong className="block text-card-13 text-mosaic-primary group-hover:text-mosaic-accent">{title}</strong>
              <span className="block text-card-11-5 text-mosaic-secondary">{description}</span>
            </span>
            <MdOpenInNew className="text-card-16 text-mosaic-icon group-hover:text-mosaic-accent" aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
};
