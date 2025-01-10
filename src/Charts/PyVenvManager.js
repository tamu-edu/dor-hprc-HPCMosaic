import React, {useState, useEffect} from 'react'

const PyVenvManager = () => {
  
  const [envData, setEnvData] = useState(null);
  const [envKeys, setEnvKeys] = useState(null);

  const prodUrl = `${window.location.origin}/pun/sys/dor-hprc-web-tamudashboard-reu-branch`;
  const devUrl = `https://portal-grace.hprc.tamu.edu/pun/dev/gabriel-react-dashboard`;
  const curUrl = (process.env.NODE_ENV == 'development') ? devUrl : prodUrl;

  const fetchEnvs = async () => {
	try {
		const envResponse = await fetch(`${curUrl}/api/get_env`);
		if (!envResponse.ok) {
			throw new Error(`envResponse had an HTTP error status: ${envResponse.error}`)
		}
		const envJson = await envResponse.json();
		console.log(envJson.environments[0].GCCcore_version);

		await setEnvData(envJson.environments);
		let keysArr = await Object.keys(envJson.environments[0]);
		let tmp = keysArr[0];
		keysArr[0] = keysArr[2];
		keysArr[2] = tmp; // Swap name to the front
		tmp = keysArr[1];
		keysArr[1] = keysArr[3];
		keysArr[3] = tmp; // Swap the description to the back
		await setEnvKeys(keysArr);
	} catch(error) {
		console.error(`Error fetching environment data: ${error}`);
	}
  }

  useEffect(() => {
	fetchEnvs();
	console.log(process.env.NODE_ENV);
  }, []);

  const deleteHandler = async (envToDelete) => {
	if (window.confirm(`Are you sure you want to delete ${envToDelete}?`)){	
		try {
			const deleteResponse = await fetch(`${curUrl}/api/delete_env/${envToDelete}`, {
				method: "DELETE"
			});

			if (!deleteResponse.ok) {
				throw new Error(`deleteResponse had an HTTP error status: ${deleteResponse.error}`);
			}	
			else {
				result = await deleteResponse.json();
				console.log(result.message);
				await fetchEnvs();
			}
		} catch(error) {
			console.error(`Error deleting environment: ${error}`);
		}
  	}
	  else {
		console.log("Delete env action cancelled");
	}
}

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg w-full h-full flex flex-col">
      {(!envData || !envKeys) && 
	  <div className="overflow-auto w-full h-full flex-grow">
	  	<p> Loading... </p>
	  </div>
	  }
	  {(envData && envKeys) && 
	  <div className="overflow-auto w-full h-full flex-grow">
	  	<h2 className="text-2xl font-semibold mb-4"> Virtual Env Management </h2>
			<table className="table-auto w-full border-collapse border border-gray-300">
				<thead>
					<tr className="bg-gray-200">
						{envKeys.map((field, index) => (
							<th className="border border-gray-300 px-4 py-2"key={index}> {field} </th>
						))}
					</tr>
				</thead>
				<tbody>
					{envData.map((env) => (
						<tr key={env.name}>
							<td className="border border-gray-300 px-4 py-2">{env.name}</td>
							<td className="border border-gray-300 px-4 py-2">{env.python_version}</td>
							<td className="border border-gray-300 px-4 py-2">{env.GCCcore_version}</td>
							<td className="border border-gray-300 px-4 py-2">{env.description}</td>
							<td className="border border-gray-300 px-4 py-2"> 
								<button className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-700"
								onClick={() => deleteHandler(env.name)}>
									Delete 
								</button> 
							</td>
						</tr>
					))}
				</tbody>
			</table>
	  </div>}
   </div> 
  )
}

export default PyVenvManager
