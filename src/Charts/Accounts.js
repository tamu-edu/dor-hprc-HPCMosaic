import React, { useEffect, useState } from "react";
import config from "../../config.yml";

const ProjectInfo = () => {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [jobHistory, setJobHistory] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const baseUrl = config.production.dashboard_url;

  useEffect(() => {
    fetch(`${baseUrl}/api/projectinfo`)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || "Failed to fetch project data");
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("Project Data:", data);
        setProjects(data.projects || []);
      })
      .catch((err) => {
        console.error("Error fetching projects:", err);
        setError(err.message);
      });
  }, []);

  const fetchAdditionalInfo = (account) => {
    setSelectedAccount(account);
    setJobHistory([]);
    setPendingJobs([]);

    // Fetch job history
    fetch(`${baseUrl}/api/projectinfo?account=${account}&job_history=true`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Job History for", account, ":", data);
        setJobHistory(data.job_history || []);
      })
      .catch((err) => console.error("Error fetching job history:", err));

    // Fetch pending jobs
    fetch(`${baseUrl}/api/projectinfo?account=${account}&pending_jobs=true`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Pending Jobs for", account, ":", data);
        setPendingJobs(data.pending_jobs || []);
      })
      .catch((err) => console.error("Error fetching pending jobs:", err));
  };

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="p-4 bg-white rounded-lg overflow-auto w-full h-full">
      <h2 className="text-2xl font-semibold mb-4">Project Information</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-4 py-2">Account</th>
            <th className="border border-gray-300 px-4 py-2">FY</th>
            <th className="border border-gray-300 px-4 py-2">Default</th>
            <th className="border border-gray-300 px-4 py-2">Allocation</th>
            <th className="border border-gray-300 px-4 py-2">Used & Pending SUs</th>
            <th className="border border-gray-300 px-4 py-2">Balance</th>
            <th className="border border-gray-300 px-4 py-2">PI</th>
            <th className="border border-gray-300 px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => (
            <tr key={index}>
              <td className="border border-gray-300 px-4 py-2">{project.account}</td>
              <td className="border border-gray-300 px-4 py-2">{project.fy}</td>
              <td className="border border-gray-300 px-4 py-2">{project.default}</td>
              <td className="border border-gray-300 px-4 py-2">{project.allocation}</td>
              <td className="border border-gray-300 px-4 py-2">{project.used_pending_sus}</td>
              <td className="border border-gray-300 px-4 py-2">{project.balance}</td>
              <td className="border border-gray-300 px-4 py-2">{project.pi}</td>
              <td className="border border-gray-300 px-4 py-2">
                <button
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                  onClick={() => fetchAdditionalInfo(project.account)}
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedAccount && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold">Details for Account {selectedAccount}</h3>
          <div className="mt-4">
            <h4 className="text-lg font-semibold">Job History</h4>
            {jobHistory.length ? (
              <ul className="list-disc pl-6">
                {jobHistory.map((job, index) => (
                  <li key={index}>{JSON.stringify(job)}</li>
                ))}
              </ul>
            ) : (
              <p>No job history available.</p>
            )}
          </div>

          <div className="mt-4">
            <h4 className="text-lg font-semibold">Pending Jobs</h4>
            {pendingJobs.length ? (
              <ul className="list-disc pl-6">
                {pendingJobs.map((job, index) => (
                  <li key={index}>{JSON.stringify(job)}</li>
                ))}
              </ul>
            ) : (
              <p>No pending jobs available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectInfo;