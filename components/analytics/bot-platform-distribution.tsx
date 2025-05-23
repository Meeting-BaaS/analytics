"use client"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart"
import type { PlatformDistribution } from "@/lib/types"
import { formatNumber, formatPercentage, platformColors } from "@/lib/utils"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { CardContent } from "../ui/card"

interface BotPlatformDistributionProps {
  platformDistribution: PlatformDistribution[]
}

// Type guard for platform names
function isPlatformKey(key: string): key is keyof typeof platformColors {
  return key === "google meet" || key === "zoom" || key === "teams" || key === "unknown"
}

export function BotPlatformDistribution({ platformDistribution }: BotPlatformDistributionProps) {
  const totalBots = platformDistribution.reduce((sum, item) => sum + item.count, 0)

  // Create chart config
  const chartConfig = platformDistribution.reduce((acc, platform) => {
    const platformKey = platform.platform
    return Object.assign(acc, {
      [platformKey.toLowerCase().replace(/\s+/g, "_")]: {
        label: platformKey,
        color: isPlatformKey(platformKey)
          ? platformColors[platformKey]
          : `hsl(var(--chart-${(Object.keys(acc).length % 5) + 1}))`
      }
    })
  }, {} as ChartConfig)

  // Transform data for recharts
  const chartData = platformDistribution.map((platform) => ({
    name: platform.platform.toLowerCase().replace(/\s+/g, "_"),
    value: platform.count,
    label: platform.platform,
    percentage: platform.percentage
  }))

  return (
    <Card className="dark:bg-[linear-gradient(238deg,#161616,hsla(0,0%,9%,0))] dark:bg-baas-black">
      <CardContent>
        <CardHeader>
          <CardTitle>Platform Distribution</CardTitle>
          <CardDescription>
            Total: <span className="font-bold">{formatNumber(totalBots)}</span> bots
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <div className="relative h-80 w-full md:w-1/2">
            <ChartContainer config={chartConfig} className="h-full">
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      labelLine={false}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={`var(--color-${entry.name})`} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value: unknown) => formatNumber(Number(value))}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-bold text-4xl">{formatNumber(totalBots)}</span>
                  <span className="text-muted-foreground text-sm">Total Bots</span>
                </div>
              </div>
            </ChartContainer>
          </div>

          <div className="w-full space-y-6 md:w-1/2">
            <h3 className="font-medium text-lg">Platform Breakdown</h3>
            <div className="grid grid-cols-1 gap-4">
              {platformDistribution.map((platform) => {
                const platformKey = platform.platform
                const backgroundColor = isPlatformKey(platformKey)
                  ? platformColors[platformKey]
                  : `hsl(var(--chart-${(platformDistribution.indexOf(platform) % 5) + 1}))`

                return (
                  <div
                    key={platformKey}
                    className="flex items-center justify-between rounded-lg border bg-card p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor }} />
                      <span>{platformKey}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-medium">{formatNumber(platform.count)}</span>
                      <span className="text-muted-foreground text-sm">
                        {formatPercentage(platform.percentage)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
