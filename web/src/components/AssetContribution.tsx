import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AssetContribution as AssetContributionType } from '../api/backtest';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface AssetContributionProps {
  contributions: AssetContributionType[];
  currency: string;
}

const AssetContribution: React.FC<AssetContributionProps> = ({ contributions, currency }) => {
  // Transform data for Recharts
  const chartData = contributions.map((contrib) => ({
    symbol: contrib.symbol,
    name: contrib.name || contrib.symbol,
    contribution: contrib.contribution,
    contributionPercent: contrib.contributionPercent,
    weight: contrib.weight,
    returnPercent: contrib.returnPercent,
  }));

  // Color based on positive/negative contribution
  const getBarColor = (value: number) => {
    return value >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';
  };

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 5,
              right: 30,
              left: 100,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value: number) => formatCurrency(value, currency)}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string, props: any) => {
                const data = props?.payload || {};
                return [
                  <div key="tooltip" className="space-y-1">
                    <div>贡献: {formatCurrency(value, currency)}</div>
                    <div>权重: {formatPercentage(data.weight || 0)}</div>
                    <div>收益率: {formatPercentage(data.returnPercent || 0)}</div>
                  </div>,
                  data.name || name,
                ];
              }}
            />
            <Bar dataKey="contribution" name="贡献">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.contribution)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-4 font-medium text-muted-foreground">资产</th>
              <th className="text-right py-2 px-4 font-medium text-muted-foreground">权重</th>
              <th className="text-right py-2 px-4 font-medium text-muted-foreground">收益率</th>
              <th className="text-right py-2 px-4 font-medium text-muted-foreground">贡献</th>
              <th className="text-right py-2 px-4 font-medium text-muted-foreground">贡献占比</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map((contrib, index) => (
              <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                <td className="py-2 px-4">
                  <div>
                    <div className="font-medium">{contrib.symbol}</div>
                    {contrib.name && (
                      <div className="text-xs text-muted-foreground">{contrib.name}</div>
                    )}
                  </div>
                </td>
                <td className="text-right py-2 px-4">{formatPercentage(contrib.weight)}</td>
                <td
                  className={`text-right py-2 px-4 ${
                    contrib.returnPercent >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatPercentage(contrib.returnPercent)}
                </td>
                <td
                  className={`text-right py-2 px-4 font-medium ${
                    contrib.contribution >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(contrib.contribution, currency)}
                </td>
                <td
                  className={`text-right py-2 px-4 ${
                    contrib.contributionPercent >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatPercentage(contrib.contributionPercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssetContribution;
