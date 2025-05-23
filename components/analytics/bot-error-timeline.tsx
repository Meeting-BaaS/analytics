"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DailyStats, ErrorCategory } from "@/lib/types"
import { formatNumber } from "@/lib/utils"
import dayjs from "dayjs"
import { useMemo, useState } from "react"
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts"

interface ErrorTimelineProps {
    dailyStats: DailyStats[]
    errorsByDate: {
        date: string;
        totalErrors: number;
        errorsByCategory: Record<ErrorCategory, number>;
        errorsByPriority: Record<string, number>;
    }[]
}

// Map error categories to more readable names
const categoryLabels: Record<ErrorCategory, string> = {
    "system_error": "System Errors",
    "auth_error": "Authentication",
    "capacity_error": "Capacity Issues",
    "connection_error": "Connection Issues",
    "permission_error": "Permission Issues",
    "input_error": "Input Validation",
    "duplicate_error": "Duplicates",
    "webhook_error": "Webhook Issues",
    "api_error": "API Issues",
    "unknown_error": "Unclassified",
    "stalled_error": "Stalled Bots",
    "success": "Success States",
    "pending": "Pending States"
}

// Map priority levels to colors
const priorityColors: Record<string, string> = {
    "critical": "hsl(var(--destructive))",
    "high": "hsl(var(--destructive)/0.8)",
    "medium": "hsl(var(--warning))",
    "low": "hsl(var(--warning)/0.7)",
    "none": "hsl(var(--muted)/0.5)"
}

// Category colors
const categoryColors: Record<string, string> = {
    "system_error": "hsl(var(--chart-1))",
    "auth_error": "hsl(var(--chart-2))",
    "capacity_error": "hsl(var(--chart-3))",
    "connection_error": "hsl(var(--chart-4))",
    "permission_error": "hsl(var(--chart-5))",
    "input_error": "hsl(var(--chart-6))",
    "duplicate_error": "hsl(var(--chart-7))",
    "webhook_error": "hsl(var(--chart-8))",
    "api_error": "hsl(var(--chart-9))",
    "unknown_error": "hsl(var(--chart-10))",
    "stalled_error": "hsl(var(--destructive))",
    "success": "hsl(var(--success))",
    "pending": "hsl(var(--muted))"
}

export function BotErrorTimeline({ dailyStats, errorsByDate }: ErrorTimelineProps) {
    const [chartType, setChartType] = useState<"line" | "bar">("line")
    const [viewMode, setViewMode] = useState<"category" | "priority" | "total">("total")

    // Format daily stats for chart
    const chartData = useMemo(() => {
        return dailyStats.map((day) => {
            const formattedDate = dayjs(day.date).format("MMM D")
            const errorRate = (day.errorBots / day.totalBots) * 100
            const successRate = 100 - errorRate

            return {
                date: formattedDate,
                totalBots: day.totalBots,
                errorBots: day.errorBots,
                successfulBots: day.totalBots - day.errorBots,
                errorRate,
                successRate
            }
        })
    }, [dailyStats])

    // Format error data by category
    const categoryData = useMemo(() => {
        return errorsByDate.map(dayData => {
            const formattedDate = dayjs(dayData.date).format("MMM D")

            return {
                date: formattedDate,
                totalErrors: dayData.totalErrors,
                ...dayData.errorsByCategory
            }
        })
    }, [errorsByDate])

    // Format error data by priority
    const priorityData = useMemo(() => {
        return errorsByDate.map(dayData => {
            const formattedDate = dayjs(dayData.date).format("MMM D")

            return {
                date: formattedDate,
                totalErrors: dayData.totalErrors,
                ...dayData.errorsByPriority
            }
        })
    }, [errorsByDate])

    // Get categories present in the data
    const presentCategories = useMemo(() => {
        const categories = new Set<string>()

        errorsByDate.forEach(day => {
            Object.keys(day.errorsByCategory).forEach(cat => {
                if (day.errorsByCategory[cat as ErrorCategory] > 0) {
                    categories.add(cat)
                }
            })
        })

        return Array.from(categories)
    }, [errorsByDate])

    // Get priorities present in the data
    const presentPriorities = useMemo(() => {
        const priorities = new Set<string>()

        errorsByDate.forEach(day => {
            Object.keys(day.errorsByPriority).forEach(priority => {
                if (day.errorsByPriority[priority] > 0) {
                    priorities.add(priority)
                }
            })
        })

        return Array.from(priorities)
    }, [errorsByDate])

    // Get current data based on view mode
    const getCurrentData = () => {
        switch (viewMode) {
            case 'category':
                return categoryData
            case 'priority':
                return priorityData
            default:
                return chartData
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-medium">Error Timeline</h3>
                    <p className="text-sm text-muted-foreground">
                        Showing error trends over time
                    </p>
                </div>

                <div className="flex gap-2 items-center">
                    <Tabs
                        value={chartType}
                        onValueChange={(value) => setChartType(value as "line" | "bar")}
                        className="w-[200px]"
                    >
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="line">Line</TabsTrigger>
                            <TabsTrigger value="bar">Bar</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <Tabs
                        value={viewMode}
                        onValueChange={(value) => setViewMode(value as "category" | "priority" | "total")}
                        className="w-[300px]"
                    >
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="total">Total</TabsTrigger>
                            <TabsTrigger value="category">By Category</TabsTrigger>
                            <TabsTrigger value="priority">By Priority</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="h-80">
                        {chartType === "line" ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={getCurrentData()}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value) => formatNumber(value)}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [formatNumber(value), "Errors"]}
                                    />
                                    <Legend />

                                    {viewMode === "total" && (
                                        <Area
                                            type="monotone"
                                            dataKey="errorBots"
                                            name="Errors"
                                            stackId="1"
                                            fill="hsl(var(--destructive)/0.6)"
                                            stroke="hsl(var(--destructive))"
                                        />
                                    )}

                                    {viewMode === "category" && presentCategories.map((category, index) => (
                                        <Area
                                            key={category}
                                            type="monotone"
                                            dataKey={category}
                                            name={categoryLabels[category as ErrorCategory] || category}
                                            stackId="1"
                                            fill={categoryColors[category] || `hsl(var(--chart-${(index % 10) + 1}))`}
                                            stroke={categoryColors[category] || `hsl(var(--chart-${(index % 10) + 1}))`}
                                        />
                                    ))}

                                    {viewMode === "priority" && presentPriorities.map((priority) => (
                                        <Area
                                            key={priority}
                                            type="monotone"
                                            dataKey={priority}
                                            name={priority.charAt(0).toUpperCase() + priority.slice(1)}
                                            stackId="1"
                                            fill={priorityColors[priority] || 'hsl(var(--muted))'}
                                            stroke={priorityColors[priority] || 'hsl(var(--muted))'}
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={getCurrentData()}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value) => formatNumber(value)}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [formatNumber(value), "Errors"]}
                                    />
                                    <Legend />

                                    {viewMode === "total" && (
                                        <Bar
                                            dataKey="errorBots"
                                            name="Errors"
                                            fill="hsl(var(--destructive)/0.8)"
                                        />
                                    )}

                                    {viewMode === "category" && presentCategories.map((category, index) => (
                                        <Bar
                                            key={category}
                                            dataKey={category}
                                            name={categoryLabels[category as ErrorCategory] || category}
                                            stackId="a"
                                            fill={categoryColors[category] || `hsl(var(--chart-${(index % 10) + 1}))`}
                                        />
                                    ))}

                                    {viewMode === "priority" && presentPriorities.map((priority) => (
                                        <Bar
                                            key={priority}
                                            dataKey={priority}
                                            name={priority.charAt(0).toUpperCase() + priority.slice(1)}
                                            stackId="a"
                                            fill={priorityColors[priority] || 'hsl(var(--muted))'}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 