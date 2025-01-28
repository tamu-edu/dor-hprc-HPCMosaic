import React, {useState, useEffect} from "react";

const CreateVenvForm = ({ fetchEnvs }) => {
	const [pyVersions, setPyVersions] = useState(null);
	const [selectedPyVersion, setSelectedPyVersion] = useState(null);
	const [gccversion, setGccversion] = useState(null);
	const [description, setDescription] = useState('');
	const [envName, setEnvName] = useState(null);

	const prodUrl = `${window.location.origin}/pun/sys/dor-hprc-web-tamudashboard-reu-branch`;
	const devUrl = `https://portal-grace.hprc.tamu.edu/pun/dev/gabriel-react-dashboard`;
	const curUrl = (process.env.NODE_ENV == 'development') ? devUrl : prodUrl;

	const fetchPyVersions = async () => {
		try {
			const versionsResult = await fetch(`${curUrl}/api/get_py_versions`);
			const versions = await versionsResult.json()
			await setPyVersions(versions);
			// Make the default Py and GCC versions the latest ones
			await setSelectedPyVersion(Object.keys(versions)[0]);
			await setGccversion(versions[selectedPyVersion]);

			console.log("Testing types:", typeof pyVersions);
		} catch (error) {
			console.error(`There was an error fetching the available Python versions: ${error}`);
		}
	}

	useEffect(() => {
		fetchPyVersions();
	}, [])

	const handlePyVersionSelect = async (e) => {
		await setSelectedPyVersion(e.target.value);
		await setGccversion(pyVersions[selectedPyVersion]);
	}

	const handleSubmission = async (e) => {
		e.preventDefault();

		// Validate that an env name was provided
		if (!envName) {
			alert("You must enter a name for the virtual environment")
			return;
		}

		const formData = {
			pyVersion: selectedPyVersion,
			GCCversion: gccversion || pyVersions[selectedPyVersion],
			envName: envName,
			description: description
		};
		console.log(formData)
		try {
			const createResponse = fetch(`${curUrl}/api/create_venv`, {
				method: 'POST',
				headers: {
					'Content-type': 'application/json'
				},
				body: JSON.stringify(formData)
			});
			
			if (!createResponse.ok) {
				throw new Error(`Venv creation form api response was not ok: ${createResponse.error} `);
			}

			const responseData = await createResponse.json();
			console.log(`Successfully created new venv: {responseData.message}`);
			await fetchEnvs();
		} catch (error) {
			console.error(`There has been an error while handling the venv creation form submission: ${error}`);
		}	
	}


	return (
		<form onSubmit={handleSubmission} className='space-y-4'>
			{!pyVersions && 
				<div>
					<p> Loading... </p>
				</div>
			}	
			{pyVersions &&
			<div>
				<label htmlFor='pyVersion' className='block text-sm font-medium text-gray-700'>
					Select Python Version
				</label>
				<select id="pyVersion" value={selectedPyVersion} onChange={handlePyVersionSelect}
				className='mt-1 block w-full border-gray-300 rounded-md shadow-sm'>	
					{Object.keys(pyVersions).map((version, index) => (
						<option value={version} key={index}>
							{version}
						</option>
					))}
				</select>
			</div>
			}
			<div>
				<label htmlFor='envName' className='block text-sm font-medium text-gray-700'>
					Virtual environment&apos;s name
				</label>
				<input type='text' id='envName' value={envName} placeholder='What would you like to name your environment?'
				onChange={(e) => {setEnvName(e.target.value)}} className='mt-1 block w-full border-gray-300 rounded-md shadow-sm'/>
			</div>
			
			<div>
				<label htmlFor='description' className='block text-sm font-medium text-gray-700'>
					Description of virtual environment
				</label>
				<input type='text' id='description' value={description} placeholder='What will this virtual environment be used for? (optional)'
				onChange={(e) => {setDescription(e.target.value)}} 
				className='mt-1 block w-full border-gray-300 rounded-md shadow-sm'/>
			</div>

			<button type='submit' className='w-full bg-maroon text-white py-2 px-4 rounded hover:bg-pink-950 focus:outline-none'>
				Submit
			</button>
		</form>
	)
}

export default CreateVenvForm;
