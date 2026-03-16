import React, { useEffect, useState } from "react";
import Spinner from "../framework/Spinner";
import { get_base_url } from "../utils/api_config.js";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

const Announcement = () => {
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const baseUrl = get_base_url();

  // Fetch message of the day
  useEffect(() => {
    fetch(`${baseUrl}/api/announcement`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAnnouncement(data.announcement || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <p className="text-red-500">{error}</p>;

  // If no active announcement, render nothing
  if (!announcement) return null;

  return (
      <div className="w-full p-4 pb-20 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 dark:border-red-700 border-l-8 rounded-lg shadow-md mb-6">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold text-red-800 dark:text-red-300">
            <Tippy content="Message of the Day from System Administrators">
              <span className="cursor-help">Announcement</span>
            </Tippy>
          </h2>
        </div>
    
        <h4 className="mt-3 text-red-900 dark:text-red-200 whitespace-pre-wrap text-lg">
          {announcement.message}
        </h4>
    
        {announcement.updated_at && (
          <h5 className="text-base text-red-700 dark:text-red-400 mt-4">
            Last updated: {announcement.updated_at}
          </h5>
        )}
      </div>
    );
};

export default Announcement;