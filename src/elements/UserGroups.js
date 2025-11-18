import React, { useEffect, useState } from "react";
import config from "../../config.yml";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css"; // Import Tippy styles
import Spinner from "../framework/Spinner";
import ElementDescriptions from "../framework/ElementDescriptions";
import GroupButton from "./GroupButton"; // Import GroupButton component

import { generate_file_explorer_path_for_disk } from '../utils/generate_filepath';
import { get_base_url } from "../utils/api_config.js"

const UserGroups = () => {
  const [groups, setGroups] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const baseUrl = get_base_url();
  
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
