import React, { useEffect, useState } from "react";
import Spinner from "../framework/Spinner";
import { get_base_url } from "../utils/api_config.js";
import { useTheme } from "../context/ThemeContext";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

const Announcement = () => {
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const baseUrl = get_base_url();
  const { theme } = useTheme();

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
      <div
        className="w-full p-4 pb-20 border-2 border-l-8 rounded-lg shadow-md mb-6"
        style={{
          backgroundColor: theme.colors.alertBg,
          borderColor: theme.colors.alertBorder
        }}
      >
        <div className="flex items-center">
          <h2 className="text-2xl font-bold" style={{ color: theme.colors.alertText }}>
            <Tippy content="Message of the Day from System Administrators">
              <span className="cursor-help">Announcements</span>
            </Tippy>
          </h2>
        </div>
    
        <ul className="mt-3 list-disc pl-5 text-lg" style={{ color: theme.colors.alertText }}>
          {announcement.messages.map((msg, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {msg}
            </li>
          ))}
        </ul>
    
        {announcement.updated_at && (
          <h5 className="text-base mt-4" style={{ color: theme.colors.alertTextSecondary }}>
            Last updated: {announcement.updated_at}
          </h5>
        )}
      </div>
    );
};

export default Announcement;