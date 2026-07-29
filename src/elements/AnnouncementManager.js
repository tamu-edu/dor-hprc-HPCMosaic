import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MdAdd,
  MdArrowDownward,
  MdArrowUpward,
  MdCampaign,
  MdClose,
  MdDeleteOutline,
  MdEdit,
  MdRefresh,
} from "react-icons/md";
import { get_base_url } from "../utils/api_config.js";

const EMPTY_FORM = {
  title: "",
  message: "",
  severity: "info",
  enabled: true,
  clusters: "",
  starts_at: "",
  ends_at: "",
  link_label: "",
  link_url: "",
};

const toForm = (announcement) => ({
  title: announcement.title || "",
  message: announcement.message || "",
  severity: announcement.severity || "info",
  enabled: announcement.enabled === true,
  clusters: Array.isArray(announcement.clusters)
    ? announcement.clusters.join(", ")
    : "",
  starts_at: announcement.starts_at || "",
  ends_at: announcement.ends_at || "",
  link_label: announcement.link?.label || "",
  link_url: announcement.link?.url || "",
});

const fromForm = (form, id = undefined) => {
  const clusters = form.clusters
    .split(",")
    .map((cluster) => cluster.trim())
    .filter(Boolean);
  const announcement = {
    title: form.title.trim(),
    message: form.message.trim(),
    severity: form.severity,
    enabled: form.enabled,
    clusters,
    starts_at: form.starts_at.trim() || null,
    ends_at: form.ends_at.trim() || null,
  };
  if (id) announcement.id = id;
  const linkLabel = form.link_label.trim();
  const linkUrl = form.link_url.trim();
  announcement.link = linkLabel || linkUrl
    ? { label: linkLabel, url: linkUrl }
    : null;
  return announcement;
};

const parseAnnouncementTime = (value) => {
  if (!value) return null;
  if (/[zZ]|[+-]\d\d:\d\d$/.test(value)) {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? { kind: "instant", value: timestamp } : null;
  }
  const match = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(?:\s+([AP]M))?$/i
  );
  if (!match) return null;
  let hour = Number(match[4]);
  const meridiem = match[6]?.toUpperCase();
  if (meridiem) {
    hour = (hour % 12) + (meridiem === "PM" ? 12 : 0);
  }
  return {
    kind: "central",
    value: Number(`${match[1]}${match[2]}${match[3]}${String(hour).padStart(2, "0")}${match[5]}`),
  };
};

const getStatus = (announcement) => {
  if (!announcement.enabled) return "Disabled";
  const now = Date.now();
  const centralParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
    }).formatToParts(now).map((part) => [part.type, part.value])
  );
  const centralNow = Number(
    `${centralParts.year}${centralParts.month}${centralParts.day}${centralParts.hour}${centralParts.minute}`
  );
  const startsAt = parseAnnouncementTime(announcement.starts_at);
  const endsAt = parseAnnouncementTime(announcement.ends_at);
  const isAfterNow = (parsed) => parsed && (
    parsed.kind === "instant" ? parsed.value > now : parsed.value > centralNow
  );
  const isAtOrBeforeNow = (parsed) => parsed && (
    parsed.kind === "instant" ? parsed.value <= now : parsed.value <= centralNow
  );
  if (isAfterNow(startsAt)) return "Scheduled";
  if (isAtOrBeforeNow(endsAt)) return "Expired";
  return "Active";
};

const statusClasses = {
  Active: "bg-green-100 text-green-800",
  Scheduled: "bg-blue-100 text-blue-800",
  Expired: "bg-gray-200 text-gray-700",
  Disabled: "bg-yellow-100 text-yellow-800",
};

const AnnouncementManager = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [revision, setRevision] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const managementUrl = `${get_base_url()}/api/admin/announcements`;

  const applyResponse = useCallback((data) => {
    setAnnouncements(Array.isArray(data?.announcements) ? data.announcements : []);
    setRevision(typeof data?.revision === "string" ? data.revision : "");
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(managementUrl);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to load announcements");
      applyResponse(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [applyResponse, managementUrl]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const requestMutation = useCallback(async (url, method, body, successMessage) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409) {
        applyResponse(data);
        throw new Error("Another administrator changed the announcements. The latest version has been loaded; review your change and try again.");
      }
      if (!response.ok) throw new Error(data.error || "Unable to save announcements");
      applyResponse(data);
      setNotice(successMessage);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [applyResponse]);

  const beginCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError("");
  };

  const beginEdit = (announcement) => {
    setEditingId(announcement.id);
    setForm(toForm(announcement));
    setShowForm(true);
    setError("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const formError = useMemo(() => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.message.trim()) return "Message is required.";
    if ((form.link_label.trim() && !form.link_url.trim()) ||
        (!form.link_label.trim() && form.link_url.trim())) {
      return "Link label and URL must be provided together.";
    }
    return "";
  }, [form]);

  const submitForm = async (event) => {
    event.preventDefault();
    if (formError) {
      setError(formError);
      return;
    }
    const announcement = fromForm(form, editingId);
    const succeeded = await requestMutation(
      editingId ? `${managementUrl}/${encodeURIComponent(editingId)}` : managementUrl,
      editingId ? "PUT" : "POST",
      { announcement, revision },
      editingId ? "Announcement updated." : "Announcement created."
    );
    if (succeeded) closeForm();
  };

  const toggleEnabled = (announcement) => requestMutation(
    `${managementUrl}/${encodeURIComponent(announcement.id)}`,
    "PUT",
    {
      announcement: { ...announcement, enabled: !announcement.enabled },
      revision,
    },
    announcement.enabled ? "Announcement disabled." : "Announcement enabled."
  );

  const removeAnnouncement = async (announcement) => {
    if (!window.confirm(`Permanently delete “${announcement.title}”? This cannot be undone.`)) {
      return;
    }
    await requestMutation(
      `${managementUrl}/${encodeURIComponent(announcement.id)}`,
      "DELETE",
      { revision },
      "Announcement deleted."
    );
  };

  const moveAnnouncement = async (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= announcements.length) return;
    const reordered = [...announcements];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    await requestMutation(
      `${managementUrl}/order`,
      "PUT",
      { ids: reordered.map((announcement) => announcement.id), revision },
      "Announcement priority updated."
    );
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="box-border flex h-full min-h-0 flex-col bg-mosaic-surface p-4 text-mosaic-primary">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MdCampaign className="text-2xl text-mosaic-icon" />
          <div>
            <h3 className="text-card-16 font-bold">Announcement Manager</h3>
            <p className="text-card-11 text-mosaic-muted">Highest priority appears first.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="non-draggable rounded-md border border-mosaic-border p-2 hover:bg-mosaic-table" onClick={loadAnnouncements} title="Refresh" type="button">
            <MdRefresh />
          </button>
          <button className="non-draggable flex items-center gap-1 rounded-md bg-mosaic-primary px-3 py-2 text-card-12 font-semibold text-white disabled:opacity-50" disabled={saving} onClick={beginCreate} type="button">
            <MdAdd /> New
          </button>
        </div>
      </div>

      {error && <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-card-11 text-red-800" role="alert">{error}</div>}
      {notice && <div className="mb-3 rounded-md border border-green-300 bg-green-50 p-2 text-card-11 text-green-800" role="status">{notice}</div>}

      {showForm && (
        <form className="non-draggable mb-3 grid shrink-0 grid-cols-1 gap-2 rounded-md border border-mosaic-border bg-mosaic-table p-3 md:grid-cols-2" onSubmit={submitForm}>
          <div className="md:col-span-2 flex items-center justify-between">
            <h4 className="font-bold">{editingId ? "Edit announcement" : "New announcement"}</h4>
            <button aria-label="Close form" onClick={closeForm} type="button"><MdClose /></button>
          </div>
          <label className="text-card-11 font-semibold">Title
            <input className="mt-1 w-full rounded border border-mosaic-border bg-mosaic-surface p-2 font-normal" onChange={(event) => updateForm("title", event.target.value)} value={form.title} />
          </label>
          <label className="text-card-11 font-semibold">Severity
            <select className="mt-1 w-full rounded border border-mosaic-border bg-mosaic-surface p-2 font-normal" onChange={(event) => updateForm("severity", event.target.value)} value={form.severity}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="md:col-span-2 text-card-11 font-semibold">Message
            <textarea className="mt-1 min-h-[72px] w-full rounded border border-mosaic-border bg-mosaic-surface p-2 font-normal" onChange={(event) => updateForm("message", event.target.value)} value={form.message} />
          </label>
          <label className="text-card-11 font-semibold">Starts at (Central time)
            <input className="mt-1 w-full rounded border border-mosaic-border bg-mosaic-surface p-2 font-normal" onChange={(event) => updateForm("starts_at", event.target.value)} placeholder="2026-07-25 8:00 AM" value={form.starts_at} />
          </label>
          <label className="text-card-11 font-semibold">Ends at (Central time)
            <input className="mt-1 w-full rounded border border-mosaic-border bg-mosaic-surface p-2 font-normal" onChange={(event) => updateForm("ends_at", event.target.value)} placeholder="Optional" value={form.ends_at} />
          </label>
          <label className="md:col-span-2 text-card-11 font-semibold">Clusters
            <input className="mt-1 w-full rounded border border-mosaic-border bg-mosaic-surface p-2 font-normal" onChange={(event) => updateForm("clusters", event.target.value)} placeholder="Comma-separated; blank means all clusters" value={form.clusters} />
          </label>
          <label className="text-card-11 font-semibold">Link label
            <input className="mt-1 w-full rounded border border-mosaic-border bg-mosaic-surface p-2 font-normal" onChange={(event) => updateForm("link_label", event.target.value)} value={form.link_label} />
          </label>
          <label className="text-card-11 font-semibold">Link URL
            <input className="mt-1 w-full rounded border border-mosaic-border bg-mosaic-surface p-2 font-normal" onChange={(event) => updateForm("link_url", event.target.value)} type="url" value={form.link_url} />
          </label>
          <label className="flex items-center gap-2 text-card-11 font-semibold">
            <input checked={form.enabled} onChange={(event) => updateForm("enabled", event.target.checked)} type="checkbox" />
            Enabled
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button className="rounded border border-mosaic-border px-3 py-2 text-card-11 font-semibold" onClick={closeForm} type="button">Cancel</button>
            <button className="rounded bg-mosaic-primary px-3 py-2 text-card-11 font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="p-4 text-center text-mosaic-muted">Loading announcements…</div>
        ) : announcements.length === 0 ? (
          <div className="rounded-md border border-dashed border-mosaic-border p-6 text-center text-mosaic-muted">No announcements have been created.</div>
        ) : announcements.map((announcement, index) => {
          const status = getStatus(announcement);
          return (
            <article className="mb-2 rounded-md border border-mosaic-border bg-mosaic-surface p-3" key={announcement.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold">{announcement.title}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-card-10 font-semibold ${statusClasses[status]}`}>{status}</span>
                    <span className="rounded-full bg-mosaic-table px-2 py-0.5 text-card-10 uppercase">{announcement.severity}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-card-11 text-mosaic-secondary">{announcement.message}</p>
                  <p className="mt-1 text-card-10 text-mosaic-muted">
                    {announcement.clusters?.length ? `Clusters: ${announcement.clusters.join(", ")}` : "All clusters"}
                    {announcement.starts_at ? ` · Starts ${announcement.starts_at}` : ""}
                    {announcement.ends_at ? ` · Ends ${announcement.ends_at}` : ""}
                  </p>
                </div>
                <div className="non-draggable flex shrink-0 flex-wrap justify-end gap-1">
                  <button aria-label="Move up" className="rounded border border-mosaic-border p-1.5 disabled:opacity-30" disabled={saving || index === 0} onClick={() => moveAnnouncement(index, -1)} title="Increase priority" type="button"><MdArrowUpward /></button>
                  <button aria-label="Move down" className="rounded border border-mosaic-border p-1.5 disabled:opacity-30" disabled={saving || index === announcements.length - 1} onClick={() => moveAnnouncement(index, 1)} title="Decrease priority" type="button"><MdArrowDownward /></button>
                  <button className="rounded border border-mosaic-border px-2 py-1 text-card-10 font-semibold disabled:opacity-50" disabled={saving} onClick={() => toggleEnabled(announcement)} type="button">{announcement.enabled ? "Disable" : "Enable"}</button>
                  <button aria-label="Edit" className="rounded border border-mosaic-border p-1.5" disabled={saving} onClick={() => beginEdit(announcement)} type="button"><MdEdit /></button>
                  <button aria-label="Delete" className="rounded border border-red-300 p-1.5 text-red-700" disabled={saving} onClick={() => removeAnnouncement(announcement)} type="button"><MdDeleteOutline /></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AnnouncementManager;
