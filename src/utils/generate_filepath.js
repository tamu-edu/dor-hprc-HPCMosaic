import React from "react";

export function generate_file_explorer_path_for_disk(disk_path) {
  const fullUrl = `https://portal-aces.hprc.tamu.edu/pun/sys/dashboard/files/fs${disk_path}`;

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
