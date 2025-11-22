import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { getGroupColors, getAssetClassIcon } from '../utils/assetClassColors';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface AllocationItem {
  symbol: string;
  name: string;
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
  // Helper function to get display name
  const getDisplayName = (item: AllocationItem) => {
    // For cash holdings, show "Cash (USD)" or "Cash (RMB)"
    if (item.symbol.startsWith('CASH_')) {
      const cashCurrency = item.symbol.replace('CASH_', '');
      return `Cash (${cashCurrency})`;
    }
    // For stocks, show name if available, otherwise fall back to symbol
    return item.name || item.symbol;
  };

  // Sort and consolidate small holdings into "Others" if there are too many
  const processedData = React.useMemo(() => {
    const OTHERS_THRESHOLD = 2.5; // Holdings below 2.5% will be grouped
    const MAX_ITEMS = 8; // Show max 8 items before grouping

    // Always sort by percentage descending (highest first)
    const sorted = [...data].sort((a, b) => b.percentage - a.percentage);

    if (sorted.length <= MAX_ITEMS) {
      return sorted;
    }

    // Take top items and group the rest
    const topItems = sorted.slice(0, MAX_ITEMS - 1);
    const smallItems = sorted.slice(MAX_ITEMS - 1);
    
    // Check if we should group small items
    const shouldGroup = smallItems.some(item => item.percentage < OTHERS_THRESHOLD) || smallItems.length > 3;
    
    if (shouldGroup && smallItems.length > 0) {
      const othersValue = smallItems.reduce((sum, item) => sum + item.value, 0);
      const othersPercentage = smallItems.reduce((sum, item) => sum + item.percentage, 0);
      
      return [
        ...topItems,
        {
          symbol: 'OTHERS',
          name: `Others (${smallItems.length} holdings)`,
          value: othersValue,
          percentage: othersPercentage,
        }
      ];
    }
    
    return sorted;
  }, [data]);

  // Generate colors based on grouping mode
  const colors = getGroupColors(
    processedData.map(item => item.symbol),
    groupingMode
  );

  const chartData = {
    labels: processedData.map((item) => getDisplayName(item)),
    datasets: [
      {
        data: processedData.map((item) => item.value),
        backgroundColor: colors.slice(0, processedData.length),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Disable default legend, we'll create a custom one
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
            const item = processedData[context.dataIndex];
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = item.percentage;
            const icon = groupingMode === 'assetClass' ? `${getAssetClassIcon(item.symbol)} ` : '';
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
    <div className="w-full h-full flex flex-col gap-4">
      {/* Pie Chart */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="w-full max-w-[280px] aspect-square">
          <Pie data={chartData} options={options} />
        </div>
      </div>
      
      {/* Custom Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {processedData.map((item, index) => {
          const displayName = getDisplayName(item);
          const icon = groupingMode === 'assetClass' ? `${getAssetClassIcon(item.symbol)} ` : '';
          
          return (
            <div key={index} className="flex items-center gap-2 min-w-0">
              <div 
                className="w-3 h-3 rounded-sm flex-shrink-0" 
                style={{ backgroundColor: colors[index] }}
              />
              <span className="text-gray-300 truncate" title={`${displayName} (${item.percentage.toFixed(1)}%)`}>
                {icon}{displayName} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AllocationPieChart;
