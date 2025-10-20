import React, { useEffect, useState } from "react";
import config from "../../config.yml";
import Spinner from "../Components/Spinner";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css"; // Import Tippy styles
import ElementDescriptions from "../Components/ElementDescriptions";
import GroupButton from "../Charts/GroupButton"; // Import GroupButton component

import { generate_file_explorer_path_for_disk } from '../utils/generate_filepath';

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
    <div className="p-4 bg-white w-full flex flex-col">
      {/* Header section with title and action button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
        <div className="mb-2 sm:mb-0">
          <h2 className="text-2xl font-semibold">
            <Tippy content={ElementDescriptions["User Groups"]}>
              <span className="cursor-help">User Groups ⓘ</span>
            </Tippy>
          </h2>
        </div>
        
        {/* Request Group Access Button */}
        <div className="flex items-center">
          <div className="group-request-action">
            <GroupButton />
          </div>
        </div>
      </div>

      <hr className="border-gray-300 mb-4" />

      {/*User's Groups*/}
      <div className="overflow-auto w-full h-full flex-grow">
        <div className="flex flex-wrap gap-3">
          {groups.map((group, index) => (
            <div
              key={index}
              className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center hover:bg-blue-100 transition-colors duration-200"
            >
              <span className="font-medium text-blue-900">{group}</span>
            </div>
          ))}
        </div>
        
	  {/*
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
                  <tr key={index} className="border-b border-gray-200 bg-gray-50 hover:bg-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-900">{group}</td>
                    <td className="py-3 px-4 italic text-gray-400">No quota assigned</td>
                  </tr>
                );
              }

              // If the group has quotas, show each one
              return matchingQuotas.map((quota, quotaIndex) => (
                <tr key={`${index}-${quotaIndex}`} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{group}</td>
                  <td className="py-3 px-4">{generate_file_explorer_path_for_disk(quota.disk)}</td>
                </tr>
              ));
            })}
            {groups.length === 0 && (
              <tr className="border-b border-gray-200">
                <td colSpan="2" className="py-6 px-4 text-center text-gray-500">
                  No groups found. Use the "Group Request" button to request access to a group.
                </td>
              </tr>
            )}
          </tbody>
        </table>
	*/}
      </div>
      
      {/* Additional note at the bottom */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Need access to additional groups? Use the "Group Request" button above to submit a request.
        </p>
      </div>
    </div>
  );
};

export default UserGroups;
