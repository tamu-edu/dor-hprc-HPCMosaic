import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import config from "../../config.yml";

const Accounts = () => {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [view, setView] = useState("table"); // 'table' or 'chart'
  const baseUrl = config.production.dashboard_url;

  useEffect(() => {
    fetch(`${baseUrl}/api/projectinfo`)
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
          setProjects(data.projects);
        }
      })
      .catch((error) => setError(`Error fetching project data: ${error.message}`));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!projects.length) return <p>Loading...</p>;

  const chartData = {
    labels: projects.map((project) => project.account),
    datasets: [
      {
        label: "Used & Pending SUs",
        data: projects.map((project) => project.used_pending_sus),
        backgroundColor: "rgba(255, 99, 132, 0.8)", // Red
      },
      {
        label: "Remaining Balance",
        data: projects.map((project) => project.balance),
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
      <h2 className="text-2xl font-semibold mb-4">Account Information</h2>

      <div className="mb-4">
        <button
          className={`px-4 py-2 mr-2 rounded ${view === "table" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
          onClick={() => setView("table")}
        >
          Table View
        </button>
        <button
          className={`px-4 py-2 rounded ${view === "chart" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
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
                <th className="border border-gray-300 px-2 py-2">Account</th>
                <th className="border border-gray-300 px-2 py-2">FY</th>
                <th className="border border-gray-300 px-2 py-2">Default</th>
                <th className="border border-gray-300 px-2 py-2">Allocation</th>
                <th className="border border-gray-300 px-2 py-2">Used & Pending SUs</th>
                <th className="border border-gray-300 px-2 py-2">Balance</th>
                <th className="border border-gray-300 px-2 py-2">PI</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-2 py-2">{project.account}</td>
                  <td className="border border-gray-300 px-2 py-2">{project.fy}</td>
                  <td className="border border-gray-300 px-2 py-2">{project.default}</td>
                  <td className="border border-gray-300 px-2 py-2">{project.allocation}</td>
                  <td className="border border-gray-300 px-2 py-2">{project.used_pending_sus}</td>
                  <td className="border border-gray-300 px-2 py-2">{project.balance}</td>
                  <td className="border border-gray-300 px-2 py-2">{project.pi}</td>
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

export default Accounts;