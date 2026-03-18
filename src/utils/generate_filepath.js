import React from "react";
import { useTheme } from '../context/ThemeContext';

export function generate_file_explorer_path_for_disk(disk_path) {
  const { theme } = useTheme();
  const fullUrl = `/pun/sys/dashboard/files/fs${disk_path}`;

  return (
    <a
      target="_blank"
      style={{
        color: theme.colors.link,
	fontWeight: 'bold',
        textDecoration: 'underline'
      }}
      href={fullUrl}
    >
    {disk_path}
    </a>
  );
}

export function generate_file_explorer_path_for_jobs(job) {
  const { theme } = useTheme();
  if (!job.submit_dir) return job.job_id; // fallback if no directory

  const fullUrl = `/pun/sys/dashboard/files/fs${job.submit_dir}`;
  
  const shortPath = shortenPath(job.submit_dir);

  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: theme.colors.link,
        fontWeight: 'bold',
        textDecoration: 'underline',
      }}
      href={fullUrl}
    >
      {shortPath}
    </a>
  );
}

function shortenPath(path) {
  if (!path) return "";

  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 2) return path;

  const firstFolder = parts[0];
  const lastFolder = parts[parts.length - 1];
  const middleCount = parts.length - 2;
  const dots = "../".repeat(middleCount);

  return `/${firstFolder}/${dots}${lastFolder}`;
}
