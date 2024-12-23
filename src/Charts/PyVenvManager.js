import React, {useState, useEffect} from 'react'

const PyVenvManager = () => {
  
  const [envData, setEnvData] = useState(null);
  const [envKeys, setEnvKeys] = useState(null);

  const prodUrl = `${window.location.origin}/pun/sys/dor-hprc-web-tamudashboard-reu-branch`;
  const devUrl = `https://portal-grace.hprc.tamu.edu/pun/dev/gabriel-react-dashboard`;
  
  useEffect(() => {
  	const fetchEnvs = async () => {
		try{
			envResponse = await fetch(`${devUrl}/api/get_env`);
			if (!envResponse.ok) {
				throw new Error(`envResponse had an HTTP error status: ${envResponse.status}`)
			}
			console.log(envResponse);
			envJson = await envResponse.json();

			setEnvData(envJson.environments);
			setEnvKeys(Object.keys(envJson.environments[0]));
		} catch(error) {
			console.error(`Error fetching environment data: ${error}`);
		}
	};
	console.log(baseUrl);
	fetchEnvs();
  }, []);

  return (
    <div>
      {!envData && 
	  <div>
	  	<h3> Loading... </h3>
	  </div>
	  }
	  {envData && 
	  <div>
		<table className="table-auto">
			<thead>
				<tr>
					{envKeys.map((column, index) => (
						<th key={index}> {column} </th>
					))}
				</tr>
			</thead>
			<tbody>
				{envData.map((env) => (
					<tr key={env.name}>
						<td>{env.name}</td>
						<td>{env.python_version}</td>
						<td>{env.GCCcore_version}</td>
						<td>{env.description}</td>
					</tr>
				))}
			</tbody>
		</table>
	  </div>
	  }
    </div>
  )
}

export default PyVenvManager
