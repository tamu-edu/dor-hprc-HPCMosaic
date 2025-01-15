import React, {useState, useEffect} from "react";

const CreateVenvForm = () => {
	const [pyVersions, setPyVersions] = useState(null);
	const [selectedPyVersion, setSelectedPyVersion] = useState(null);
	const [description, setDescription] = useState('');
	const [envName, setEnvName] = useState(null);

	const fetchPyVersions = () => {
		try {
		
		} catch (error) {
			console.error(`There was an error fetching the available Python versions: ${error}`);
		}
	}
}

export default CreateVenvForm;
