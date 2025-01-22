import React, {useState, useEffect} from "react";

const CreateVenvForm = () => {
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
			setSelectedVersion(Object.keys(versions)[0]);
			setGccversion(versions[0]);
		} catch (error) {
			console.error(`There was an error fetching the available Python versions: ${error}`);
		}
	}

	useEffect(() => {
		fetchPyVersions();
	}, [])

	const handleSubmission() = async (e) => {
		e.preventDefault();

		// Validate that an env name was provided
		if (!envName) {
			alert("You must enter a name for the virtual environment")
			return;
		}

		const formData = {
			pyVersion: selectedPyVersion,
			GCCversion: gccversion,
			envName: envName,
			description: description
		};

		try {
			const createResponse = fetch(`${curUrl}/api/create_venv`, {
				method: 'POST',
				headers: {
					'Content-type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

		} catch (error) {
			console.error(`There has been an error while handling the venv creation form submission: ${error}`);
		}	
	}

	return (
			
	)
}

export default CreateVenvForm;
