import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register the necessary chart elements
ChartJS.register(ArcElement, Tooltip, Legend);

const data = {
	labels: [
		'Red',
		'Blue',
		'Yellow'
	],
	datasets: [{
		data: [300, 50, 100],
		backgroundColor: [
			'#FF6384',
			'#36A2EB',
			'#FFCE56'
		],
		hoverBackgroundColor: [
			'#FF6384',
			'#36A2EB',
			'#FFCE56'
		]
	}]
};

const PieChart = (props) => {
	return (
		<Pie data={data} options={{ maintainAspectRatio: false }} />
	);
}

export default PieChart;
