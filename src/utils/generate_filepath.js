import React from "react";

export function generate_file_explorer_path_for_disk(disk_path) {
  const fullUrl = `/pun/sys/dashboard/files/fs${disk_path}`;

  return (
    <a
      target="_blank"
      style={{
        color: '#003C71',
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
  if (!job.submit_dir) return job.job_id; // fallback if no directory

  const fullUrl = `/pun/sys/dashboard/files/fs${job.submit_dir}`;

  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: '#003C71',
        fontWeight: 'bold',
        textDecoration: 'underline',
      }}
      href={fullUrl}
    >
      {job.job_id}
    </a>
  );
}