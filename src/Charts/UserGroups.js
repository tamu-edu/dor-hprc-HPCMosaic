import React, { useEffect, useState } from "react";
import config from "../../config.yml";
import Spinner from "../Components/Spinner";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css"; // Import Tippy styles

const UserGroups = () => {
  const [groups, setGroups] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const baseUrl = config.production.dashboard_url;

  // Fetch user groups
  useEffect(() => {
    fetch(`${baseUrl}/api/groups`)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || "Failed to fetch groups");
          });
        }
        return response.json();
      })
      .then((data) => {
        setGroups(data.groups || []);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  // Fetch quotas
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
        setQuotas(data.quotas || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="p-4 bg-white w-full h-full flex flex-col">
      {/* Title with Tooltip */}
      <div className="flex items-center">
        <h2 className="text-2xl font-semibold mb-4">
          <Tippy content="User groups determine access to HPC resources, storage, and quotas.">
            <span className="cursor-help">User Groups ⓘ</span>
          </Tippy>
        </h2>
      </div>

      <div className="overflow-auto w-full h-full flex-grow">
        <table className="table-auto w-full border-collapse border border-gray-300 rounded-lg shadow-sm">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="border border-gray-300 px-4 py-2">
                <Tippy content="Groups define which HPC resources and storage quotas users have access to.">
                  <span className="cursor-help">Group ⓘ</span>
                </Tippy>
              </th>
              <th className="border border-gray-300 px-4 py-2">
                <Tippy content="The storage path assigned to this group, where their data is stored on the HPC system.">
                  <span className="cursor-help">Disk Path ⓘ</span>
                </Tippy>
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-800 text-sm">
            {groups.map((group, index) => {
              // Find any quota associated with this group
              const matchingQuotas = quotas.filter((quota) =>
                quota.disk.includes(group)
              );

              // If no quota exists, show an empty row
              if (matchingQuotas.length === 0) {
                return (
                  <tr key={index} className="border-b border-gray-200 bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{group}</td>
                    <td className="py-3 px-4 italic text-gray-400">No quota assigned</td>
                  </tr>
                );
              }

              // If the group has quotas, show each one
              return matchingQuotas.map((quota, quotaIndex) => (
                <tr key={`${index}-${quotaIndex}`} className="border-b border-gray-200">
                  <td className="py-3 px-4 font-medium text-gray-900">{group}</td>
                  <td className="py-3 px-4">{quota.disk}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserGroups;
