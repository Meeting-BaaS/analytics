"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNumber, formatPercentage } from "@/lib/utils"

interface BotOverviewProps {
  totalBots: number
  successfulBots: number
  errorBots: number
  duration: string
}

export function BotOverview({ totalBots, successfulBots, errorBots, duration }: BotOverviewProps) {
  const errorRate = (errorBots / totalBots) * 100
  const successRate = (successfulBots / totalBots) * 100

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-sm">Total Bots</CardTitle>
          <CardDescription>All deployed meeting bots</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{formatNumber(totalBots)}</div>
          <p className="mt-1 text-muted-foreground text-xs">{duration}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-sm">Successful Bots</CardTitle>
          <CardDescription>Bots completed without errors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl text-success">{formatNumber(successfulBots)}</div>
          <div className="mt-1 flex items-center">
            <span className="text-success text-xs">
              {formatPercentage(successRate)} success rate
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-sm">Error Bots</CardTitle>
          <CardDescription>Bots that encountered errors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl text-destructive">{formatNumber(errorBots)}</div>
          <div className="mt-1 flex items-center">
            <span className="text-destructive text-xs">
              {formatPercentage(errorRate)} error rate
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
