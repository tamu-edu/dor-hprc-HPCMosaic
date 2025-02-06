import React, { useEffect, useState } from "react";
import config from "../../config.yml";

const ProjectInfo = () => {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [jobHistory, setJobHistory] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const baseUrl = config.production.dashboard_url;

  const [showPending, setShowPending] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const sortData = (field) => {
    setSortField(field);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const filteredData = [...(showPending ? pendingJobs : jobHistory)]
    .filter((job) => String(job.job_id).includes(searchQuery))
    .sort((a, b) => {
      if (!sortField) return 0;
      return sortOrder === "asc"
        ? String(a[sortField]).localeCompare(String(b[sortField]))
        : String(b[sortField]).localeCompare(String(a[sortField]));
    });

  useEffect(() => {
    fetch(`${baseUrl}/api/projectinfo`)
      .then((response) => response.json())
      .then((data) => {
        console.log("API Response:", data);
        setProjects(data.projects?.projects || []);
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

    fetch(`${baseUrl}/api/projectinfo?account=${account}&job_history=true`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Job History for", account, ":", data);
        setJobHistory(
          data.job_history?.job_history?.map((job) => ({
            job_id: job.job_id || "N/A",
            state: job.state?.trim() || "Completed",
            cores: job.total_slots || "N/A",
            walltime_hours: job.walltime ? (parseFloat(job.walltime) / 60).toFixed(2) : "N/A",
          })) || []
        );
      })
      .catch((err) => console.error("Error fetching job history:", err));

    fetch(`${baseUrl}/api/projectinfo?account=${account}&pending_jobs=true`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Raw API Response for Pending Jobs:", data);

        if (data.pending_jobs && Array.isArray(data.pending_jobs.pending_jobs)) {
          const formattedPending = data.pending_jobs.pending_jobs.map((job) => ({
            job_id: job["Job Id"]?.trim() || "N/A",
            state: job["State"]?.trim() || "N/A",
            cores: job["#Cores"]?.trim() || "N/A",
            walltime_hours: job["Walltime(H)"]?.trim() || "N/A",
            pending_sus: job["Pending SUs"]?.trim() || "N/A",
          }));

          console.log("Formatted Pending Jobs:", formattedPending);
          setPendingJobs(formattedPending);
        } else {
          console.warn("No pending jobs found.");
          setPendingJobs([]);
        }
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
          <div className="flex space-x-4 mb-4">
            <button className={`px-4 py-2 rounded ${showPending ? "bg-blue-600 text-white" : "bg-gray-300"}`} onClick={() => setShowPending(true)}>
              View Pending Jobs
            </button>
            <button className={`px-4 py-2 rounded ${!showPending ? "bg-blue-600 text-white" : "bg-gray-300"}`} onClick={() => setShowPending(false)}>
              View Job History
            </button>
          </div>

          <input type="text" placeholder="Search by Job ID..." className="border px-2 py-1 mb-4 w-full" onChange={(e) => setSearchQuery(e.target.value)} />

          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th onClick={() => sortData("job_id")}>Job ID ⬍</th>
                <th onClick={() => sortData("state")}>State ⬍</th>
                <th onClick={() => sortData("cores")}>Cores ⬍</th>
                <th onClick={() => sortData("walltime_hours")}>Walltime (hrs) ⬍</th>
                {showPending && <th onClick={() => sortData("pending_sus")}>Pending SUs ⬍</th>}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((job, index) => (
                <tr key={index}>
                  <td>{job.job_id}</td>
                  <td>{job.state}</td>
                  <td>{job.cores}</td>
                  <td>{job.walltime_hours}</td>
                  {showPending && <td>{job.pending_sus}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProjectInfo;
