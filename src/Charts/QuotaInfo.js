import React, { useEffect, useState } from "react";
import config from "../../config.yml";

const QuotaInfo = () => {
  const [quotaData, setQuotaData] = useState([]);
  const [additionalText, setAdditionalText] = useState("");
  const [error, setError] = useState(null);
  const baseUrl = config.production.dashboard_url;

  // Conversion factor for units
  const unitMultipliers = {
    M: 1, // Megabytes
    G: 1024, // Gigabytes to Megabytes
    T: 1024 * 1024, // Terabytes to Megabytes
  };

  const convertToMB = (valueWithUnit) => {
    const match = valueWithUnit.match(/([\d.]+)([MGT])/i); // Match value and unit
    if (!match) return 0;
    const [, value, unit] = match;
    const multiplier = unitMultipliers[unit.toUpperCase()] || 1;
    return parseFloat(value) * multiplier;
  };

  const getUsagePercentage = (used, total) => {
    const usedMB = convertToMB(used);
    const totalMB = convertToMB(total);
    return totalMB > 0 ? ((usedMB / totalMB) * 100).toFixed(2) : 0;
  };

  const getColor = (percentage) => {
    if (percentage < 50) return "text-green-600"; // Low usage
    if (percentage < 75) return "text-yellow-500"; // Medium usage
    return "text-red-600"; // High usage
  };

  // Fetch the quota data from the backend
  useEffect(() => {
    fetch(`${baseUrl}/api/showquota`)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || "Failed to fetch quota data");
          });
        }
        return response.json();
      })
      .then((data) => {
        const quotas = data.quotas || [];
        // Extract the row with disk = "*" and format additional info text
        const additional = quotas.find((quota) => quota.disk === "*");
        setQuotaData(quotas.filter((quota) => quota.disk !== "*"));
        if (additional) {
          const relatedDisk = additional.file_limit; // "/scratch/group/hprc"
          const additionalInfo = additional.additional_info; // "will expire on Dec 31, 2026"
          setAdditionalText(`Quota for ${relatedDisk} ${additionalInfo}`);
        }
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!quotaData.length && !additionalText) {
    return <p>Loading...</p>;
  }

  return (
    <div className="p-4 bg-white rounded-lg overflow-auto w-full h-full">
      <h2 className="text-2xl font-semibold mb-4">Quota Information</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-4 py-2">Disk</th>
            <th className="border border-gray-300 px-4 py-2">Disk Usage</th>
            <th className="border border-gray-300 px-4 py-2">Disk Limit</th>
            <th className="border border-gray-300 px-4 py-2">File Usage</th>
            <th className="border border-gray-300 px-4 py-2">File Limit</th>
          </tr>
        </thead>
        <tbody>
          {quotaData.map((quota, index) => {
            const diskPercentage = getUsagePercentage(quota.disk_usage, quota.disk_limit);
            const filePercentage = getUsagePercentage(quota.file_usage, quota.file_limit);

            return (
              <tr
                key={index}
                className={`${
                  quota.additional_info ? "bg-yellow-100" : ""
                } group relative`}
              >
                <td
                  className="border border-gray-300 px-4 py-2"
                  title={quota.additional_info || ""} // Tooltip for additional info
                >
                  {quota.disk}
                </td>
                <td className={`border border-gray-300 px-4 py-4 ${getColor(diskPercentage)}`}>
                  {quota.disk_usage} ({diskPercentage}%)
                </td>
                <td className="border border-gray-300 px-4 py-4">{quota.disk_limit}</td>
                <td className={`border border-gray-300 px-4 py-4 ${getColor(filePercentage)}`}>
                  {quota.file_usage} ({filePercentage}%)
                </td>
                <td className="border border-gray-300 px-4 py-4">{quota.file_limit}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Display additional text */}
      {additionalText && (
        <p className="mt-4 text-gray-700 italic text-left">{additionalText}</p>
      )}
    </div>
  );
};

export default QuotaInfo;
