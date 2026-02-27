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
    <div className="p-4 bg-white rounded-lg w-full mb-4">
      <div className="flex items-center">
        <h2 className="text-2xl font-semibold mb-4">
          <Tippy content="Message of the Day from System Administrators">
            <span className="cursor-help">Announcement ⓘ</span>
          </Tippy>
        </h2>
      </div>

      <p className="mt-2 text-gray-700 whitespace-pre-wrap">
        {announcement.message}
      </p>

      {announcement.updated_at && (
        <p className="text-xs text-gray-500 mt-3">
          Last updated: {announcement.updated_at}
        </p>
      )}
    </div>
  );
};

export default Announcement;