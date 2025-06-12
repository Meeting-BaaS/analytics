"use client"

import { useConsumption } from "@/hooks/use-consumption"
import { RefreshCw } from "lucide-react"
import { updateDateRangeSearchParams, validateDateRange } from "@/lib/search-params"
import { Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import type { DateValueType } from "react-tailwindcss-datepicker"
import { DateRangeFilter } from "@/components/filters/date-range-filter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "@/hooks/use-session"
import { AvailableTokensCard } from "@/components/usage/available-tokens-card"
import { AdditionalCards } from "@/components/usage/additional-cards"
import { TokenUsageChart } from "@/components/usage/token-usage-chart"
import { MeetingHoursChart } from "@/components/usage/meeting-hours-chart"
import { DownloadChartData } from "@/components/usage/download-chart-data"
import { PaymentSuccessDialog } from "@/components/usage/payment-success-dialog"
import dayjs from "dayjs"

export default function Usage({ paymentStatus }: { paymentStatus?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const session = useSession()
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(paymentStatus === "success")

  // Initialize date range from URL params or default to last 14 days
  const [dateRange, setDateRange] = useState<DateValueType>(() =>
    validateDateRange(searchParams.get("startDate"), searchParams.get("endDate"))
  )

  const { data, isLoading, isRefetching, refetch } = useConsumption({
    startDate: dateRange?.startDate ?? null,
    endDate: dateRange?.endDate ?? null
  })

  // Update URL when date range changes
  useEffect(() => {
    const newParams = updateDateRangeSearchParams(searchParams, dateRange)
    if (newParams.toString() !== searchParams.toString()) {
      router.replace(`?${newParams.toString()}`, { scroll: false })
    }
  }, [dateRange, router, searchParams])

  const dateRangeFormatted = useMemo(() => {
    return dateRange?.startDate && dateRange?.endDate
      ? `between ${dayjs(dateRange.startDate).format("D MMM YYYY")} - ${dayjs(dateRange.endDate).format("D MMM YYYY")}`
      : "in selected period"
  }, [dateRange])

  return (
    <div className="relative space-y-4">
      {/* Loading state - only show full screen loader on initial load */}
      {isLoading && !data ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <div className="flex h-96 items-center justify-center">No data found</div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="font-bold text-3xl">Usage Dashboard</h1>
            <p className="text-muted-foreground">{session?.user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeFilter value={dateRange} onChange={setDateRange} hideToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              aria-label={isRefetching ? "Refreshing data" : "Refresh data"}
            >
              {isRefetching ? <Loader2 className="animate-spin text-primary" /> : <RefreshCw />}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <AvailableTokensCard
              availableTokens={data.userTokens.available_tokens}
              totalTokensPurchased={data.userTokens.total_tokens_purchased}
              lastPurchaseDate={data.userTokens.last_purchase_date || undefined}
              planType={data.subscriptionInfo.subscription.product}
            />
            <AdditionalCards data={data} dateRangeFormatted={dateRangeFormatted} />
          </div>
          <Card className="dark:bg-baas-black">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Usage Analysis</CardTitle>
                <CardDescription>Consumption {dateRangeFormatted}</CardDescription>
              </div>
              <DownloadChartData
                data={data.chartData}
                startDate={dateRange?.startDate ?? new Date()}
                endDate={dateRange?.endDate ?? new Date()}
              />
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="token_usage" className="w-full">
                <TabsList>
                  <TabsTrigger value="token_usage">Token Usage</TabsTrigger>
                  <TabsTrigger value="meeting_hours">Meeting Hours</TabsTrigger>
                </TabsList>
                <TabsContent value="token_usage" className="pt-4">
                  <TokenUsageChart data={data.chartData} />
                </TabsContent>
                <TabsContent value="meeting_hours" className="pt-4">
                  <MeetingHoursChart data={data.chartData} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
      <PaymentSuccessDialog open={showPaymentSuccess} onOpenChange={setShowPaymentSuccess} />
    </div>
  )
}
