import React, { useState } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import EnhancedPerformanceChart from '../components/EnhancedPerformanceChart';
import PerformanceMetricsGrid, { PerformanceMetrics } from '../components/PerformanceMetricsGrid';

const PerformancePage: React.FC = () => {
    const [currency, setCurrency] = useState<'USD' | 'RMB'>('USD');
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [period] = useState<string>('1M');

    const handleCurrencyChange = (value: string) => {
        if (value === 'USD' || value === 'RMB') {
            setCurrency(value);
        }
    };

    const handleMetricsLoad = (loadedMetrics: PerformanceMetrics) => {
        setMetrics(loadedMetrics);
    };

    return (
        <DashboardLayout>
            {/* Top Bar Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Performance</h2>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Currency:</span>
                    <ToggleGroup.Root
                        type="single"
                        value={currency}
                        onValueChange={handleCurrencyChange}
                        className="inline-flex bg-muted rounded-lg p-1"
                    >
                        <ToggleGroup.Item
                            value="USD"
                            className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
                        >
                            USD
                        </ToggleGroup.Item>
                        <ToggleGroup.Item
                            value="RMB"
                            className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
                        >
                            RMB
                        </ToggleGroup.Item>
                    </ToggleGroup.Root>
                </div>
            </div>

            {/* Performance Metrics Grid */}
            <PerformanceMetricsGrid 
                metrics={metrics} 
                currency={currency} 
                period={period}
                loading={!metrics}
            />

            {/* Enhanced Performance Chart */}
            <EnhancedPerformanceChart 
                currency={currency} 
                onMetricsLoad={handleMetricsLoad}
            />
        </DashboardLayout>
    );
};

export default PerformancePage;
