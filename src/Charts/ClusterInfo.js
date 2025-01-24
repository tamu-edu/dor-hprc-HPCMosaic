import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import config from "../../config.yml";

const ClusterInfo = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [view, setView] = useState("table"); // 'table' or 'chart'
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
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
        }
      })
      .catch((error) => setError(`Error fetching cluster data: ${error.message}`));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!data.length) return <p>Loading...</p>;

  const chartData = {
    labels: data.map((queue) => queue.queue), // Partition names
    datasets: [
      {
        label: "Used CPUs",
        data: data.map((queue) => parseInt(queue.CPU_total, 10) - parseInt(queue.CPU_avail, 10)),
        backgroundColor: "rgba(255, 99, 132, 0.8)", // Red
      },
      {
        label: "Available CPUs",
        data: data.map((queue) => parseInt(queue.CPU_avail, 10)),
        backgroundColor: "rgba(54, 162, 235, 0.8)", // Blue
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const value = tooltipItem.raw;
            const datasetLabel = tooltipItem.dataset.label;
            const total = tooltipItem.chart.data.datasets
              .map((ds) => ds.data[tooltipItem.dataIndex])
              .reduce((acc, val) => acc + val, 0); // Calculate the total CPUs for the partition
            const percentage = ((value / total) * 100).toFixed(2); // Calculate percentage
            return `${datasetLabel}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true, // Enable stacking on the x-axis
        title: {
          display: true,
          text: "Partition",
        },
      },
      y: {
        stacked: true, // Enable stacking on the y-axis
        beginAtZero: true,
        title: {
          display: true,
          text: "CPUs",
        },
      },
    },
  };

  return (
    <div className="p-4 bg-white w-full h-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4">Cluster Queue Information</h2>

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

      {view === "table" ? (
        <div className="overflow-auto w-full h-full flex-grow">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2">Queue</th>
                <th className="border border-gray-300 px-4 py-2">CPU Available</th>
                <th className="border border-gray-300 px-4 py-2">CPU Total</th>
                <th className="border border-gray-300 px-4 py-2">Nodes Available</th>
                <th className="border border-gray-300 px-4 py-2">Nodes Total</th>
                <th className="border border-gray-300 px-4 py-2">Job Size</th>
                <th className="border border-gray-300 px-4 py-2">Time Limit</th>
              </tr>
            </thead>
            <tbody>
              {data.map((queue, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{queue.queue}</td>
                  <td className="border border-gray-300 px-4 py-2">{queue.CPU_avail}</td>
                  <td className="border border-gray-300 px-4 py-2">{queue.CPU_total}</td>
                  <td className="border border-gray-300 px-4 py-2">{queue.nodes_avail}</td>
                  <td className="border border-gray-300 px-4 py-2">{queue.nodes_total}</td>
                  <td className="border border-gray-300 px-4 py-2">{queue.job_size}</td>
                  <td className="border border-gray-300 px-4 py-2">{queue.time_limit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="w-full h-full flex-grow">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
};

export default ClusterInfo;
