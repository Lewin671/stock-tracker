import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    change?: number;
    changeLabel?: string;
    trend?: 'up' | 'down' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    change,
    changeLabel,
    trend,
}) => {
    const isPositive = trend === 'up' || (change && change > 0);
    const isNegative = trend === 'down' || (change && change < 0);

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{title}</h3>
            </div>
            <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{value}</div>
                {(change !== undefined || changeLabel) && (
                    <div
                        className={`flex items-center text-xs font-medium ${isPositive
                                ? 'text-emerald-500'
                                : isNegative
                                    ? 'text-rose-500'
                                    : 'text-muted-foreground'
                            }`}
                    >
                        {isPositive ? (
                            <ArrowUpRight className="mr-1 h-4 w-4" />
                        ) : isNegative ? (
                            <ArrowDownRight className="mr-1 h-4 w-4" />
                        ) : null}
                        {changeLabel || `${change}%`}
                    </div>
                )}
            </div>
        </div>
    );
};
