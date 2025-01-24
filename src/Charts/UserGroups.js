import React, { useEffect, useState } from "react";
import config from "../../config.yml";

const UserGroups = () => {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const baseUrl = config.production.dashboard_url;

  // Fetch the user groups from the backend
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

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (!groups.length) {
    return <p>Loading...</p>;
  }

  return (
    <div className="overflow-auto w-full h-full flex-grow">
    <h2 className="text-2xl p-4 font-semibold mb-4">User Groups</h2>
      <ul className="list-disc pl-10">
        {groups.map((group, index) => (
          <li key={index} className="text-gray-700">
            {group}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserGroups;
