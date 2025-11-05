import React, {useState, useEffect} from 'react'
import config from '../../config.yml';
import CreateVenvForm from "./CreateVenvForm.js"
import Spinner from "../framework/Spinner.js"
import { get_base_url } from "../utils/api_config.js"

const PyVenvManager = () => {
  
	const [envData, setEnvData] = useState(null);
	const [envKeys, setEnvKeys] = useState(null);
	const [envsLoading, setEnvsLoading] = useState(false);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [deletingEnv, setDeletingEnv] = useState(null);

	//const devUrl = config.production.dashboard_url;
	//const prodUrl = config.production.dashboard_url;
	const curUrl = get_base_url();

  const fetchEnvs = async () => {
	try {
		await setEnvsLoading(true); // Start showing loading spinner
		const envResponse = await fetch(`${curUrl}/api/get_env`);
		if (!envResponse.ok) {
		const errorString = `envResponse had an HTTP error status: ${envResponse.error}`;
		const envJson = await envResponse.json();
			if (envJson.code === "NO_METADATA") {
				await setEnvsLoading(false);
				await setEnvData("NO ENVIRONMENTS");
				await setEnvKeys(null);
			}
			throw new Error(errorString);
		}
		const envJson = await envResponse.json();
		console.log("envJson:", envJson)
		if (envJson.environments.length == 0) {
			await setEnvsLoading(false);
			await setEnvData("NO ENVIRONMENTS");
			await setEnvKeys(null);
			return;
		}
		console.log("made it past length 0 statement");
		console.log(envJson.environments[0].GCCcore_version);
		await setEnvData(envJson.environments);
		
		// This is a hack bc I'm not getting the json object in the same order as list_envs's output
		// from the back-end
		let keysArr = await Object.keys(envJson.environments[0]);
		let tmp = keysArr[0];
		keysArr[0] = keysArr[2];
		keysArr[2] = tmp; // Swap name to the front
		tmp = keysArr[1];
		keysArr[1] = keysArr[3];
		
		keysArr[3] = tmp; // Swap the description to the back
		await setEnvKeys(keysArr);
		await setEnvsLoading(false); // Stop showing loading spinner
	} catch(error) {
		console.error(`Error fetching environment data: ${error}`);
	}
  }

  useEffect(() => {
	fetchEnvs();
  }, []);

  const deleteHandler = async (envToDelete) => {
	if (window.confirm(`Are you sure you want to delete ${envToDelete}?`)){	
		try {
			setDeletingEnv(envToDelete);
			const deleteResponse = await fetch(`${curUrl}/api/delete_env/${envToDelete}`, {
				method: "DELETE"
			});

			if (!deleteResponse.ok) {	
				setDeletingEnv(null);
				throw new Error(`deleteResponse had an HTTP error status: ${deleteResponse.error}`);
			}	
			else {
				const result = await deleteResponse.json();
				console.log(result.message);
				setDeletingEnv(null);
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
    <div className="p-4 bg-white rounded-lg w-full h-full flex flex-col">
      {isFormOpen && 
	  	<div className='fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-9999'>
			<div className='relative bg-white p-6 rounded-lg w-2/3'>
				<button className='absolute top-2 right-2 text-gray-500 hover:text-red-500'
				onClick={() => {setIsFormOpen(false)}}>
					&#10006;
				</button>
				<CreateVenvForm fetchEnvs={fetchEnvs} setIsFormOpen={setIsFormOpen}/>
			</div>
		</div>
	  }
	  {(!envData && !envKeys) && 
	  <Spinner/>
	  }
	  {envsLoading && 
	  <Spinner/>
	  }
	  {((envData && envData != "NO ENVIRONMENTS") && envKeys) && 
	  <div className="overflow-auto w-full h-full flex-grow flex-col">
	  	<h2 className="text-2xl font-semibold mb-4"> Virtual Env Management </h2>
			<table className="table-auto w-full border-collapse border border-gray-300 m-2">
				<thead>
				<tr className="bg-gray-200">
					{envKeys.map((field, index) => (
					<th className="border border-gray-300 px-4 py-2" key={index}>
						{field.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
					</th>
					))}
					<th className="border border-gray-300 px-4 py-2">
					Action
					</th>
				</tr>
				</thead>
				<tbody>
					{envData.map((env) => (
						<tr key={env.name}>
							<td className="border border-gray-300 px-4 py-2">{env.name}</td>
							<td className="border border-gray-300 px-4 py-2">{env.python_version}</td>
							<td className="border border-gray-300 px-4 py-2">{env.GCCcore_version}</td>
							<td className="border border-gray-300 px-4 py-2">{env.description}</td>
							<td className="border border-gray-300 px-4 py-2">{env.toolchain}</td>
							<td className="border border-gray-300 px-4 py-2"> 
								<button className="bg-maroon text-white px-2 py-1 rounded hover:bg-red-700"
								onClick={() => deleteHandler(env.name)} disabled={deletingEnv === env.name}>
									{deletingEnv === env.name ? (
										<Spinner/>
									) : (
										"Delete"
									)} 
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<button id="createVenvFormButton" onClick={() => {setIsFormOpen(true)}} 
			className="bg-maroon text-white rounded-lg p-1 hover:bg-pink-950 m-2">
				<svg xmlns="http://www.ws.org/2000/svg"
				className="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
				</svg>
			</button>
	  </div>
	  }
	  {(envData == "NO ENVIRONMENTS" && !envKeys) && 
	  <div className="overflow-auto w-full h-full flex flex-grow flex-col justify-center items-center">	
		<h2 className="text-xl font-semibold mb-4"> You have no virtual environments to manage </h2>
		<button id="createVenvFormButton" onClick={() => {setIsFormOpen(true)}} 
			className="bg-maroon text-white rounded-lg p-1 hover:bg-pink-950 m-2">
				<svg xmlns="http://www.ws.org/2000/svg"
				className="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				>
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
			</svg>
		</button>
	  </div>
	  }
   </div> 
  )
}

export default PyVenvManager
