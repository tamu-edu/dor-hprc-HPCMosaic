import React, { useEffect, useState } from "react";
import config from "../../config.yml";
import Spinner from "../framework/Spinner";
import ElementDescriptions from "../framework/ElementDescriptions";
import "tippy.js/dist/tippy.css"; // Default styling for tooltips
import Tippy from "@tippyjs/react";
import { get_base_url } from "../utils/api_config.js"
import { generate_file_explorer_path_for_jobs } from '../utils/generate_filepath';

const UserJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCanceling, setIsCanceling] = useState(null);
  const baseUrl = get_base_url();
  // Fetch jobs for the current user
  useEffect(() => {
    fetch(`${baseUrl}/api/jobs`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
	setJobs(data.jobs || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  
  // Auto-increment elapsed time for running jobs every second
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(prevJobs =>
        prevJobs.map(job => {
          if (job.state === "R") { // only increment running jobs
            return {
              ...job,
              time_elapsed: incrementTime(job.time_elapsed)
            };
          }
          return job;
        })
      );
    }, 1000); // every second

    return () => clearInterval(interval);
  }, []);
  
  // Increment SLURM-style time string by 1 second
  const incrementTime = (timeStr) => {
    if (!timeStr) return "0:00:01";

    let [daysPart, timePart] = timeStr.includes("-") ? timeStr.split("-") : [null, timeStr];
    let [h, m, s] = timePart.split(":").map(Number);

    s += 1;
    if (s >= 60) { s = 0; m += 1; }
    if (m >= 60) { m = 0; h += 1; }
    if (daysPart && h >= 24) { h = 0; daysPart = parseInt(daysPart) + 1; }

    const newTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return daysPart ? `${daysPart}-${newTime}` : newTime;
  };
  const getPendingReasonLabel = (reason) => {
	switch (reason) {
        case "Resources":
            return "Waiting for available resources";
	case "Priority":
	    return "Waiting for higher priority jobs to finish";
	case "Dependency":
	    return "Waiting for another job to finish";
	case "QQSMaxJobsPerUserLimit":
	    return "Blocked by queue policy limits";
	default:
	    return "Scheduler related reason";
	}
  };

  // Format SLURM time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return "N/A";
    const [dayPart, timePart] = timeStr.includes("-") ? timeStr.split("-") : [null, timeStr];
    const [hours, minutes, seconds] = timePart.split(":").map(Number);
    const days = dayPart ? parseInt(dayPart, 10) : Math.floor(hours / 24);
    const remainingHours = dayPart ? hours : hours % 24;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (remainingHours > 0 || parts.length > 0) parts.push(`${remainingHours}h`);
    if (minutes > 0 || parts.length > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(" ");
  };
  
  // Convert elapsed/requested into percentage
  const getElapsedPercentage = (elapsed, requested) => {
    const toSeconds = (timeStr) => {
        if (!timeStr) return 0;
        let days = 0;
        let timePart = timeStr;
        
        if (timeStr.includes("-")) {
            const parts = timeStr.split("-");
            days = parseInt(parts[0], 10);
            timePart = parts[1];
        }
        
        const [h, m , s] = timePart.split(":").map(Number)
        return days * 86400 + h * 3600 + m * 60 + s;
    };
    
    const elapsedSec = toSeconds(elapsed);
    const requestedSec = toSeconds(requested);
    if (requestedSec === 0) return 0;
    return Math.min(100, ((elapsedSec / requestedSec) * 100).toFixed(2));
  };
  
  const getColor = (percentage) => {
    if (percentage < 50) return "text-green-600";
    if (percentage < 75) return "text-yellow-500";
    return "text-red-600";
  };

  // Cancel a job
  const cancelJob = (jobId) => {
    setIsCanceling(jobId);
    fetch(`${baseUrl}/api/cancel_job/${jobId}`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setJobs((prev) => prev.filter((job) => job.job_id !== jobId)); // Remove canceled job
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsCanceling(null));
  };

  if (loading) return <Spinner />;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-4 theme-surface rounded-lg overflow-auto w-full h-full">
        <style>
          {`
            .tippy-box[data-theme~='job-tooltip'] {
              background-color: transparent !important;
              box-shadow: none !important;
              border: none !important;
            }
        
            .tippy-box[data-theme~='job-tooltip'] .tippy-content {
              padding: 0 !important;
            }
          `}
        </style>
      {/* Title with Tooltip */}
      <div className="flex items-center">
        <h2 className="text-2xl font-semibold mb-4 theme-text-primary">
          <Tippy content={ElementDescriptions["User Jobs"]}>
            <span className="cursor-help">Your Jobs ⓘ</span>
          </Tippy>
        </h2>
      </div>
      {jobs.length === 0 ? (
        <p className="theme-text-secondary">No active jobs.</p>
      ) : (
        <table className="table-auto w-full border-collapse border theme-border rounded-lg shadow-sm">
          <thead>
            <tr className="theme-table-header theme-text-secondary uppercase text-sm leading-normal">
              <th className="border theme-border px-4 py-2">Job ID</th>
              <th className="border theme-border px-4 py-2">Job Name</th>
              <th className="border theme-border px-4 py-2">Location</th>
              <th className="border theme-border px-4 py-2">State</th>
              <th className="border theme-border px-4 py-2">CPUs</th>
              <th className="border theme-border px-4 py-2">Nodes</th>
              <th className="border theme-border px-4 py-2">Time Elapsed</th>
              <th className="border theme-border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm theme-text-primary">
            {jobs.map((job) => (
              <tr key={job.job_id} className="border-b theme-border theme-hover-surface transition-colors">
                <td className="py-3 px-4">
                    {job.job_id}
                </td>
                <td className="py-3 px-4">
                    {job.job_name}
                </td>
                <td className="py-3 px-4">
                    {generate_file_explorer_path_for_jobs(job)}
                </td>
		        <td className={`py-3 px-4 ${job.state === "R" ? "text-green-600" : "text-yellow-600"}`}>
                  {job.state === "R" ? (
                    "Running"
                  ) : (
                    <Tippy
                      theme="job-tooltip"
                      interactive={true}
                      trigger="click"
                      placement="bottom"
                      appendTo={document.body}
                      zIndex={9999}
                      popperOptions={{ strategy: 'fixed' }}
                      content={
                        <div className="w-80 rounded-lg border border-black bg-white text-gray-800">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                            <h3 className="text-lg font-semibold">Why is this job pending?</h3>
                          </div>
                
                          <div className="px-4 py-3">
                            <p className="text-base font-medium">
                              {getPendingReasonLabel(job.reason)}
                            </p>
                          </div>
                
                          <div className="border-t border-gray-200 px-4 py-3">
                            <p className="text-sm font-semibold text-gray-600 mb-2">
                              Scheduler details:
                            </p>
                            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                              <li>Reason: {job.reason || "Unknown"}</li>
                              <li>Requested: {job.cpus} CPU{Number(job.cpus) !== 1 ? "s" : ""},{" "}{job.gpus} GPU{Number(job.gpus) !== 1 ? "s" : ""},{" "}{job.nodes} node{Number(job.nodes) !== 1 ? "s" : ""}</li>
                              <li>Partition is busy</li>
                            </ul>
                          </div>
                        </div>
                      }
                    >
                      <span className="cursor-pointer inline-flex items-center gap-1 underline decoration-dotted">
                        Pending <span className="text-xs">ⓘ</span>
                      </span>
                    </Tippy>
                  )}
                </td>
                <td className="py-3 px-4">
                    {job.cpus}
                </td>
                <td className="py-3 px-4">
                    {job.nodes}
                </td>
                <td className="py-3 px-4">
                    <div className="flex justify-between text-base font-medium theme-text-secondary mb-1">
                      <span> ({formatTime(job.time_elapsed)}) / ({formatTime(job.time_requested)}) </span>
                    </div>
                    <div className="w-full theme-progress-track rounded-full h-2.5 mt-2 overflow-hidden">
                        {(() => {
                            const timePercentage = getElapsedPercentage(job.time_elapsed, job.time_requested);
                            return (
                                <div
                                    className={`h-2.5 rounded-full ${
                                        timePercentage >=75
                                        ? "bg-red-600"
                                        : timePercentage >= 50
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                    }`}
                                    style={{ width: `${timePercentage}%` }}
                                ></div>
                            );
                        })()}
                    </div>
                    <p className={`${getColor(getElapsedPercentage(job.time_elapsed, job.time_requested))} text-sm mt-1`}>
                        {getElapsedPercentage(job.time_elapsed, job.time_requested)}%
                    </p>
                </td>
                <td className="py-3 px-4"> 
                    {/* <div> */}
                      <button
                        onClick={() => cancelJob(job.job_id)}
                        className={`px-3 py-1 rounded ${
                          isCanceling === job.job_id
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-red-500 hover:bg-red-600 text-white"
                        }`}
                        disabled={isCanceling === job.job_id}
                      >
                        {isCanceling === job.job_id ? "Canceling..." : "Cancel Job"}
                      </button>
                    {/* </div> */}
                    {/* <div> */}
                      {/* <JobExtendButton /> */}
                    {/* </div> */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  
  );
};

export default UserJobs;
