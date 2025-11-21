import React, { useState } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import HistoricalPerformanceChart from '../components/HistoricalPerformanceChart';
import { MetricCard } from '../components/ui/MetricCard';

const PerformancePage: React.FC = () => {
    const [currency, setCurrency] = useState<'USD' | 'RMB'>('USD');

    const handleCurrencyChange = (value: string) => {
        if (value === 'USD' || value === 'RMB') {
            setCurrency(value);
        }
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

            {/* Performance Chart */}
            <div className="space-y-6">
                <HistoricalPerformanceChart currency={currency} />

                {/* Additional metrics can be added here in the future */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="font-semibold text-lg mb-4">Performance Analytics</h3>
                    <p className="text-muted-foreground text-sm">
                        Detailed performance analytics and insights will be displayed here.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default PerformancePage;
