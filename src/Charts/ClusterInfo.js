import React, { useEffect, useState } from 'react';

const ClusterInfo = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  const baseUrl = `https://portal-grace.hprc.tamu.edu/pun/dev/gabriel-react-dashboard`;
  
  useEffect(() => {
    fetch(`${baseUrl}/api/sinfo`)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || 'Unknown error occurred');
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
        }
      })
      .catch((error) => setError(`Error fetching cluster data: ${error.message}`));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!data.length) return <p>Loading...</p>;

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg w-full h-full flex flex-col">
        <h2 className="text-2xl font-semibold mb-4">Cluster Queue Information</h2>
        <div className="overflow-auto w-full h-full flex-grow">
            <table className="table-auto w-full border-collapse border border-gray-300">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-gray-300 px-4 py-2">Queue</th>
                        <th className="border border-gray-300 px-4 py-2">CPU Available</th>
                        <th className="border border-gray-300 px-4 py-2">CPU Total</th>
                        <th className="border border-gray-300 px-4 py-2">Nodes Available</th>
                        <th className="border border-gray-300 px-4 py-2">Nodes Total</th>
                        <th className="border border-gray-300 px-4 py-2">Job Size</th>
                        <th className="border border-gray-300 px-4 py-2">Time Limit</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((queue, index) => (
                        <tr key={index}>
                            <td className="border border-gray-300 px-4 py-2">{queue.queue}</td>
                            <td className="border border-gray-300 px-4 py-2">{queue.CPU_avail}</td>
                            <td className="border border-gray-300 px-4 py-2">{queue.CPU_total}</td>
                            <td className="border border-gray-300 px-4 py-2">{queue.nodes_avail}</td>
                            <td className="border border-gray-300 px-4 py-2">{queue.nodes_total}</td>
                            <td className="border border-gray-300 px-4 py-2">{queue.job_size}</td>
                            <td className="border border-gray-300 px-4 py-2">{queue.time_limit}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);
};

export default ClusterInfo;
