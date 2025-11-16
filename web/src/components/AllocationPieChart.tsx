import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { getGroupColors, getAssetClassIcon } from '../utils/assetClassColors';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface AllocationItem {
  symbol: string;
  value: number;
  percentage: number;
}

interface AllocationPieChartProps {
  data: AllocationItem[];
  groupingMode?: 'assetStyle' | 'assetClass' | 'currency' | 'none';
  currency?: string;
}

const AllocationPieChart: React.FC<AllocationPieChartProps> = ({ 
  data, 
  groupingMode = 'none',
  currency = 'USD'
}) => {
  // Generate colors based on grouping mode
  const colors = getGroupColors(
    data.map(item => item.symbol),
    groupingMode
  );

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
          color: '#e5e7eb',
          generateLabels: (chart: any) => {
            const datasets = chart.data.datasets;
            return chart.data.labels.map((label: string, i: number) => {
              const percentage = data[i].percentage;
              // Add icon for Asset Class grouping
              const icon = groupingMode === 'assetClass' ? `${getAssetClassIcon(label)} ` : '';
              return {
                text: `${icon}${label} (${percentage.toFixed(1)}%)`,
                fillStyle: datasets[0].backgroundColor[i],
                fontColor: '#e5e7eb',
                hidden: false,
                index: i,
              };
            });
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = data[context.dataIndex].percentage;
            const icon = groupingMode === 'assetClass' ? `${getAssetClassIcon(label)} ` : '';
            const formattedValue = value.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            return `${icon}${label}: ${currency === 'RMB' ? '¥' : '$'}${formattedValue} (${percentage.toFixed(1)}%)`;
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
