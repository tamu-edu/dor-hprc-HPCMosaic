import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register the required components with Chart.js
ChartJS.register(
  CategoryScale,  // Register the "category" scale
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const data = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'My First dataset',
      backgroundColor: 'rgba(255,99,132,0.2)',
      borderColor: 'rgba(255,99,132,1)',
      borderWidth: 1,
      hoverBackgroundColor: 'rgba(255,99,132,0.4)',
      hoverBorderColor: 'rgba(255,99,132,1)',
      data: [65, 59, 80, 81, 56, 55, 40]
    }
  ]
};

const BarChart = (props) => {
  return (
    <Bar
      data={data}
      options={{
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'category',  // Explicitly use the "category" scale
          },
          y: {
            beginAtZero: true,
          }
        }
      }}
    />
  );
}

export default BarChart;
