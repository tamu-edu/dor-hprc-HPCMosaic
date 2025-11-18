//Get the base URL for API calls. Uses the dashboard_url set by the backend template.
//This automatically uses the correct URL based on the environment (dev/production)

export const get_base_url = () => {
  // Check if document.dashboard_url is set (should be set by backend template)
  if (typeof document !== 'undefined' && document.dashboard_url) {
    return document.dashboard_url;
  }

  // Fallback: try to detect from window location
  // This handles cases where the script loads before document.dashboard_url is set
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;

    // Check if we're in OOD dev environment
    if (path.includes('/pun/dev/')) {
      const match = path.match(/\/pun\/dev\/([^\/]+)/);
      if (match) {
        return `/pun/dev/${match[1]}`;
      }
    }

    // Check if we're in OOD sys/production environment
    if (path.includes('/pun/sys/')) {
      const match = path.match(/\/pun\/sys\/([^\/]+)/);
      if (match) {
        return `/pun/sys/${match[1]}`;
      }
    }
    // Local development fallback
    return 'http://127.0.0.1:5000';
  }

  // Final fallback (shouldn't reach here)
  return '';
};


