import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import config from "../../config.yml";
import Spinner from "../Components/Spinner";

const ClusterInfo = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [view, setView] = useState("chart");
  const [loading, setLoading] = useState(true);
  const baseUrl = config.production.dashboard_url;

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

  return (
    <div className="p-4 bg-white w-full h-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4">Queue Availability</h2>

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
        <div className="w-full h-full flex-grow">
          <h3 className="text-xl font-semibold mb-4">Core & Node Utilization</h3>
          <Bar
            data={{
              labels: data.map((queue) => queue.queue), // Queue names on Y-axis
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
                  stack: "cores",
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
                  stack: "cores",
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
                  stack: "nodes",
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
                  stack: "nodes",
                },
              ],
            }}
            options={{
              indexAxis: "y", // Vertical stacking with queue names on the left
              responsive: true,
              plugins: {
                legend: { display: true, position: "top" },
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      let label = context.dataset.label || "";
                      if (label) {
                        label += ": ";
                      }
                      label += `${context.raw}%`;
                      const queue = data[context.dataIndex];
                      if (context.dataset.label.includes("Cores")) {
                        const totalCores = parseInt(queue.CPU_total, 10);
                        const usedCores =
                          parseInt(queue.CPU_total, 10) -
                          parseInt(queue.CPU_avail, 10);
                        label += ` (${usedCores}/${totalCores})`;
                      } else {
                        const totalNodes = parseInt(queue.nodes_total, 10);
                        const usedNodes =
                          parseInt(queue.nodes_total, 10) -
                          parseInt(queue.nodes_avail, 10);
                        label += ` (${usedNodes}/${totalNodes})`;
                      }
                      return label;
                    },
                  },
                },
              },
              scales: {
                x: {
                  stacked: true,
                  ticks: {
                    callback: (value) => `${value}%`,
                  },
                },
                y: { stacked: true },
              },
            }}
          />
        </div>
      ) : (
        <div className="overflow-auto w-full h-full flex-grow">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2">Queue</th>
                <th className="border border-gray-300 px-4 py-2">Resources</th>
                <th className="border border-gray-300 px-4 py-2">Job Size</th>
                <th className="border border-gray-300 px-4 py-2">Time Limit</th>
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
                    <td className="border border-gray-300 px-4 py-2">
                      CPU: {cpuUsed}/{cpuTotal} ({cpuPercentage}%)<br />
                      Nodes: {nodesUsed}/{nodesTotal} ({nodesPercentage}%)
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
