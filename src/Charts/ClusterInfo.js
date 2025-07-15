import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import config from "../../config.yml";
import Spinner from "../Components/Spinner";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css"; // Import Tippy styles
import ElementDescriptions from "../Components/ElementDescriptions";

const ClusterInfo = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [view, setView] = useState("chart");
  const [loading, setLoading] = useState(true);
  const baseUrl = config.production.dashboard_url;

  // Custom Tooltip Component
  const CustomTooltip = ({ content }) => (
    <div className="bg-gray-800 text-white text-sm p-2 rounded-md shadow-lg z-50">
      {content}
    </div>
  );

  useEffect(() => {
    fetch(`${baseUrl}/api/sinfo`)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || "Unknown error occurred");
          });
        }
        return response.json();
      })
      .then((data) => setData(data))
      .catch((error) =>
        setError(`Error fetching cluster data: ${error.message}`)
      )
      .finally(() => setLoading(false));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (loading) return <Spinner />;

  const calculatePercentage = (used, total) =>
    total > 0 ? ((used / total) * 100).toFixed(2) : 0;

  const getColor = (percentage) => {
    if (percentage < 50) return "text-green-600";
    if (percentage < 75) return "text-yellow-500";
    return "text-red-600";
  };

  return (
    <div className="p-4 bg-white w-full h-full flex flex-col">
      {/* Title with Tooltip */}
      <div className="flex items-center">
        <h2 className="text-2xl font-semibold mb-4">
          <Tippy content={ElementDescriptions["Node Utilization"]}>
            <span className="cursor-help">Queue Availability ⓘ</span>
          </Tippy>
        </h2>
      </div>

      <div className="mb-4">
        <button
          className={`px-4 py-2 mr-2 rounded ${
            view === "table" ? "bg-blue-500 text-white" : "bg-gray-300"
          }`}
          onClick={() => setView("table")}
        >
          Table View
        </button>
        <button
          className={`px-4 py-2 rounded ${
            view === "chart" ? "bg-blue-500 text-white" : "bg-gray-300"
          }`}
          onClick={() => setView("chart")}
        >
          Chart View
        </button>
      </div>

      {view === "chart" ? (
        <div className="w-full h-full overflow-auto flex-grow">
          <h3 className="text-xl font-semibold mb-4">Core & Node Utilization</h3>
          <Bar
            data={{
              labels: data.map((queue) => queue.queue),
              datasets: [
                {
                  label: "Used Cores (%)",
                  data: data.map((queue) =>
                    calculatePercentage(
                      parseInt(queue.CPU_total, 10) - parseInt(queue.CPU_avail, 10),
                      parseInt(queue.CPU_total, 10)
                    )
                  ),
                  backgroundColor: "#EF4444",
                  barThickness: 10,
                },
                {
                  label: "Available Cores (%)",
                  data: data.map((queue) =>
                    calculatePercentage(
                      parseInt(queue.CPU_avail, 10),
                      parseInt(queue.CPU_total, 10)
                    )
                  ),
                  backgroundColor: "#FCA5A5",
                  barThickness: 10,
                },
                {
                  label: "Used Nodes (%)",
                  data: data.map((queue) =>
                    calculatePercentage(
                      parseInt(queue.nodes_total, 10) - parseInt(queue.nodes_avail, 10),
                      parseInt(queue.nodes_total, 10)
                    )
                  ),
                  backgroundColor: "#4F46E5",
                  barThickness: 10,
                },
                {
                  label: "Available Nodes (%)",
                  data: data.map((queue) =>
                    calculatePercentage(
                      parseInt(queue.nodes_avail, 10),
                      parseInt(queue.nodes_total, 10)
                    )
                  ),
                  backgroundColor: "#E0E7FF",
                  barThickness: 10,
                },
              ],
            }}
            options={{
              indexAxis: "y",
              responsive: true,
              plugins: {
                legend: { display: true, position: "top" },
              },
              scales: {
                x: {
                  stacked: true,
                  ticks: {
                    callback: (value) => `${value}%`,
                  },
                },
                y: { stacked: true
		},
              },
            }}
          />
        </div>
      ) : (
        <div className="overflow-auto w-full h-full flex-grow">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2">
                  <Tippy content="HPC queues define groups of nodes with specific job scheduling policies.">
                    <span className="cursor-help">Queue ⓘ</span>
                  </Tippy>
                </th>
                <th className="border border-gray-300 px-4 py-2">
                  <Tippy content="CPU cores available vs. used in this queue.">
                    <span className="cursor-help">Core Usage ⓘ</span>
                  </Tippy>
	        </th>
	        <th className="border border-gray-300 px-4 py-2">
                  <Tippy content="Nodes available vs. used in this queue.">
                    <span className="cursor-help">Node Usage ⓘ</span>
                  </Tippy>
                </th>
                <th className="border border-gray-300 px-4 py-2">
                  <Tippy content="Range of CPU cores or nodes a job can request in this queue. Example: '1-32' means jobs can request between 1 and 32 cores.">
                    <span className="cursor-help">Job Size ⓘ</span>
                  </Tippy>
                </th>
                <th className="border border-gray-300 px-4 py-2">
                  <Tippy content="The maximum time a job can run in this queue.">
                    <span className="cursor-help">Time Limit ⓘ</span>
                  </Tippy>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((queue, index) => {
                const cpuUsed =
                  parseInt(queue.CPU_total, 10) -
                  parseInt(queue.CPU_avail, 10);
                const cpuTotal = parseInt(queue.CPU_total, 10);
                const cpuPercentage = calculatePercentage(cpuUsed, cpuTotal);

                const nodesUsed =
                  parseInt(queue.nodes_total, 10) -
                  parseInt(queue.nodes_avail, 10);
                const nodesTotal = parseInt(queue.nodes_total, 10);
                const nodesPercentage = calculatePercentage(
                  nodesUsed,
                  nodesTotal
                );

                return (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">
                      {queue.queue}
                    </td>
	           
		    <td className="border border-gray-300 px-4 py-4">
		      {cpuUsed}/{cpuTotal}{" "}	
                      <Tippy content={<CustomTooltip content={`Used: ${cpuUsed} / Total: ${cpuTotal}`} />} placement="top">
                        <div className="gap-x-4 items-center cursor-help">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div
                              className={`h-2.5 rounded-full ${cpuPercentage >= 75 ? 'bg-red-600' : cpuPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(100, cpuPercentage)}%` }}
                            ></div>
                          </div>
                          <p className={`${getColor(cpuPercentage)} text-sm mt-1`}>{cpuPercentage}%</p>
                        </div>
                      </Tippy>
                    </td>

	            <td className="border border-gray-300 px-4 py-4">
		      {nodesUsed}/{nodesTotal}{" "}
                      <Tippy content={<CustomTooltip content={`Used: ${nodesUsed} / Total: ${nodesTotal}`} />} placement="top">
                        <div className="gap-x-4 items-center cursor-help">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div
                              className={`h-2.5 rounded-full ${nodesPercentage >= 75 ? 'bg-red-600' : nodesPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(100, nodesPercentage)}%` }}
                            ></div>
                          </div>
                          <p className={`${getColor(nodesPercentage)} text-sm mt-1`}>{nodesPercentage}%</p>
                        </div>
                      </Tippy>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {queue.job_size}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {queue.time_limit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClusterInfo;
