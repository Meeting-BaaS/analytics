"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DailyStats } from "@/lib/types"
import { formatNumber, formatPercentage, platformColors } from "@/lib/utils"
import dayjs from "dayjs"
import { useState } from "react"
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

interface BotPerformanceChartProps {
  dailyStats: DailyStats[]
}

// Define a type for chart data that includes dynamic platform properties
interface ChartDataItem {
  date: string;
  totalBots: number;
  errorBots: number;
  successfulBots: number;
  successRate: number;
  errorRate: number;
  [platform: string]: number | string; // Allow dynamic platform properties
}

// Define types for stacked data
interface StackedDataItem {
  date: string;
  errorBots: number;
  successfulBots: number;
  [platform: string]: number | string;
}

// Define types for percentage data
interface PercentageDataItem {
  date: string;
  errorRate: number;
  successRate: number;
  [key: string]: number | string; // For platform percentage keys
}

export function BotPerformanceChart({ dailyStats }: BotPerformanceChartProps) {
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  const [dataType, setDataType] = useState<"absolute" | "percentage">("absolute")
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  // Make sure dailyStats are sorted by date
  const sortedStats = [...dailyStats].sort((a, b) =>
    dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1
  )

  // Extract all unique platforms
  const allPlatforms = sortedStats.reduce((platforms, stat) => {
    Object.keys(stat.platforms).forEach(platform => {
      if (!platforms.includes(platform)) {
        platforms.push(platform)
      }
    })
    return platforms
  }, [] as string[])

  // Format data for charting
  const chartData: ChartDataItem[] = sortedStats.map(day => {
    const formattedDate = dayjs(day.date).format("MMM D")
    const platforms = { ...day.platforms }

    // Calculate success rate
    const successRate = ((day.totalBots - day.errorBots) / day.totalBots) * 100

    return {
      date: formattedDate,
      totalBots: day.totalBots,
      errorBots: day.errorBots,
      successfulBots: day.totalBots - day.errorBots,
      successRate: successRate,
      errorRate: 100 - successRate,
      ...platforms
    }
  })

  // Data transformation for stacked bar chart showing absolute values
  const getStackedData = (): StackedDataItem[] => {
    return chartData.map(day => {
      const platformData: Record<string, number> = {}

      allPlatforms.forEach(platform => {
        platformData[platform] = (day[platform] as number) || 0
      })

      return {
        date: day.date,
        ...platformData,
        errorBots: day.errorBots,
        successfulBots: day.successfulBots
      }
    })
  }

  // Data transformation for stacked percentage chart
  const getPercentageData = (): PercentageDataItem[] => {
    return chartData.map(day => {
      const platformData: Record<string, number> = {}
      const total = day.totalBots || 1 // Avoid division by zero

      allPlatforms.forEach(platform => {
        platformData[`${platform}Percentage`] = ((day[platform] as number) || 0) / total * 100
      })

      return {
        date: day.date,
        ...platformData,
        errorRate: day.errorRate,
        successRate: day.successRate
      }
    })
  }

  // Helper function to get platform color
  const getPlatformColor = (platform: string): string => {
    if (platform === "errorBots" || platform === "errorRate") {
      return "hsl(var(--destructive))"
    }
    if (platform === "successfulBots" || platform === "successRate") {
      return "hsl(var(--success))"
    }

    const colorKey = platform.toLowerCase().replace(/\s+/g, " ") as keyof typeof platformColors
    return platformColors[colorKey] || `hsl(var(--chart-${(allPlatforms.indexOf(platform) % 5) + 1}))`
  }

  // Calculate performance trends
  const calculateTrends = () => {
    if (chartData.length < 2) return []

    const recent = chartData.slice(-7) // Last 7 days or less

    // For each platform, calculate trend
    return allPlatforms.map(platform => {
      const platformData = recent.map(day => (day[platform] as number) || 0)
      const firstDay = platformData[0] || 0
      const lastDay = platformData[platformData.length - 1] || 0
      const change = lastDay - firstDay
      const percentChange = firstDay > 0 ? (change / firstDay) * 100 : 0

      return {
        platform,
        change,
        percentChange,
        isPositive: change >= 0,
        lastValue: lastDay
      }
    })
  }

  const trends = calculateTrends()

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">Performance Metrics</h3>
          <p className="text-sm text-muted-foreground">
            Showing data for {chartData.length} days ({chartData[0]?.date} - {chartData[chartData.length - 1]?.date})
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Tabs
            value={chartType}
            onValueChange={(value) => setChartType(value as "line" | "bar")}
            className="w-[260px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="line">Line Chart</TabsTrigger>
              <TabsTrigger value="bar">Bar Chart</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs
            value={dataType}
            onValueChange={(value) => setDataType(value as "absolute" | "percentage")}
            className="w-[260px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="absolute">Count</TabsTrigger>
              <TabsTrigger value="percentage">Percentage</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Platform filters */}
      <div className="flex flex-wrap gap-2 pb-2">
        {allPlatforms.map(platform => (
          <Badge
            key={platform}
            variant={selectedPlatform === platform ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedPlatform(platform === selectedPlatform ? null : platform)}
            style={{
              backgroundColor: selectedPlatform === platform ? getPlatformColor(platform) : undefined,
              borderColor: getPlatformColor(platform),
              opacity: selectedPlatform && selectedPlatform !== platform ? 0.5 : 1
            }}
          >
            {platform}
          </Badge>
        ))}
        {selectedPlatform && (
          <Badge
            variant="outline"
            className="cursor-pointer"
            onClick={() => setSelectedPlatform(null)}
          >
            Clear filter
          </Badge>
        )}
      </div>

      {/* Platform trends */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {trends.filter(t => !selectedPlatform || t.platform === selectedPlatform)
          .map(trend => (
            <Card key={trend.platform} className="p-2">
              <CardContent className="p-2">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{trend.platform}</span>
                    <span
                      className={`text-xs ${trend.isPositive ? "text-success" : "text-destructive"}`}
                    >
                      {trend.isPositive ? "↑" : "↓"} {Math.abs(Math.round(trend.percentChange))}%
                    </span>
                  </div>
                  <span className="text-xl font-semibold">{formatNumber(trend.lastValue)}</span>
                  <span className="text-xs text-muted-foreground">Last 7 days trend</span>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Charts */}
      <div className="h-80">
        {chartType === "line" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dataType === "absolute" ? getStackedData() : getPercentageData()}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(value) =>
                  dataType === "absolute"
                    ? formatNumber(value)
                    : `${Math.round(value)}%`
                }
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) =>
                  dataType === "absolute"
                    ? [formatNumber(value), "Bots"]
                    : [formatPercentage(value), ""]
                }
              />
              <Legend />

              {/* Render selected platform areas or all if none selected */}
              {allPlatforms.filter(platform => !selectedPlatform || platform === selectedPlatform)
                .map(platform => (
                  <Area
                    key={platform}
                    type="monotone"
                    dataKey={dataType === "absolute" ? platform : `${platform}Percentage`}
                    stackId="1"
                    stroke={getPlatformColor(platform)}
                    fill={getPlatformColor(platform)}
                  />
                ))}

              {/* Always include success/error breakdown if showing percentages */}
              {dataType === "percentage" && !selectedPlatform && (
                <>
                  <Area
                    type="monotone"
                    dataKey="successRate"
                    stackId="2"
                    stroke="hsl(var(--success))"
                    fill="hsl(var(--success))"
                  />
                  <Area
                    type="monotone"
                    dataKey="errorRate"
                    stackId="2"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dataType === "absolute" ? getStackedData() : getPercentageData()}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(value) =>
                  dataType === "absolute"
                    ? formatNumber(value)
                    : `${Math.round(value)}%`
                }
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) =>
                  dataType === "absolute"
                    ? [formatNumber(value), "Bots"]
                    : [formatPercentage(value), ""]
                }
              />
              <Legend />

              {/* Render selected platform bars or all if none selected */}
              {allPlatforms.filter(platform => !selectedPlatform || platform === selectedPlatform)
                .map(platform => (
                  <Bar
                    key={platform}
                    dataKey={dataType === "absolute" ? platform : `${platform}Percentage`}
                    stackId="a"
                    fill={getPlatformColor(platform)}
                  />
                ))}

              {/* Always include success/error breakdown if showing percentages */}
              {dataType === "percentage" && !selectedPlatform && (
                <>
                  <Bar
                    dataKey="successRate"
                    stackId="b"
                    fill="hsl(var(--success))"
                  />
                  <Bar
                    dataKey="errorRate"
                    stackId="b"
                    fill="hsl(var(--destructive))"
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
