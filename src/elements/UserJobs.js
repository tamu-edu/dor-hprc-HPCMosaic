import React, { useEffect, useState } from "react";
import config from "../../config.yml";
import Spinner from "../framework/Spinner";
import ElementDescriptions from "../framework/ElementDescriptions";
import "tippy.js/dist/tippy.css"; // Default styling for tooltips
import Tippy from "@tippyjs/react";
import { get_base_url } from "../utils/api_config.js"

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

  // Cancel a job
  const cancelJob = (jobId) => {
    setIsCanceling(jobId);
    fetch(`/cancel_job/${jobId}`, { method: "DELETE" })
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
    <div className="p-4 bg-white rounded-lg overflow-auto">
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
              <th className="border border-gray-300 px-4 py-2">State</th>
              <th className="border border-gray-300 px-4 py-2">Nodes</th>
              {/* <th className="border border-gray-300 px-4 py-2">Actions</th> */}
            </tr>
          </thead>
          <tbody className="text-gray-800 text-sm">
            {jobs.map((job) => (
              <tr key={job.job_id} className="border-b border-gray-200">
                <td className="py-3 px-4">{job.job_id}</td>
                <td className={`py-3 px-4 ${job.state === "R" ? "text-green-600" : "text-yellow-600"}`}>
                  {job.state === "R" ? "Running" : "Pending"}
                </td>
                <td className="py-3 px-4">{job.nodes}</td>
                {/* <td className="py-3 px-4"> */}
                  {/* <button
                    onClick={() => cancelJob(job.job_id)}
                    className={`px-3 py-1 rounded ${
                      isCanceling === job.job_id
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                    disabled={isCanceling === job.job_id}
                  >
                    {isCanceling === job.job_id ? "Canceling..." : "Cancel Job"}
                  </button> */}
                {/* </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserJobs;
