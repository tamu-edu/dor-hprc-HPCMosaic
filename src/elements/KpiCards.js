import React, { useMemo } from "react";
import {
  AiOutlineHdd,
  AiOutlineLineChart,
  AiOutlinePartition,
  AiOutlineThunderbolt,
} from "react-icons/ai";
import { MdBusinessCenter } from "react-icons/md";
import {
  formatNumber,
  formatPercent,
  cardClasses,
  cx,
  getNodeStatusStyle,
  getToneTextClass,
  KpiCard,
  MiniNodeBar,
  NODE_STATUS_LABELS,
  NODE_STATUS_ORDER,
  NODE_STATUS_PRIORITY,
  normalizeNodeState,
  useApi,
} from "./dashboardUtils";

const isStaffNode = (node) => String(node?.partition || "")
  .split(",")
  .some((partition) => partition.trim().replace(/\*$/, "").toLowerCase() === "staff");

const dedupeKpiNodes = (rawNodes) => {
  const nodeMap = new Map();

  rawNodes.forEach((node) => {
    if (isStaffNode(node)) return;

    const name = node?.name || node?.node || node?.NodeName || "";
    if (!name) return;

    const status = normalizeNodeState(node?.status || node?.state || node?.State);
    const existingStatus = nodeMap.get(name);

    if (!existingStatus || NODE_STATUS_PRIORITY[status] > NODE_STATUS_PRIORITY[existingStatus]) {
      nodeMap.set(name, status);
    }
  });

  return Array.from(nodeMap.values());
};

export const CpuUtilizationCard = () => {
  const { data, loading, error } = useApi("/api/utilization");
  const allocated = data?.cores?.allocated || 0;
  const total = allocated + (data?.cores?.idle || 0);
  const percent = total ? formatPercent((allocated / total) * 100) : 0;

  return (
    <KpiCard
      icon={<AiOutlineThunderbolt />}
      title="CPU Utilization"
      value={percent}
      suffix="%"
      detail={`${formatNumber(allocated)} of ${formatNumber(total)} cores`}
      progressPercent={percent}
      progressLabel="Current core allocation"
      loading={loading}
      error={error}
    />
  );
};

export const GpuResourcesCard = () => {
  const { data, loading, error } = useApi("/api/gpu-resources");
  const busyNodes = data?.nodes?.busy || 0;
  const totalNodes = data?.nodes?.total || 0;
  const availableNodes = data?.nodes?.available || 0;
  const allocatedGpus = data?.gpus?.allocated || 0;
  const totalGpus = data?.gpus?.total || 0;

  return (
    <section className={cx(cardClasses.shell, "relative")}>
      <div className={cardClasses.title}>
        <span className={cardClasses.icon}><AiOutlinePartition /></span>
        <h3 className={cardClasses.titleText}>GPU Resources</h3>
      </div>
      {loading ? (
        <div className={cardClasses.loading}>Loading</div>
      ) : error ? (
        <div className={cardClasses.empty}>Unavailable</div>
      ) : (
        <div className="grid gap-[7px]">
          <div className="grid gap-0.5">
            <span className="text-card-11 font-semibold text-mosaic-secondary">GPU Nodes Busy</span>
            <strong className="text-card-24 font-extrabold text-mosaic-primary">
              {formatNumber(busyNodes)} <em className="text-[0.68em] not-italic font-bold text-mosaic-secondary">/ {formatNumber(totalNodes)}</em>
            </strong>
          </div>
          <div className="grid gap-0.5">
            <span className="text-card-11 font-semibold text-mosaic-secondary">GPUs Allocated</span>
            <strong className="text-card-24 font-extrabold text-mosaic-primary">
              {formatNumber(allocatedGpus)} <em className="text-[0.68em] not-italic font-bold text-mosaic-secondary">/ {formatNumber(totalGpus)}</em>
            </strong>
          </div>
          <div className="grid gap-0.5">
            <span className="text-card-11 font-semibold text-mosaic-secondary">Available GPU Nodes</span>
            <strong className="text-card-24 font-extrabold text-mosaic-primary">{formatNumber(availableNodes)}</strong>
          </div>
        </div>
      )}
    </section>
  );
};

export const GpuUtilizationCard = GpuResourcesCard;

export const NodesAvailableCard = () => {
  const { data, loading, error } = useApi("/api/nodes");
  const counts = useMemo(() => {
    const next = NODE_STATUS_ORDER.reduce((summary, status) => ({ ...summary, [status]: 0 }), {});
    if (Array.isArray(data)) {
      dedupeKpiNodes(data).forEach((status) => {
        next[status] = (next[status] || 0) + 1;
      });
    }
    return next;
  }, [data]);
  const available = counts.idle + counts.mixed;
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <KpiCard
      icon={<AiOutlineHdd />}
      title="Nodes Available"
      value={formatNumber(available)}
      suffix={`/ ${formatNumber(total)}`}
      detail={`Idle: ${counts.idle}   Down: ${counts.down}   Drain: ${counts.drained}`}
      loading={loading}
      error={error}
    >
      <MiniNodeBar counts={counts} />
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-[5px]">
        {NODE_STATUS_ORDER.map((status) => (
          <span key={status} className="inline-flex items-center gap-1 text-card-10 text-mosaic-muted">
            <i className="h-[7px] w-[7px] rounded-full bg-[var(--node-status-color)]" style={getNodeStatusStyle(status)} />
            {NODE_STATUS_LABELS[status]}
          </span>
        ))}
      </div>
    </KpiCard>
  );
};

export const JobsOverviewCard = () => {
  const { data, loading, error } = useApi("/api/jobs/summary");
  const running = data?.kpis?.running || 0;
  const pending = data?.kpis?.pending || 0;
  const total = running + pending;

  return (
    <section className={cx(cardClasses.shell, "relative pb-2.5")}>
      <div className={cardClasses.title}>
        <span className={cardClasses.icon}><MdBusinessCenter /></span>
        <h3 className={cardClasses.titleText}>Jobs Overview</h3>
      </div>
      {loading ? (
        <div className={cardClasses.loading}>Loading</div>
      ) : error ? (
        <div className={cardClasses.empty}>Unavailable</div>
      ) : (
        <div className="grid gap-[9px]">
          <div className="grid justify-items-start gap-0.5">
            <strong className="text-card-28 font-extrabold tracking-normal text-mosaic-primary">{formatNumber(total)}</strong>
            <span className="text-card-12 font-bold uppercase text-mosaic-secondary">Total Jobs</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-[7px]">
            <div className="grid min-h-8 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[7px] rounded-[5px] border border-mosaic-success-bg bg-mosaic-table px-2 py-1.5 text-card-12 font-bold text-mosaic-secondary">
              <span className="h-[9px] w-[9px] rounded-full bg-mosaic-success" />
              <span>Running</span>
              <strong className={cx("text-card-14 font-extrabold", getToneTextClass("green"))}>{formatNumber(running)}</strong>
            </div>
            <div className="grid min-h-8 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[7px] rounded-[5px] border border-mosaic-caution-bg bg-mosaic-table px-2 py-1.5 text-card-12 font-bold text-mosaic-secondary">
              <span className="h-[9px] w-[9px] rounded-full bg-mosaic-caution" />
              <span>Pending</span>
              <strong className={cx("text-card-14 font-extrabold", getToneTextClass("amber"))}>{formatNumber(pending)}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export const SystemLoadCard = () => {
  const { data, loading, error } = useApi("/api/system-load");
  const load = data?.load?.normalized_five_minutes;

  return (
    <KpiCard
      icon={<AiOutlineLineChart />}
      title="System Load (5m)"
      value={Number.isFinite(load) ? load.toFixed(2) : "0.00"}
      detail="Normalized to web server CPU count"
      tone="green"
      loading={loading}
      error={error}
    />
  );
};
