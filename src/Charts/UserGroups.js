import React, { useEffect, useState } from "react";
import config from "../../config.yml";
import Spinner from "../Components/Spinner";

const UserGroups = () => {
  const [groups, setGroups] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // New state to track loading status
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
      .finally(() => setLoading(false)); // Only set loading to false when both fetches are done
  }, []);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (loading) {
    return <Spinner/>;
  }

  return (
    <div className="p-4 bg-white w-full h-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4">User Groups</h2>

      <div className="overflow-auto w-full h-full flex-grow">
        <table className="table-auto w-full border-collapse border border-gray-300 rounded-lg shadow-sm">
          <thead>
            <tr className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
              <th className="border border-gray-300 px-4 py-2">Group</th>
              <th className="border border-gray-300 px-4 py-2">Disk Path</th>
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
