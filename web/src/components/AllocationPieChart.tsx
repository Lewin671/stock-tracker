import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface AllocationItem {
  symbol: string;
  value: number;
  percentage: number;
}

interface AllocationPieChartProps {
  data: AllocationItem[];
}

const AllocationPieChart: React.FC<AllocationPieChartProps> = ({ data }) => {
  // Generate colors for each holding
  const colors = [
    '#3B82F6', // blue-500
    '#10B981', // green-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#14B8A6', // teal-500
    '#F97316', // orange-500
    '#6366F1', // indigo-500
    '#84CC16', // lime-500
  ];

  const chartData = {
    labels: data.map((item) => item.symbol),
    datasets: [
      {
        data: data.map((item) => item.value),
        backgroundColor: colors.slice(0, data.length),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          generateLabels: (chart: any) => {
            const datasets = chart.data.datasets;
            return chart.data.labels.map((label: string, i: number) => {
              const value = datasets[0].data[i];
              const percentage = data[i].percentage;
              return {
                text: `${label} (${percentage.toFixed(1)}%)`,
                fillStyle: datasets[0].backgroundColor[i],
                hidden: false,
                index: i,
              };
            });
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = data[context.dataIndex].percentage;
            return `${label}: ${value.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} (${percentage.toFixed(1)}%)`;
          },
        },
      },
    },
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No holdings to display</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default AllocationPieChart;
