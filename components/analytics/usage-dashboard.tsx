"use client"

import { DateRangeFilter } from "@/components/filters/date-range-filter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, recharts } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchTokenConsumption, fetchUserTokens } from "@/lib/api"
import { chartColors } from "@/lib/chart-colors"
import { DailyTokenConsumption, UserTokensResponse } from "@/lib/types"
import { formatNumber } from "@/lib/utils"
import dayjs from "dayjs"
import { Loader2, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import type { DateValueType } from "react-tailwindcss-datepicker"

const {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    Tooltip
} = recharts;

export function UsageDashboard() {
    const [loading, setLoading] = useState(true)
    const [tokenConsumption, setTokenConsumption] = useState<DailyTokenConsumption[]>([])
    const [userTokens, setUserTokens] = useState<UserTokensResponse | null>(null)
    const [dateRange, setDateRange] = useState<DateValueType>(() => {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)

        return {
            startDate,
            endDate
        }
    })
    const [activeTab, setActiveTab] = useState("token_usage")

    useEffect(() => {
        loadData()
    }, [dateRange])

    const loadData = async () => {
        setLoading(true)
        try {
            if (!dateRange?.startDate || !dateRange?.endDate) return

            const formattedStartDate = `${dayjs(dateRange.startDate).format('YYYY-MM-DD')}T00:00:00`
            const formattedEndDate = `${dayjs(dateRange.endDate).format('YYYY-MM-DD')}T23:59:59`

            const [consumption, tokens] = await Promise.all([
                fetchTokenConsumption(formattedStartDate, formattedEndDate),
                fetchUserTokens()
            ])

            setTokenConsumption(consumption)
            setUserTokens(tokens)
        } catch (error) {
            console.error("Failed to load usage data:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = () => {
        loadData()
    }

    // Calculate token usage statistics
    const totalRecordingTokens = tokenConsumption.reduce(
        (sum, day) => sum + day.consumption_by_service.recording_tokens,
        0
    )

    const totalTranscriptionTokens = tokenConsumption.reduce(
        (sum, day) => sum + day.consumption_by_service.transcription_tokens,
        0
    )

    const totalStreamingTokens = tokenConsumption.reduce(
        (sum, day) => sum + (
            day.consumption_by_service.streaming_input_tokens +
            day.consumption_by_service.streaming_output_tokens
        ),
        0
    )

    const totalTokensConsumed = totalRecordingTokens + totalTranscriptionTokens + totalStreamingTokens

    // Format consumption data for charts
    const chartData = tokenConsumption.map(day => ({
        date: day.date,
        recording: day.consumption_by_service.recording_tokens,
        transcription: day.consumption_by_service.transcription_tokens,
        streaming: day.consumption_by_service.streaming_input_tokens + day.consumption_by_service.streaming_output_tokens,
        duration: Math.round(day.consumption_by_service.duration / 3600 * 100) / 100 // Convert to hours with 2 decimals
    }))

    // Chart config using project color scheme
    const chartConfig = {
        recording: {
            label: "Recording",
            color: chartColors.chart1
        },
        transcription: {
            label: "Transcription",
            color: chartColors.chart2
        },
        streaming: {
            label: "Streaming",
            color: chartColors.chart3
        },
        duration: {
            label: "Hours",
            color: chartColors.chart5
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
                <Button variant="outline" size="sm" onClick={handleRefresh} className="h-10">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
            </div>

            {userTokens && (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>Available Tokens</CardTitle>
                            <CardDescription>Your current token balance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-2">
                                {formatNumber(userTokens.available_tokens)}
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-primary h-full rounded-full"
                                    style={{ width: `${(userTokens.available_tokens / Math.max(userTokens.total_tokens_purchased, 1)) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                {userTokens.total_tokens_purchased ? (
                                    `${((userTokens.available_tokens / userTokens.total_tokens_purchased) * 100).toFixed(1)}% of purchased tokens remaining`
                                ) : (
                                    "No tokens purchased yet"
                                )}
                            </p>
                            {userTokens.last_purchase_date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Last purchase: {new Date(userTokens.last_purchase_date).toLocaleDateString()}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>Period Usage</CardTitle>
                            <CardDescription>Tokens used in selected period</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {formatNumber(totalTokensConsumed)}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Recording</span>
                                    <span className="font-medium">{formatNumber(totalRecordingTokens)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Transcription</span>
                                    <span className="font-medium">{formatNumber(totalTranscriptionTokens)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Streaming</span>
                                    <span className="font-medium">{formatNumber(totalStreamingTokens)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>Meeting Hours</CardTitle>
                            <CardDescription>Total meeting time recorded</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {(tokenConsumption.reduce((sum, day) => sum + day.consumption_by_service.duration, 0) / 3600).toFixed(1)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Hours of meetings recorded in this period
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Usage Analysis</CardTitle>
                    <CardDescription>Track token consumption over time</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList>
                            <TabsTrigger value="token_usage">Token Usage</TabsTrigger>
                            <TabsTrigger value="meeting_hours">Meeting Hours</TabsTrigger>
                        </TabsList>

                        <TabsContent value="token_usage" className="pt-4">
                            <div className="h-[400px]">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <ChartContainer config={chartConfig} className="h-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <ChartTooltip
                                                    content={(props: { active?: boolean; payload?: any[]; label?: string }) => (
                                                        <ChartTooltipContent
                                                            active={props.active}
                                                            payload={props.payload}
                                                            label={props.label}
                                                            formatter={(value) => formatNumber(Number(value))}
                                                        />
                                                    )}
                                                />
                                                <Legend />
                                                <Bar
                                                    dataKey="recording"
                                                    stackId="tokens"
                                                    fill="var(--color-recording)"
                                                />
                                                <Bar
                                                    dataKey="transcription"
                                                    stackId="tokens"
                                                    fill="var(--color-transcription)"
                                                />
                                                <Bar
                                                    dataKey="streaming"
                                                    stackId="tokens"
                                                    fill="var(--color-streaming)"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="meeting_hours" className="pt-4">
                            <div className="h-[400px]">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <ChartContainer config={chartConfig} className="h-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <ChartTooltip
                                                    content={(props: { active?: boolean; payload?: any[]; label?: string }) => (
                                                        <ChartTooltipContent
                                                            active={props.active}
                                                            payload={props.payload}
                                                            label={props.label}
                                                            formatter={(value) => formatNumber(Number(value))}
                                                        />
                                                    )}
                                                />
                                                <Legend />
                                                <Bar
                                                    dataKey="duration"
                                                    fill="var(--color-duration)"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
} 