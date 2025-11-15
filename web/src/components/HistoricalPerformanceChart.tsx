import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import axiosInstance from '../api/axios';
import { Loader2 } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface PerformanceDataPoint {
  date: string;
  value: number;
}

interface HistoricalPerformanceChartProps {
  currency: 'USD' | 'RMB';
}

type Period = '1M' | '3M' | '6M' | '1Y';

const HistoricalPerformanceChart: React.FC<HistoricalPerformanceChartProps> = ({ currency }) => {
  const [period, setPeriod] = useState<Period>('1M');
  const [data, setData] = useState<PerformanceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistoricalPerformance();
  }, [period, currency]);

  const fetchHistoricalPerformance = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get('/api/analytics/performance', {
        params: { period, currency },
      });
      // Backend returns { period, currency, performance: [...] }
      const performanceData = response.data.performance || [];
      setData(Array.isArray(performanceData) ? performanceData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load historical performance');
    } finally {
      setLoading(false);
    }
  };

  const periods: Period[] = ['1M', '3M', '6M', '1Y'];

  const chartData = {
    labels: data.map((point) => point.date),
    datasets: [
      {
        label: 'Portfolio Value',
        data: data.map((point) => point.value),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            const currencySymbol = currency === 'USD' ? '$' : '¥';
            return `${currencySymbol}${value.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          },
          title: (context: any) => {
            const date = new Date(context[0].label);
            return date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: period === '1M' ? 'day' : period === '3M' ? 'week' : 'month',
          displayFormats: {
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy',
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: any) => {
            const currencySymbol = currency === 'USD' ? '$' : '¥';
            return `${currencySymbol}${value.toLocaleString('en-US')}`;
          },
        },
      },
    },
  };

  return (
    <div>
      {/* Period Selector */}
      <div className="flex gap-2 mb-4">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-600">
          <p>{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No performance data available</p>
        </div>
      ) : (
        <div className="h-64">
          <Line data={chartData} options={options} />
        </div>
      )}
    </div>
  );
};

export default HistoricalPerformanceChart;
