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
    <div className="p-4 bg-white rounded-lg overflow-auto w-full h-full">
      {/* Title with Tooltip */}
      <div className="flex items-center">
        <h2 className="text-2xl font-semibold mb-4">
          <Tippy content={ElementDescriptions["User Jobs"]}>
            <span className="cursor-help">Your Jobs ⓘ</span>
          </Tippy>
        </h2>
      </div>
      {jobs.length === 0 ? (
        <p className="text-gray-500">No active jobs.</p>
      ) : (
        <table className="table-auto w-full border-collapse border border-gray-300 rounded-lg shadow-sm">
          <thead>
            <tr className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
              <th className="border border-gray-300 px-4 py-2">Job ID</th>
              <th className="border border-gray-300 px-4 py-2">Job Name</th>
              <th className="border border-gray-300 px-4 py-2">Location</th>
              <th className="border border-gray-300 px-4 py-2">State</th>
              <th className="border border-gray-300 px-4 py-2">CPUs</th>
              <th className="border border-gray-300 px-4 py-2">Nodes</th>
              <th className="border border-gray-300 px-4 py-2">Time Elapsed</th>
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-800 text-sm">
            {jobs.map((job) => (
              <tr key={job.job_id} className="border-b border-gray-200">
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
                  {job.state === "R" ? "Running" : "Pending"}
                </td>
                <td className="py-3 px-4">
                    {job.cpus}
                </td>
                <td className="py-3 px-4">
                    {job.nodes}
                </td>
                <td className="py-3 px-4">
                    <div className="flex justify-between text-base font-medium text-gray-700 mb-1">
                      <span> ({formatTime(job.time_elapsed)}) / ({formatTime(job.time_requested)}) </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
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
