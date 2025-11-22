import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BacktestDataPoint } from '../api/backtest';

interface BacktestChartProps {
  data: BacktestDataPoint[];
  currency: string;
}

const BacktestChart: React.FC<BacktestChartProps> = ({ data, currency }) => {
  // Sample data for better performance with large datasets
  const sampledData = useMemo(() => {
    // If data is small enough, use all points
    if (data.length <= 200) {
      return data;
    }

    // Sample data to ~200 points for better performance
    const sampleRate = Math.ceil(data.length / 200);
    const sampled: BacktestDataPoint[] = [];
    
    for (let i = 0; i < data.length; i += sampleRate) {
      sampled.push(data[i]);
    }
    
    // Always include the last point
    if (sampled[sampled.length - 1] !== data[data.length - 1]) {
      sampled.push(data[data.length - 1]);
    }
    
    return sampled;
  }, [data]);

  // Transform data for Recharts
  const chartData = useMemo(() => 
    sampledData.map((point) => ({
      date: new Date(point.date).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      portfolioReturn: point.portfolioReturn,
      benchmarkReturn: point.benchmarkReturn,
    })),
    [sampledData]
  );

  const hasBenchmark = data.some((point) => point.benchmarkReturn !== undefined);

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value: string) => {
              // Show fewer labels for better readability
              const parts = value.split('/');
              return `${parts[0]}/${parts[1]}`;
            }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value: number) => `${value.toFixed(1)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => {
              const label = name === 'portfolioReturn' ? '投资组合' : '基准指数';
              return [`${value.toFixed(2)}%`, label];
            }}
          />
          <Legend
            formatter={(value: string) => {
              if (value === 'portfolioReturn') return '投资组合收益率';
              if (value === 'benchmarkReturn') return '基准指数收益率';
              return value;
            }}
          />
          <Line
            type="monotone"
            dataKey="portfolioReturn"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            name="portfolioReturn"
          />
          {hasBenchmark && (
            <Line
              type="monotone"
              dataKey="benchmarkReturn"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="benchmarkReturn"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BacktestChart;
