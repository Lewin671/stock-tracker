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
import * as ToggleGroup from '@radix-ui/react-toggle-group';

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
  percentageReturn: number;
  dayChange: number;
  dayChangePercent: number;
}

interface DrawdownMetric {
  percentage: number;
  absolute: number;
  peakDate: string;
  troughDate: string;
  peakValue: number;
  troughValue: number;
}

interface EnhancedPerformanceChartProps {
  currency: 'USD' | 'RMB';
  onMetricsLoad?: (metrics: any) => void;
}

type Period = '1M' | '3M' | '6M' | '1Y' | 'ALL';
type ViewMode = 'absolute' | 'percentage';
type ChartMode = 'value' | 'percentage' | 'both';

const EnhancedPerformanceChart: React.FC<EnhancedPerformanceChartProps> = ({ 
  currency,
  onMetricsLoad 
}) => {
  const [period, setPeriod] = useState<Period>('1M');
  const [viewMode, setViewMode] = useState<ViewMode>('absolute');
  const [chartMode, setChartMode] = useState<ChartMode>('value');
  const [data, setData] = useState<PerformanceDataPoint[]>([]);
  const [, setDrawdown] = useState<DrawdownMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('performanceViewMode') as ViewMode;
    const savedChartMode = localStorage.getItem('performanceChartMode') as ChartMode;
    if (savedViewMode) setViewMode(savedViewMode);
    if (savedChartMode) setChartMode(savedChartMode);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('performanceViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('performanceChartMode', chartMode);
  }, [chartMode]);

  useEffect(() => {
    fetchHistoricalPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, currency]);

  const fetchHistoricalPerformance = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get('/api/analytics/performance', {
        params: { period, currency },
      });
      
      const performanceData = response.data.performance || [];
      const metrics = response.data.metrics;
      
      setData(Array.isArray(performanceData) ? performanceData : []);
      
      if (metrics && metrics.maxDrawdown) {
        setDrawdown(metrics.maxDrawdown);
      }
      
      // Notify parent component of metrics
      if (onMetricsLoad && metrics) {
        onMetricsLoad(metrics);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load historical performance');
    } finally {
      setLoading(false);
    }
  };

  const periods: Period[] = ['1M', '3M', '6M', '1Y', 'ALL'];

  // Determine if performance is positive or negative
  const isPositivePerformance = data.length > 0 && data[data.length - 1].value >= data[0].value;
  const positiveColor = '#10B981'; // green
  const negativeColor = '#EF4444'; // red
  const neutralColor = '#3B82F6'; // blue
  const lineColor = isPositivePerformance ? positiveColor : negativeColor;

  // Prepare chart data based on view mode and chart mode
  const getChartData = () => {
    const datasets: any[] = [];

    if (chartMode === 'value' || chartMode === 'both') {
      datasets.push({
        label: 'Portfolio Value',
        data: data.map((point) => ({
          x: new Date(point.date).getTime(),
          y: viewMode === 'absolute' ? point.value : point.percentageReturn,
        })),
        borderColor: lineColor,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, `${lineColor}4D`); // 30% opacity
          gradient.addColorStop(1, `${lineColor}00`); // 0% opacity
          return gradient;
        },
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: lineColor,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        yAxisID: 'y-value',
      });
    }

    if (chartMode === 'percentage' || chartMode === 'both') {
      const percentageColor = chartMode === 'both' ? neutralColor : lineColor;
      datasets.push({
        label: 'Return %',
        data: data.map((point) => ({
          x: new Date(point.date).getTime(),
          y: point.percentageReturn,
        })),
        borderColor: percentageColor,
        backgroundColor: chartMode === 'both' ? 'transparent' : (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, `${percentageColor}4D`);
          gradient.addColorStop(1, `${percentageColor}00`);
          return gradient;
        },
        borderWidth: 2,
        fill: chartMode !== 'both',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: percentageColor,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        yAxisID: 'y-percentage',
      });
    }

    return { datasets };
  };

  const chartData = getChartData();

  const currencySymbol = currency === 'USD' ? '$' : '¥';

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: chartMode === 'both',
        position: 'top' as const,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
        displayColors: chartMode === 'both',
        callbacks: {
          label: (context: any) => {
            const datasetLabel = context.dataset.label;
            const value = context.parsed.y;
            
            if (datasetLabel === 'Portfolio Value') {
              if (viewMode === 'absolute') {
                return `${currencySymbol}${value.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
              } else {
                return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
              }
            } else {
              return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
            }
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
      'y-value': {
        display: chartMode === 'value' || chartMode === 'both',
        position: 'left' as const,
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
            if (viewMode === 'absolute') {
              return `${currencySymbol}${value.toLocaleString('en-US', {
                notation: 'compact',
                compactDisplay: 'short',
              })}`;
            } else {
              return `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
            }
          },
        },
      },
      'y-percentage': {
        display: chartMode === 'percentage' || chartMode === 'both',
        position: chartMode === 'both' ? 'right' as const : 'left' as const,
        beginAtZero: false,
        grid: {
          display: chartMode !== 'both',
          color: 'rgba(156, 163, 175, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11,
          },
          callback: (value: any) => {
            return `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
          },
        },
      },
    },
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-lg">Performance Trend</h3>
          
          {/* View Mode Toggle */}
          <ToggleGroup.Root
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="inline-flex bg-muted rounded-lg p-1"
          >
            <ToggleGroup.Item
              value="absolute"
              className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
            >
              Value
            </ToggleGroup.Item>
            <ToggleGroup.Item
              value="percentage"
              className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
            >
              %
            </ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>

        <div className="flex items-center gap-4">
          {/* Chart Mode Toggle */}
          <ToggleGroup.Root
            type="single"
            value={chartMode}
            onValueChange={(value) => value && setChartMode(value as ChartMode)}
            className="inline-flex bg-muted rounded-lg p-1"
          >
            <ToggleGroup.Item
              value="value"
              className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
            >
              Value
            </ToggleGroup.Item>
            <ToggleGroup.Item
              value="percentage"
              className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
            >
              %
            </ToggleGroup.Item>
            <ToggleGroup.Item
              value="both"
              className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
            >
              Both
            </ToggleGroup.Item>
          </ToggleGroup.Root>

          {/* Period Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  period === p
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[400px] w-full">
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

export default EnhancedPerformanceChart;
