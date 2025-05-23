"use client"

import Filters from "@/components/filters"
import { LIMIT_STORAGE_KEY, limitOptions } from "@/components/filters/limit-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SelectedBotsButton, useSelectedBots } from "@/contexts/selected-bots-context"
import { useBotStats } from "@/hooks/use-bot-stats"
import { chartColors } from "@/lib/chart-colors"
import { genericError } from "@/lib/errors"
import { updateSearchParams, validateDateRange, validateFilterValues } from "@/lib/search-params"
import type { FilterState, FormattedBotData } from "@/lib/types"
import { formatNumber, formatPercentage, statusColors } from "@/lib/utils"
import { ExternalLink, Loader2, RefreshCw } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import type { DateValueType } from "react-tailwindcss-datepicker"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { BotErrorTimeline } from "./bot-error-timeline"
import { BotLogsTable } from "./bot-logs-table"

export const DEFAULT_LIMIT = limitOptions[0].value

// Helper function to format a date in a human-readable format (May 1, 2024)
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

interface CompactDashboardProps {
    selectedErrorCategories: string[];
    setSelectedErrorCategories: (categories: string[]) => void;
    allBots?: FormattedBotData[]; // All bots data for generating dynamic error categories
}

// Add a deterministic color assignment for error types/messages
function getColorForKey(key: string, palette: string[]): string {
    // Simple hash function to assign a color index
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) % palette.length;
    }
    return palette[Math.abs(hash) % palette.length];
}

export function CompactDashboard() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { selectedBots, toggleBotSelection, selectBotsByCategory, setHoveredBots, hoveredBots, generateLogsUrl } = useSelectedBots()

    // Add distinct colors for charts
    const distinctColors = [
        "#0EA5E9", // Sky blue
        "#F97316", // Orange
        "#14B8A6", // Teal
        "#A855F7", // Purple
        "#EC4899", // Pink
        "#EAB308", // Yellow
        "#22C55E", // Green
        "#EF4444", // Red
        "#8B5CF6", // Violet
        "#06B6D4"  // Cyan
    ];

    // Platform-specific colors
    const platformColors = {
        "zoom": "#0E71EB",    // Zoom blue
        "teams": "#6264A7",   // Teams purple
        "google meet": "#00AC47", // Google Meet green
        "unknown": "#64748B"  // Slate gray for unknown
    };

    // Pagination state
    const [offset, setOffset] = useState(0)
    const [limit, setLimit] = useState(() => {
        // Initialize from localStorage if available, otherwise use default
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(LIMIT_STORAGE_KEY)
            return stored && limitOptions.some((option) => option.value === Number(stored))
                ? Number(stored)
                : DEFAULT_LIMIT
        }
        return DEFAULT_LIMIT
    })

    // Initialize date range from URL params or default to last 14 days
    const [dateRange, setDateRange] = useState<DateValueType>(() =>
        validateDateRange(searchParams.get("startDate"), searchParams.get("endDate"))
    )

    // Initialize filters from URL params or empty arrays
    const [filters, setFilters] = useState<FilterState>(() =>
        validateFilterValues(
            searchParams.get("platformFilters"),
            searchParams.get("statusFilters"),
            searchParams.get("userReportedErrorStatusFilters"),
            searchParams.get("errorCategoryFilters"),
            searchParams.get("errorPriorityFilters")
        )
    )

    // Tab state for the main dashboard view
    const [activeTab, setActiveTab] = useState("overview")

    // Update URL when date range or filters change
    useEffect(() => {
        const params = updateSearchParams(searchParams, dateRange, filters)
        router.replace(`?${params.toString()}`, { scroll: false })
    }, [dateRange, filters, router, searchParams])

    // Helper to determine if user has explicitly filtered by error category
    // const userHasFilteredByErrorCategory = filters.errorCategoryFilters && filters.errorCategoryFilters.length > 0 && filters.errorCategoryFilters !== selectedErrorCategories;

    // When calling useBotStats, use ALL filters including errorCategoryFilters:
    const { data, isLoading, isError, error, isRefetching } = useBotStats({
        offset: offset * limit,
        limit,
        startDate: dateRange?.startDate ?? null,
        endDate: dateRange?.endDate ?? null,
        filters
    })

    // Manual refresh handler
    const handleRefresh = () => {
        // Trigger a refetch by toggling a filter and then toggling it back
        const currentFilters = { ...filters };
        setFilters({ ...filters, statusFilters: [] });
        setTimeout(() => setFilters(currentFilters), 10);
    };

    // Calculate change between last two days for trend indicators
    const calculateTrend = () => {
        if (!data || data.dailyStats.length < 2) return { percentage: 0, isPositive: true }

        const lastDay = data.dailyStats[data.dailyStats.length - 1]
        const previousDay = data.dailyStats[data.dailyStats.length - 2]

        const change = lastDay.totalBots - previousDay.totalBots
        const percentage = (change / previousDay.totalBots) * 100

        return {
            percentage: Math.abs(percentage),
            isPositive: change >= 0
        }
    }

    const trend = calculateTrend()

    // KISS: Simple error calculation - focus on unknown errors as the real problems
    const getTotalBots = () => data?.allBots.length || 0;
    const getSuccessfulBots = () => data?.successfulBots.length || 0;

    // Key change: Error calculation focuses on unknown errors (the real problems)
    const getUnknownErrorBots = () => {
        if (!data) return 0;
        return data.errorBots.filter(bot =>
            bot.status.category === 'unknown_error' ||
            !bot.status.category ||
            bot.status.category === 'system_error'
        ).length;
    };

    const getAllErrorBots = () => data?.errorBots.length || 0;

    const getSuccessRate = () => {
        const total = getTotalBots();
        return total ? (getSuccessfulBots() / total) * 100 : 0;
    };

    // Main error rate focuses on unknown/problematic errors
    const getProblemErrorRate = () => {
        const total = getTotalBots();
        return total ? (getUnknownErrorBots() / total) * 100 : 0;
    };

    // Total error rate for reference
    const getTotalErrorRate = () => {
        const total = getTotalBots();
        return total ? (getAllErrorBots() / total) * 100 : 0;
    };

    // This function only determines which errors to show in the pie chart
    // It doesn't affect the actual data filtering for the dashboard
    const getVisibleErrorBots = () => {
        if (!data) return [];
        return data.errorBots; // Return all error bots for simplicity
    };

    // Error rate should be based on the total data, not the visible slices
    const getErrorRate = () => {
        const total = getTotalBots();
        return total ? (getAllErrorBots() / total) * 100 : 0;
    };

    // Define notable error patterns that should be highlighted
    const notableErrorPatterns = [
        "meeting ended before",
        "could not participate",
        "bot was removed",
        "timed out",
        "permission denied"
    ];

    // Function to determine if an error message should be highlighted
    const shouldHighlightError = (message: string, priority?: string, category?: string) => {
        // Check for high priority errors
        if (priority === "high" || priority === "critical") return true;

        // Check for notable errors by pattern
        if (message && typeof message === 'string') {
            return notableErrorPatterns.some(pattern =>
                message.toLowerCase().includes(pattern.toLowerCase())
            );
        }

        return false;
    };

    // Get color for error message based on priority or pattern
    const getErrorMessageColor = (message: string, priority?: string, category?: string) => {
        if (priority === "critical") return "text-red-600";
        if (priority === "high") return "text-amber-600";

        // Check for notable patterns even if priority is not high/critical
        if (message && typeof message === 'string' &&
            notableErrorPatterns.some(pattern =>
                message.toLowerCase().includes(pattern.toLowerCase())
            )) {
            return "text-amber-600";
        }

        return "";
    };

    // For userReported status, handle undefined/missing properties
    const getReportStatus = (bot: any, field: string, defaultValue: any = null) => {
        return bot[field] !== undefined ? bot[field] : defaultValue;
    };

    const getReportsByDate = (day: any, field: string, defaultValue: number = 0) => {
        return day[field] !== undefined ? day[field] : defaultValue;
    };

    // Prepare error slices: decompose unknown_error into unique messages
    const errorSlices = useMemo(() => {
        if (!data) return [];
        const slices: { name: string; value: number; color: string; key: string; category: string; faded: boolean }[] = [];
        const colorPool = Object.keys(chartColors).filter(k => k.startsWith('chart')).map(k => chartColors[k as keyof typeof chartColors]);

        // Group unknown_error by message
        const unknownGroups: Record<string, number> = {};
        data.errorBots.forEach(bot => {
            if (bot.status.category === 'unknown_error') {
                const msg = bot.status?.message ?? 'Unknown error';
                unknownGroups[msg] = (unknownGroups[msg] || 0) + 1;
            }
        });
        Object.entries(unknownGroups).forEach(([msg, count]) => {
            const key = `unknown_error:${msg}`;
            slices.push({
                name: msg,
                value: count,
                color: getColorForKey(key, colorPool),
                key,
                category: 'unknown_error',
                faded: false // Simplified - no fading
            });
        });

        // Add all other error types (not unknown_error)
        data.errorTypes.forEach((error) => {
            if (error.category !== 'unknown_error') {
                const type = error.type ?? '';
                const category = error.category ?? '';
                const key = category;
                slices.push({
                    name: type || category,
                    value: error.count,
                    color: getColorForKey(key, colorPool),
                    key,
                    category,
                    faded: false // Simplified - no fading
                });
            }
        });
        return slices;
    }, [data]); // Simplified - removed selectedErrorCategories dependency

    return (
        <div className="relative space-y-4">
            {/* Header with filters */}
            <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Meeting Bot Analytics</h1>
                        <p className="text-sm text-muted-foreground">
                            Monitor performance across {data?.platformDistribution.length || 0} platforms
                        </p>
                    </div>

                    {data && (
                        <div className="hidden items-center gap-2 md:flex">
                            <div className="flex items-center gap-1 rounded-md bg-background/60 px-2 py-1 text-sm">
                                <span className="text-muted-foreground">Total Bots:</span>
                                <span className="font-medium">{formatNumber(getTotalBots())}</span>
                            </div>
                            <div className="flex items-center gap-1 rounded-md bg-background/60 px-2 py-1 text-sm">
                                <span className="text-muted-foreground">Success Rate:</span>
                                <span className="font-medium text-success">
                                    {formatPercentage(getSuccessRate())}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 rounded-md bg-background/60 px-2 py-1 text-sm">
                                <span className="text-muted-foreground">Error Rate:</span>
                                <span className="font-medium text-destructive">
                                    {formatPercentage(getErrorRate())}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 rounded-md bg-background/60 px-2 py-1 text-sm">
                                <span className="text-muted-foreground">Problem Errors:</span>
                                <span className="font-medium text-destructive">
                                    {formatPercentage(getProblemErrorRate())}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters component with selected bots button */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex-grow">
                    <Filters
                        filters={filters}
                        setFilters={setFilters}
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        limit={limit}
                        setLimit={setLimit}
                        isRefetching={isRefetching}
                    />
                </div>

                <div className="flex items-center gap-2">
                    {/* Selected bots button - inline version */}
                    <Button
                        variant={selectedBots.length > 0 ? "default" : "outline"}
                        size="sm"
                        className={`flex items-center gap-1 min-w-[180px] h-10 ${selectedBots.length > 0 ? "" : "text-muted-foreground"}`}
                        onClick={() => window.open(generateLogsUrl(dateRange?.startDate ?? null, dateRange?.endDate ?? null), '_blank')}
                    >
                        <span className="font-semibold">
                            {selectedBots.length > 0
                                ? `${selectedBots.length} ${selectedBots.length === 1 ? 'Bot' : 'Bots'}`
                                : "View All Logs"}
                        </span>
                        <ExternalLink className="h-4 w-4 ml-1" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefetching}
                        className="h-10 w-10"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Loading and error states */}
            {isLoading && !data ? (
                <div className="flex h-80 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : isError ? (
                <div className="flex h-80 items-center justify-center text-destructive">
                    Error: {error instanceof Error ? error.message : genericError}
                </div>
            ) : !data ? (
                <div className="flex h-80 items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                        No data found. Try adjusting your filters.
                    </p>
                </div>
            ) : (
                <>
                    {/* Summary section - key metrics */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 mb-4">
                        <Card className="bg-primary/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold">{formatNumber(getTotalBots())}</span>
                                    <span className="text-sm text-muted-foreground">Total Bots</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-success/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold" style={{ color: statusColors.success }}>{formatNumber(getSuccessfulBots())}</span>
                                    <span className="text-sm text-muted-foreground">Successful ({formatPercentage(getSuccessRate())})</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-warning/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold" style={{ color: statusColors.warning }}>{formatNumber(getUnknownErrorBots())}</span>
                                    <span className="text-sm text-muted-foreground">Problem Errors ({formatPercentage(getProblemErrorRate())})</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-destructive/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold" style={{ color: statusColors.error }}>{formatNumber(getAllErrorBots())}</span>
                                    <span className="text-sm text-muted-foreground">All Errors ({formatPercentage(getErrorRate())})</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-secondary/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold">{data.dailyStats[data.dailyStats.length - 1]?.totalBots || 0}</span>
                                        <span className="text-xs" style={{ color: trend.isPositive ? statusColors.success : statusColors.error }}>
                                            {trend.isPositive ? "↑" : "↓"} {formatPercentage(trend.percentage)}
                                        </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">Most Recent Day</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main dashboard tabs - simplified to focus on error analysis */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="errors">Error Analysis</TabsTrigger>
                            <TabsTrigger value="duration">Duration</TabsTrigger>
                            <TabsTrigger value="userReported">Issue Reports</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab - Simplified */}
                        <TabsContent value="overview" className="space-y-4">
                            {/* Single comprehensive chart section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Main Error Distribution */}
                                <Card className="lg:col-span-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle>Error Distribution</CardTitle>
                                        <CardDescription>
                                            <div className="flex justify-between items-center">
                                                <span>All error types in your data</span>
                                                <span className="font-medium text-destructive">{formatNumber(getAllErrorBots())}</span>
                                            </div>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[400px] flex items-center justify-center">
                                        <div className="w-full h-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={errorSlices}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={120}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        stroke="#1e1e22"
                                                        strokeWidth={2}
                                                        onClick={(entry, index) => {
                                                            // Select bots with this error type for detailed view
                                                            const errorCategory = errorSlices[index].category;
                                                            const matchingBots = data.errorBots.filter(bot =>
                                                                bot.status.category === errorCategory
                                                            );
                                                            selectBotsByCategory(matchingBots);
                                                        }}
                                                        onMouseEnter={(entry, index) => {
                                                            const errorCategory = errorSlices[index].category;
                                                            const matchingBots = data.errorBots.filter(bot =>
                                                                bot.status.category === errorCategory
                                                            );
                                                            setHoveredBots(matchingBots);
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredBots([]);
                                                        }}
                                                    >
                                                        {errorSlices.map((slice, idx) => (
                                                            <Cell
                                                                key={`cell-${idx}`}
                                                                fill={slice.color}
                                                                style={{ cursor: 'pointer' }}
                                                                stroke="#1e1e22"
                                                                strokeWidth={1}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value, name) => {
                                                            const numValue = Number(value);
                                                            if (!isNaN(numValue)) {
                                                                const totalErrorBots = getAllErrorBots();
                                                                const percentage = totalErrorBots > 0 ? (numValue / totalErrorBots) * 100 : 0;
                                                                return [
                                                                    <div className="flex flex-col text-white">
                                                                        <span className="font-medium text-white">{formatNumber(numValue)} bots</span>
                                                                        <span className="text-xs text-white opacity-90">{percentage.toFixed(1)}% of errors</span>
                                                                    </div>,
                                                                    name
                                                                ];
                                                            }
                                                            return [String(value), name];
                                                        }}
                                                        contentStyle={{
                                                            backgroundColor: 'var(--popover)',
                                                            borderColor: 'var(--border)',
                                                            color: 'var(--popover-foreground)',
                                                            borderRadius: '8px',
                                                            padding: '8px 12px',
                                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                                            zIndex: 1000
                                                        }}
                                                        itemStyle={{ color: 'var(--popover-foreground)' }}
                                                        wrapperStyle={{ zIndex: 1000 }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            {/* Center overlay with key metrics */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <div className="flex flex-col items-center justify-center bg-background rounded-full w-[90px] h-[90px] shadow-lg border border-border">
                                                    <span className="text-lg font-bold text-destructive">{formatPercentage(getErrorRate())}</span>
                                                    <span className="text-[10px] text-muted-foreground">Error Rate</span>
                                                    <span className="text-xs font-medium">{formatNumber(getAllErrorBots())}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Platform Performance */}
                                <Card className="lg:col-span-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle>Platform Performance</CardTitle>
                                        <CardDescription>
                                            Success rates across {Object.keys(platformColors).length} platforms
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[400px]">
                                        {(() => {
                                            const platformStats = Object.keys(platformColors).map((platform, index) => {
                                                const platformBots = data.allBots.filter(bot => bot.platform === platform);
                                                const platformErrors = data.errorBots.filter(bot => bot.platform === platform);
                                                const successCount = platformBots.length - platformErrors.length;
                                                const successRate = platformBots.length > 0 ? (successCount / platformBots.length) * 100 : 0;
                                                const color = chartColors[`chart${(index % 10) + 1}` as keyof typeof chartColors];

                                                return {
                                                    platform,
                                                    total: platformBots.length,
                                                    errors: platformErrors.length,
                                                    success: successCount,
                                                    successRate,
                                                    color
                                                };
                                            }).filter(stat => stat.total > 0);

                                            return (
                                                <div className="grid grid-cols-1 gap-6 h-full">
                                                    {platformStats.map((stat) => (
                                                        <div
                                                            key={stat.platform}
                                                            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/20 cursor-pointer transition-colors"
                                                            onClick={() => {
                                                                const platformBots = data.allBots.filter(bot => bot.platform === stat.platform);
                                                                selectBotsByCategory(platformBots);
                                                            }}
                                                            onMouseEnter={() => {
                                                                const platformBots = data.allBots.filter(bot => bot.platform === stat.platform);
                                                                setHoveredBots(platformBots);
                                                            }}
                                                            onMouseLeave={() => setHoveredBots([])}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="w-4 h-4 rounded-full"
                                                                    style={{ backgroundColor: stat.color }}
                                                                />
                                                                <div>
                                                                    <h3 className="font-medium capitalize">{stat.platform}</h3>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {formatNumber(stat.total)} total bots
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-lg font-bold" style={{ color: statusColors.success }}>
                                                                    {formatPercentage(stat.successRate)}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {formatNumber(stat.errors)} errors
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Error Analysis Tab - Simplified */}
                        <TabsContent value="errors" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Problem Errors ({formatNumber(getUnknownErrorBots())} unknown/critical)</CardTitle>
                                    <CardDescription>
                                        Focus on unknown and critical errors that need investigation
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-auto max-h-[600px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableCell>Error Type</TableCell>
                                                    <TableCell>Message</TableCell>
                                                    <TableCell>Platform</TableCell>
                                                    <TableCell className="text-right">Count</TableCell>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(() => {
                                                    // Focus on unknown/problem errors
                                                    const problemBots = data.errorBots.filter(bot =>
                                                        bot.status.category === 'unknown_error' ||
                                                        !bot.status.category ||
                                                        bot.status.category === 'system_error'
                                                    );

                                                    // Simple error grouping by type and message
                                                    const errorGroups = new Map<string, {
                                                        type: string;
                                                        message: string;
                                                        count: number;
                                                        platforms: Record<string, number>;
                                                        originalErrors: any[];
                                                    }>();

                                                    problemBots.forEach(bot => {
                                                        const key = `${bot.status.value}-${bot.status.details}`;
                                                        if (!errorGroups.has(key)) {
                                                            errorGroups.set(key, {
                                                                type: bot.status.value || 'Unknown',
                                                                message: bot.status.details || 'No details available',
                                                                count: 0,
                                                                platforms: {},
                                                                originalErrors: []
                                                            });
                                                        }
                                                        const group = errorGroups.get(key)!;
                                                        group.count += 1;
                                                        group.platforms[bot.platform] = (group.platforms[bot.platform] || 0) + 1;
                                                        group.originalErrors.push(bot);
                                                    });

                                                    const sortedGroups = Array.from(errorGroups.values()).sort((a, b) => b.count - a.count);

                                                    return sortedGroups.map((group, idx) => (
                                                        <TableRow
                                                            key={`${group.type}-${idx}`}
                                                            className="cursor-pointer hover:bg-muted/50"
                                                            onClick={() => selectBotsByCategory(group.originalErrors)}
                                                        >
                                                            <TableCell className="font-medium">{group.type}</TableCell>
                                                            <TableCell className="max-w-[400px] truncate">{group.message}</TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {Object.entries(group.platforms).map(([platform, count]) => (
                                                                        <span
                                                                            key={platform}
                                                                            className="px-2 py-0.5 text-xs rounded-full bg-primary/10"
                                                                        >
                                                                            {platform}: {count}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">{group.count}</TableCell>
                                                        </TableRow>
                                                    ));
                                                })()}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            {data && data.errorsByDate && data.errorsByDate.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Error Timeline</CardTitle>
                                        <CardDescription>
                                            Error trends over time
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <BotErrorTimeline
                                            dailyStats={data.dailyStats}
                                            errorsByDate={data.errorsByDate}
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        {/* Duration Tab - placeholder */}
                        <TabsContent value="duration" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Duration Analysis</CardTitle>
                                    <CardDescription>
                                        Bot duration metrics and trends
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 text-center text-muted-foreground">
                                    Duration analysis coming soon...
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Issue Reports Tab - placeholder */}
                        <TabsContent value="userReported" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Issue Reports</CardTitle>
                                    <CardDescription>
                                        User-reported issues and their status
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 text-center text-muted-foreground">
                                    Issue reports functionality coming soon...
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}

            {/* Error logs table */}
            {data && (
                <BotLogsTable
                    bots={data.allBots}
                    dateRange={{
                        startDate: dateRange?.startDate ?? null,
                        endDate: dateRange?.endDate ?? null
                    }}
                    onBotSelect={toggleBotSelection}
                />
            )}

            {/* Floating UI for selected bots - keep this for detailed view */}
            <SelectedBotsButton
                dateRange={{
                    startDate: dateRange?.startDate ?? null,
                    endDate: dateRange?.endDate ?? null
                }}
            />
        </div>
    )
}