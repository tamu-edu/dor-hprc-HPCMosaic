import React, {useState, useEffect} from 'react'
import CreateVenvForm from "./CreateVenvForm.js"
import Spinner from "../framework/Spinner.js"
import { get_base_url } from "../utils/api_config.js"
import { cardClasses, cx } from "./dashboardUtils";

const ENVIRONMENT_COLUMNS = [
	{ key: "name", label: "Name" },
	{ key: "python_version", label: "Python Version" },
	{ key: "GCCcore_version", label: "GCCcore Version" },
	{ key: "description", label: "Description" },
	{ key: "owner", label: "Owner" },
	{ key: "group", label: "Group" },
	{ key: "toolchain", label: "Toolchain" },
];

const PyVenvManager = () => {
  
	const [envData, setEnvData] = useState(null);
	const [envsLoading, setEnvsLoading] = useState(false);
	const [envError, setEnvError] = useState(null);
	const [envErrorDetails, setEnvErrorDetails] = useState(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [deletingEnv, setDeletingEnv] = useState(null);

	const curUrl = get_base_url();

  const fetchEnvs = async () => {
	setEnvsLoading(true);
	setEnvError(null);
	setEnvErrorDetails(null);
	try {
		const envResponse = await fetch(`${curUrl}/api/get_env`);
		const envJson = await envResponse.json();
		if (!envResponse.ok) {
			setEnvErrorDetails(envJson.details || null);
			throw new Error(envJson.error || `Unable to load environments (${envResponse.status})`);
		}
		if (envJson.environments.length == 0) {
			setEnvData("NO ENVIRONMENTS");
			return;
		}
		setEnvData(envJson.environments);
	} catch(error) {
		console.error(`Error fetching environment data: ${error}`);
		setEnvData(null);
		setEnvError(error.message || "Unable to load virtual environments");
	} finally {
		setEnvsLoading(false);
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
    <div className="p-4 theme-surface rounded-lg w-full h-full flex flex-col">
	      {isFormOpen &&
			<div className='fixed inset-0 flex items-center justify-center z-9999' style={{ backgroundColor: 'var(--mosaic-color-overlay)' }}>
				<div className='relative theme-surface p-6 rounded-lg w-2/3'>
					<button className='non-draggable absolute top-2 right-2 theme-text-secondary theme-hover-danger'
					onClick={() => {setIsFormOpen(false)}}>
					&#10006;
				</button>
				<CreateVenvForm fetchEnvs={fetchEnvs} setIsFormOpen={setIsFormOpen}/>
			</div>
		</div>
	  }
	  {(!envData && !envError && !envsLoading) &&
	  <Spinner/>
	  }
	  {envsLoading && 
	  <Spinner/>
	  }
	  {envError && !envsLoading &&
	  <div className="w-full h-full flex flex-col justify-center items-center px-6 text-center">
		<h2 className="text-xl font-semibold mb-2 theme-text-primary">
			Unable to load virtual environments
		</h2>
		<p className="theme-text-secondary mb-4 break-words max-w-2xl">{envError}</p>
		{envErrorDetails &&
		<pre className="theme-surface-muted theme-text-secondary border theme-border rounded p-3 mb-4 max-w-3xl max-h-48 overflow-auto text-left whitespace-pre-wrap break-words text-sm">
			{envErrorDetails}
		</pre>
		}
		<button
			type="button"
			onClick={fetchEnvs}
			className="non-draggable theme-button-primary rounded px-4 py-2"
		>
			Try again
		</button>
	  </div>
	  }
	  {(envData && envData != "NO ENVIRONMENTS") &&
	  <div className="overflow-auto w-full h-full flex-grow flex-col">
	  	<h2 className={cardClasses.titleText}>Environment Management</h2>
			<table className="table-auto w-full border-collapse border theme-border m-2">
				<thead>
				<tr className="theme-table-header">
					{ENVIRONMENT_COLUMNS.map(({ key, label }) => (
					<th className="border theme-border px-4 py-2 theme-text-primary" key={key}>
						{label}
					</th>
					))}
					<th className="border theme-border px-4 py-2 theme-text-primary">
					Action
					</th>
				</tr>
				</thead>
				<tbody>
					{envData.map((env) => (
						<tr key={env.name} className="theme-hover-surface transition-colors theme-text-primary">
							{ENVIRONMENT_COLUMNS.map(({ key }) => (
								<td className="border theme-border px-4 py-2" key={key}>
									{env[key] || ""}
								</td>
							))}
							<td className="border theme-border px-4 py-2"> 
									<button className="non-draggable theme-button-danger px-2 py-1 rounded"
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
				className="non-draggable theme-button-primary rounded-lg p-1 m-2">
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
	  {envData == "NO ENVIRONMENTS" &&
	  <div className="overflow-auto w-full h-full flex flex-grow flex-col justify-center items-center">	
			<h2 className="text-xl font-semibold mb-4 theme-text-primary"> No virtual environments to manage. </h2>
			<button id="createVenvFormButton" onClick={() => {setIsFormOpen(true)}}
				className="non-draggable theme-button-primary rounded-lg p-1 m-2">
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
