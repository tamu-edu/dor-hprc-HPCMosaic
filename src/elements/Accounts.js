import React, { useEffect, useState } from "react";
import config from "../../config.yml";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css"; // Default styling for tooltips
import ElementDescriptions from "../framework/ElementDescriptions";
import Spinner from "../framework/Spinner";

const ProjectInfo = () => {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const baseUrl = config.production.dashboard_url;

  // Fetch project info on component mount
  const fetchProjects = () => {
    fetch(`${baseUrl}/api/projectinfo`)
      .then((response) => response.json())
      .then((data) => {
        console.log("API Response:", data);
        setProjects(data.projects?.projects || []);
      })
      .catch((err) => {
        console.error("Error fetching projects:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Function to set default account
  const setDefaultAccount = (account) => {
    fetch(`${baseUrl}/api/set_default_account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_no: account }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message) {
          setMessage({ type: "success", text: data.message });
          fetchProjects(); // Refresh projects to update default account
        } else if (data.error) {
          setMessage({ type: "error", text: data.error });
        }
      })
      .catch((err) => {
        console.error("Error setting default account:", err);
        setMessage({ type: "error", text: "Failed to set default account." });
      });

    setTimeout(() => setMessage(null), 3000);
  };

  // Function to determine color for usage percentage
  const getUsageColor = (usagePercentage) => {
    if (usagePercentage < 50) return "text-green-600";
    if (usagePercentage < 75) return "text-yellow-500";
    return "text-red-600";
  };

  // Show error message if there is an error
  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  // Show spinner while loading
  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="p-4 bg-white rounded-lg overflow-auto w-full h-full">
      {/* Title with Tooltip */}
      <div className="flex items-center">
        <h2 className="text-2xl font-semibold mb-4">
          <Tippy content={ElementDescriptions.Accounts}>
            <span className="cursor-help">Project Information ⓘ</span>
          </Tippy>
        </h2>
      </div>

      {/* Display success/error messages (toast) */}
      {message && (
        <div
          className={`fixed top-5 right-5 p-3 text-sm font-semibold rounded shadow-md ${
            message.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {message.text}
        </div>
      )}

      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-4 py-2">
              <Tippy content="Your allocated project account for computing resources.">
                <span className="cursor-help">Account ⓘ</span>
              </Tippy>
            </th>
            <th className="border border-gray-300 px-4 py-2">
              <Tippy content="The Fiscal Year in which the project is active.">
                <span className="cursor-help">FY ⓘ</span>
              </Tippy>
            </th>
            <th className="border border-gray-300 px-4 py-2">
              <Tippy content="Indicates if this account is your default account.">
                <span className="cursor-help">Default ⓘ</span>
              </Tippy>
            </th>
            <th className="border border-gray-300 px-4 py-2">
              <Tippy content="Used vs. allocated service units (SUs), with percentage usage.">
                <span className="cursor-help">Used / Allocated (%) ⓘ</span>
              </Tippy>
            </th>
            <th className="border border-gray-300 px-4 py-2">
              <Tippy content="Remaining balance of computing resources.">
                <span className="cursor-help">Balance ⓘ</span>
              </Tippy>
            </th>
            <th className="border border-gray-300 px-4 py-2">
              <Tippy content="Principal Investigator responsible for the project.">
                <span className="cursor-help">PI ⓘ</span>
              </Tippy>
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => {
            const used = parseFloat(project.used_pending_sus) || 0;
            const allocated = parseFloat(project.allocation) || 0;
            const usagePercentage = allocated > 0 ? ((used / allocated) * 100).toFixed(2) : 0;
            const usageColor = getUsageColor(usagePercentage);

            return (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">{project.account}</td>
                <td className="border border-gray-300 px-4 py-2">{project.fy}</td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {project.default === "Y" ? (
                    <span className="text-green-600 font-semibold">✅ Y</span>
                  ) : (
                    <button
                      className="bg-green-500 text-white px-2 py-1 rounded"
                      onClick={() => setDefaultAccount(project.account)}
                    >
                      Set as Default
                    </button>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <Tippy content={`Used: ${used} SUs / Allocated: ${allocated} SUs`}>
                    <span className="cursor-help">
                      {used.toFixed(2)} / {allocated.toFixed(2)}{" "}
                      <span className={`ml-2 ${usageColor}`}>({usagePercentage}%)</span>
                    </span>
                  </Tippy>
                </td>
                <td className="border border-gray-300 px-4 py-2">{project.balance}</td>
                <td className="border border-gray-300 px-4 py-2">{project.pi}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectInfo;
