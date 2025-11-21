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
  Filler,
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
  TimeScale,
  Filler
);

interface PerformanceDataPoint {
  date: string;
  value: number;
}

interface HistoricalPerformanceChartProps {
  currency: 'USD' | 'RMB';
}

type Period = '1M' | '3M' | '6M' | '1Y' | 'ALL';

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

  const periods: Period[] = ['1M', '3M', '6M', '1Y', 'ALL'];

  const chartData = {
    datasets: [
      {
        label: 'Portfolio Value',
        data: data.map((point) => ({
          x: new Date(point.date).getTime(),
          y: point.value,
        })),
        borderColor: '#3B82F6',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
          return gradient;
        },
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#3B82F6',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
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
            const timestamp = context[0].parsed.x;
            const date = new Date(timestamp);
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
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11,
          },
          callback: (value: any) => {
            const currencySymbol = currency === 'USD' ? '$' : '¥';
            return `${currencySymbol}${value.toLocaleString('en-US', {
              notation: 'compact',
              compactDisplay: 'short',
            })}`;
          },
        },
      },
    },
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg">Performance Trend</h3>
        <div className="flex bg-muted rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${period === p
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px] w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-destructive">
            <p>{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No performance data available</p>
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};

export default HistoricalPerformanceChart;
