import { useQuery } from "@tanstack/react-query"
import { fetchBotStats } from "@/lib/api"
import dayjs from "dayjs"
import type {
  ErrorDistribution,
  ErrorTableEntry,
  FilterState,
  FormattedBotData,
  IssueReportData,
  PlatformDistribution
} from "@/lib/types"
import {
  getErrorDistribution,
  getErrorTable,
  getPlatformDistribution,
  getPlatformFromUrl,
  getIssueReportData,
  filterAndGroupErrorBots,
  applyUserReportedErrorStatus
} from "@/lib/format-bot-stats"
import type { BotPaginated } from "@/lib/types"

interface UseBotStatsParams {
  offset: number
  limit: number
  startDate: Date | null
  endDate: Date | null
  filters: FilterState
}

interface BotStatsData {
  has_more: boolean
  allBots: FormattedBotData[]
  errorBots: FormattedBotData[]
  platformDistribution: PlatformDistribution[]
  errorDistributionData: ErrorDistribution[]
  errorTableData: ErrorTableEntry[]
  issueReportData: IssueReportData
  totalBots: number
  dateRange: { firstBotDate: string; lastBotDate: string } | null
}

export function useBotStats({ offset, limit, startDate, endDate, filters }: UseBotStatsParams) {
  const { data, isLoading, isRefetching, refetch } = useQuery<BotPaginated, Error, BotStatsData>({
    queryKey: ["bot-stats", { offset, limit, startDate, endDate, filters }],
    queryFn: () => {
      const {
        platformFilters,
        statusFilters,
        userReportedErrorStatusFilters,
        errorCategoryFilters,
        errorPriorityFilters
      } = filters
      const queryParams = {
        offset,
        limit,
        start_date: startDate ? `${dayjs(startDate).format("YYYY-MM-DD")}T00:00:00` : "",
        end_date: endDate ? `${dayjs(endDate).format("YYYY-MM-DD")}T23:59:59` : "",
        ...(platformFilters.length && {
          meeting_url_contains: filters.platformFilters.join(",")
        }),
        ...(statusFilters.length && { status_type: statusFilters.join(",") }),
        ...(userReportedErrorStatusFilters.length && {
          user_reported_error_json: `${userReportedErrorStatusFilters.join(",")}`
        }),
        ...(errorCategoryFilters.length && {
          status_category: errorCategoryFilters.join(",")
        }),
        ...(errorPriorityFilters.length && {
          status_priority: errorPriorityFilters.join(",")
        })
      }

      return fetchBotStats(queryParams)
    },
    select: (data) => {
      const formattedBots: FormattedBotData[] = data.bots.map((bot) => {
        const botWithPlatform = { ...bot, platform: getPlatformFromUrl(bot.meeting_url) }
        return applyUserReportedErrorStatus(botWithPlatform) as FormattedBotData
      })
      const { errorDistribution, errorBots } = filterAndGroupErrorBots(formattedBots)

      // Get the date range from the first and last bot
      const firstBotDate = formattedBots[0]?.created_at
      const lastBotDate = formattedBots[formattedBots.length - 1]?.created_at

      // Bot distribution by platform
      const platformDistribution = getPlatformDistribution(formattedBots)

      // Bot distribution by error status
      const errorDistributionData = getErrorDistribution(errorDistribution, errorBots)

      // Transform data for error table
      const errorTableData = getErrorTable(errorDistribution)

      // Issue reports
      const issueReportData = getIssueReportData(formattedBots)

      return {
        has_more: data.has_more,
        allBots: formattedBots,
        errorBots,
        platformDistribution,
        errorDistributionData,
        errorTableData,
        issueReportData,
        totalBots: formattedBots.length,
        dateRange: firstBotDate && lastBotDate ? { firstBotDate, lastBotDate } : null
      }
    },
    staleTime: 1000 * 60 * 15, // 15 minutes for analytics data
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
    throwOnError: true
  })

  return {
    data,
    isLoading,
    isRefetching,
    refetch
  }
}
