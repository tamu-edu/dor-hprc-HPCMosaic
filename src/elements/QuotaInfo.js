import React, { useEffect, useState } from "react";
import config from "../../config.yml";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css"; // Default tooltip styling
import ElementDescriptions from "../framework/ElementDescriptions";
import Spinner from "../framework/Spinner";
import QuotaButton from "./QuotaButton"; // Import QuotaButton component
import { generate_file_explorer_path_for_disk } from '../utils/generate_filepath';

const QuotaInfo = () => {
  const [quotaData, setQuotaData] = useState([]);
  const [additionalText, setAdditionalText] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const baseUrl = config.production.dashboard_url;

  // Conversion factor for units
  const unitMultipliers = {
    M: 1, // Megabytes
    G: 1024, // Gigabytes to Megabytes
    T: 1024 * 1024, // Terabytes to Megabytes
  };

  const convertToMB = (valueWithUnit) => {
    const match = valueWithUnit.match(/([\d.]+)([MGT])/i);
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

  const getFileUsagePercentage = (used, total) => {
    return total > 0 ? ((used / total) * 100).toFixed(2) : 0;
  };

  const getColor = (percentage) => {
    if (percentage < 50) return "text-green-600";
    if (percentage < 75) return "text-yellow-500";
    return "text-red-600";
  };

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
        const additional = quotas.find((quota) => quota.disk === "*");
        setQuotaData(quotas.filter((quota) => quota.disk !== "*"));
        if (additional) {
          const relatedDisk = additional.file_limit;
          const additionalInfo = additional.additional_info;
          setAdditionalText(`Quota for ${relatedDisk} ${additionalInfo}`);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  // Custom Tooltip Component
  const CustomTooltip = ({ content }) => (
    <div className="bg-gray-800 text-white text-sm p-2 rounded-md shadow-lg z-50">
      {content}
    </div>
  );

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (loading) {
    return <Spinner />;
  }

  // Find the highest usage percentage for highlighting
  const findHighestUsage = () => {
    let highest = 0;
    quotaData.forEach((quota) => {
      const diskPercentage = parseFloat(getUsagePercentage(quota.disk_usage, quota.disk_limit));
      if (diskPercentage > highest) highest = diskPercentage;
    });
    return highest;
  };
  
  const highestUsage = findHighestUsage();

  return (
    <div className="p-4 bg-white rounded-lg overflow-auto w-full h-full">
      {/* Header section with title and action button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
        <div className="mb-2 sm:mb-0">
          <h2 className="text-2xl font-semibold">
            <Tippy content={ElementDescriptions["Quota Info"]}>
              <span className="cursor-help">Quota Information ⓘ</span>
            </Tippy>
          </h2>
        </div>
        
        {/* Quota Request Button - Conditionally show with a message when usage is high */}
        <div className="flex items-center">
          {highestUsage >= 75 && (
            <div className="mr-3 text-red-600 text-sm font-medium bg-red-50 px-2 py-1 rounded">
              <span>High usage detected!</span>
            </div>
          )}
          {/* <div className="quota-request-action">
            <QuotaButton />
          </div> */}
        </div>
      </div>
      
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-4 py-2">
              <Tippy content={<CustomTooltip content="The storage disk being monitored." />} placement="top">
                <span className="cursor-help font-semibold">Disk ⓘ</span>
              </Tippy>
            </th>
            <th className="border border-gray-300 px-4 py-2">
              <Tippy content={<CustomTooltip content="Percentage of storage used versus total allocated." />} placement="top">
                <span className="cursor-help font-semibold">Disk Usage (%) ⓘ</span>
              </Tippy>
            </th>
            <th className="border border-gray-300 px-4 py-2">
              <Tippy content={<CustomTooltip content="Percentage of files used versus total allowed." />} placement="top">
                <span className="cursor-help font-semibold">File Usage (%) ⓘ</span>
              </Tippy>
            </th>
            <th className="border border-gray-300 px-4 py-2">
              <span className="font-semibold">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {quotaData.map((quota, index) => {
            const diskPercentage = getUsagePercentage(quota.disk_usage, quota.disk_limit);
            const filePercentage = getFileUsagePercentage(quota.file_usage, quota.file_limit);

            // Check if this is home directory (we might want to skip showing buttons for certain disks)
            const isHomeDir = quota.disk.includes("/home");

            return (
              <tr key={index} className={`${quota.additional_info ? "bg-yellow-100" : ""} group relative`}>
                <td className="border border-gray-300 px-4 py-2" title={quota.additional_info || ""}>
                  {generate_file_explorer_path_for_disk(quota.disk)}
                </td>
                <td className="border border-gray-300 px-4 py-4">
                  <Tippy content={<CustomTooltip content={`Used: ${quota.disk_usage} / Total: ${quota.disk_limit}`} />} placement="top">
                    <div className="gap-x-4 items-center cursor-help">
                      <p>{quota.disk_usage}/{quota.disk_limit}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        

                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
                          <div 
                            className={`h-2.5 rounded-full ${diskPercentage >= 75 ? 'bg-red-600' : diskPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                            style={{ width: `${Math.min(100, diskPercentage)}%` }}
                          ></div>
                        </div>
                         
                      </div>
                      <p className={`${getColor(diskPercentage)} text-sm mt-1`}>{diskPercentage}%</p>
                    </div>
                  </Tippy>
                </td>
                <td className="border border-gray-300 px-4 py-4">
                  <Tippy content={<CustomTooltip content={`Used: ${quota.file_usage} / Total: ${quota.file_limit}`} />} placement="top">
                    <div className="gap-x-4 items-center cursor-help">
                      <p>{quota.file_usage}/{quota.file_limit}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full ${filePercentage >= 75 ? 'bg-red-600' : filePercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, filePercentage)}%` }}
                        ></div>
                      </div>
                      <p className={`${getColor(filePercentage)} text-sm mt-1`}>{filePercentage}%</p>
                    </div>
                  </Tippy>
                </td>
                <td className="border border-gray-300 px-4 py-4 text-center">
                  {!isHomeDir && (
                    <QuotaButton 
                      disk={quota.disk} 
                      currentQuota={quota.disk_limit}
                      currentFileLimit={quota.file_limit}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {additionalText && <p className="mt-4 text-gray-700 italic text-left">{additionalText}</p>}
      
      {/* Additional note at the bottom */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Need more storage space? Click "Request" next to a specific disk to request an increase for that disk.
        </p>
      </div>
    </div>
  );
};

export default QuotaInfo;
