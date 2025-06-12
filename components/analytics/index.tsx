"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import {
  DEFAULT_LIMIT,
  LIMIT_STORAGE_KEY,
  allLimitOptions
} from "@/components/filters/limit-selector"
import { updateSearchParams, validateDateRange } from "@/lib/search-params"
import { validateFilterValues } from "@/lib/search-params"
import type { FilterState } from "@/lib/types"
import type { DateValueType } from "react-tailwindcss-datepicker"
import { useBotStats } from "@/hooks/use-bot-stats"
import { Loader2 } from "lucide-react"
import Filters from "@/components/filters"
import { MainTabs } from "@/components/ui/main-tabs"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { SelectedErrorProvider } from "@/contexts/selected-error-context"
import { SelectedBotsProvider } from "@/contexts/selected-bots-context"
import { SelectedBotsButton } from "@/components/analytics/selected-bots-button"

const Loading = () => (
  <div className="flex h-96 items-center justify-center">
    <Loader2 className="size-8 animate-spin text-primary" />
  </div>
)

const Overview = dynamic(() => import("@/components/analytics/overview"), {
  loading: Loading
})
const ErrorAnalysis = dynamic(() => import("@/components/analytics/error-analysis"), {
  loading: Loading
})
const Duration = dynamic(() => import("@/components/analytics/duration"), {
  loading: Loading
})
const IssueReports = dynamic(() => import("@/components/analytics/issue-reports"), {
  loading: Loading
})

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "issue-reports", label: "Issue Reports" },
  { id: "error-analysis", label: "Error Analysis" },
  { id: "duration", label: "Duration" }
]

export function Analytics() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [currentTab, setCurrentTab] = useState(tabs[0].id)
  const [limit, setLimit] = useState(() => {
    // Initialize from localStorage if available, otherwise use default
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LIMIT_STORAGE_KEY)
      return stored && allLimitOptions.some((option) => option.value === Number(stored))
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

  // Update URL when date range or filters change
  useEffect(() => {
    const params = updateSearchParams(searchParams, dateRange, filters)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [dateRange, filters, router, searchParams])

  const { data, isLoading, isRefetching, refetch } = useBotStats({
    offset: 0,
    limit,
    startDate: dateRange?.startDate ?? null,
    endDate: dateRange?.endDate ?? null,
    filters
  })

  const renderTabContent = useMemo(() => {
    if (!data) return null

    switch (currentTab) {
      case "overview":
        return (
          <Overview
            platformDistribution={data.platformDistribution}
            allBots={data.allBots}
            errorDistributionData={data.errorDistributionData}
            errorBots={data.errorBots}
            errorTableData={data.errorTableData}
          />
        )
      case "error-analysis":
        return <ErrorAnalysis errorDistributionData={data.errorDistributionData} />
      case "duration":
        return <Duration errorDistributionData={data.errorDistributionData} />
      case "issue-reports":
        return (
          <IssueReports
            statusCounts={data.issueReportData.statusCounts}
            timelineData={data.issueReportData.timelineData}
          />
        )
      default:
        return null
    }
  }, [currentTab, data])

  return (
    <div className="relative">
      {/* Loading state - only show full screen loader on initial load */}
      {isLoading && !data ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-bold text-3xl">Meeting Bot Analytics</h1>
            <p className="text-muted-foreground">
              Monitor your meeting bot performance across all platforms
            </p>
          </div>
          <Filters
            filters={filters}
            setFilters={setFilters}
            dateRange={dateRange}
            setDateRange={setDateRange}
            limit={limit}
            setLimit={setLimit}
            refetch={refetch}
            isRefetching={isRefetching}
            firstBotDate={data?.dateRange?.firstBotDate}
            lastBotDate={data?.dateRange?.lastBotDate}
            totalBots={data?.totalBots}
          />
          {!data || data.allBots.length === 0 ? (
            <div className="flex h-96 items-center justify-center">
              <p className="text-muted-foreground text-sm">
                No bots found. Please try a different date range or filter.
              </p>
            </div>
          ) : (
            <>
              <MainTabs
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
                tabs={tabs}
                containerClassName="mb-4"
              />
              <SelectedErrorProvider
                initialErrorDistribution={data.errorDistributionData}
                allBots={data.allBots}
              >
                <SelectedBotsProvider>
                  <div className={cn("space-y-4", isRefetching && "animate-pulse")}>
                    {renderTabContent}
                  </div>
                  <SelectedBotsButton
                    dateRange={{
                      startDate: dateRange?.startDate ?? null,
                      endDate: dateRange?.endDate ?? null
                    }}
                  />
                </SelectedBotsProvider>
              </SelectedErrorProvider>
            </>
          )}
        </div>
      )}
    </div>
  )
}
