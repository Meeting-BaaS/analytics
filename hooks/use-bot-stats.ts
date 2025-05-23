import { fetchBotStats, type FetchLogsParams } from "@/lib/api"
import { getPlatformFromUrl } from "@/lib/format-bot-stats"
import type {
  BotData,
  DailyStats,
  ErrorCategory,
  ErrorType,
  FormattedBotData,
  PlatformDistribution,
  UserReportedErrorDistribution
} from "@/lib/types"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useMemo } from "react"

interface UseBotStatsParams {
  offset: number
  limit: number
  startDate: Date | null
  endDate: Date | null
  filters: {
    platformFilters: string[]
    statusFilters: string[]
    userReportedErrorStatusFilters: string[]
    errorCategoryFilters?: string[]
    errorPriorityFilters?: string[]
  }
}

export function useBotStats({
  offset,
  limit,
  startDate,
  endDate,
  filters,
}: UseBotStatsParams) {
  const { data: apiData, isLoading, isError, error, isRefetching } = useQuery({
    queryKey: ["bot-stats", offset, limit, startDate, endDate, filters],
    queryFn: async () => {
      const queryParams: FetchLogsParams = {
        offset,
        limit,
      }

      if (startDate) {
        queryParams.start_date = dayjs(startDate).format("YYYY-MM-DDTHH:mm:ss")
      }

      if (endDate) {
        queryParams.end_date = dayjs(endDate).format("YYYY-MM-DDTHH:mm:ss")
      }

      if (filters.statusFilters.length > 0) {
        queryParams.status_type = filters.statusFilters.join(",")
      }

      if (filters.platformFilters.length > 0) {
        queryParams.meeting_url_contains = filters.platformFilters.join(",")
      }

      if (filters.userReportedErrorStatusFilters.length > 0) {
        queryParams.user_reported_status = filters.userReportedErrorStatusFilters.join(",")
      }
      
      if (filters.errorCategoryFilters && filters.errorCategoryFilters.length > 0) {
        queryParams.status_category = filters.errorCategoryFilters.join(",")
      }
      
      if (filters.errorPriorityFilters && filters.errorPriorityFilters.length > 0) {
        queryParams.status_priority = filters.errorPriorityFilters.join(",")
      }

      // Use the real API instead of mock data
      return fetchBotStats(queryParams)
    },
    staleTime: 1000 * 60 * 5,
  })

  const data = useMemo(() => {
    if (!apiData?.bots) return null

    const botsWithPlatform: FormattedBotData[] = apiData.bots.map((bot) => ({
        ...bot,
      platform: getPlatformFromUrl(bot.meeting_url) as any,
    }))

    const successfulBots = botsWithPlatform.filter((bot) => bot.status.type === "success")
    const errorBots = botsWithPlatform.filter((bot) => bot.status.type === "error" || bot.status.type === "warning")

    const platformCounts = new Map<string, number>()
    botsWithPlatform.forEach((bot) => {
      const count = platformCounts.get(bot.platform) || 0
      platformCounts.set(bot.platform, count + 1)
    })

    const platformDistribution: PlatformDistribution[] = Array.from(platformCounts.entries()).map(
      ([platform, count]) => ({
        platform,
        count,
        percentage: (count / botsWithPlatform.length) * 100,
      })
    )

    const errorTypeCounts = new Map<string, { count: number; category?: ErrorCategory; priority?: string }>()
    errorBots.forEach((bot) => {
      const errorType = bot.status.value
      const current = errorTypeCounts.get(errorType) || { 
        count: 0, 
        category: bot.status.category as ErrorCategory,
        priority: getMockPriorityForError(bot.status.category)
      }
      errorTypeCounts.set(errorType, { 
        ...current,
        count: current.count + 1 
      })
    })

    const errorTypes: ErrorType[] = Array.from(errorTypeCounts.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        percentage: (data.count / errorBots.length) * 100,
        category: data.category,
        priority: data.priority as any
      }))
      .sort((a, b) => b.count - a.count)

    const dailyStatsMap = new Map<string, {
      totalBots: number;
      errorBots: number;
      platforms: Record<string, number>;
    }>()

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)

    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo)
      date.setDate(thirtyDaysAgo.getDate() + i)
      const dateStr = date.toISOString().split("T")[0]

      const totalBots = Math.floor(Math.random() * 100) + 50
      const errorBots = Math.floor(totalBots * (Math.random() * 0.3))

      const platforms: Record<string, number> = {
        "zoom": Math.floor(totalBots * 0.5),
        "teams": Math.floor(totalBots * 0.3),
        "google meet": Math.floor(totalBots * 0.15),
        "unknown": Math.floor(totalBots * 0.05),
      }

      dailyStatsMap.set(dateStr, {
        totalBots,
        errorBots,
        platforms,
      })
    }

    const dailyStats: DailyStats[] = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({
        date,
        totalBots: stats.totalBots,
        errorBots: stats.errorBots,
        platforms: stats.platforms,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1))

    const userReportedErrors: UserReportedErrorDistribution[] = [
      {
        status: "open",
        count: errorBots.filter(bot => bot.user_reported_error?.status === "open").length || Math.floor(errorBots.length * 0.2),
        percentage: 20
      },
      {
        status: "in_progress",
        count: errorBots.filter(bot => bot.user_reported_error?.status === "in_progress").length || Math.floor(errorBots.length * 0.3),
        percentage: 30
      },
      {
        status: "closed",
        count: errorBots.filter(bot => bot.user_reported_error?.status === "closed").length || Math.floor(errorBots.length * 0.5),
        percentage: 50
      }
    ]

    const errorsByDate = dailyStats.map(day => {
      const totalErrors = day.errorBots
      
      const errorsByCategory: Record<ErrorCategory, number> = {
        "system_error": Math.floor(totalErrors * 0.15),
        "auth_error": Math.floor(totalErrors * 0.1),
        "capacity_error": Math.floor(totalErrors * 0.05),
        "connection_error": Math.floor(totalErrors * 0.2),
        "permission_error": Math.floor(totalErrors * 0.1),
        "input_error": Math.floor(totalErrors * 0.05),
        "duplicate_error": Math.floor(totalErrors * 0.05),
        "webhook_error": Math.floor(totalErrors * 0.1),
        "api_error": Math.floor(totalErrors * 0.05),
        "unknown_error": Math.floor(totalErrors * 0.05),
        "stalled_error": Math.floor(totalErrors * 0.05),
        "success": 0,
        "pending": 0
      }
      
      const errorsByPriority: Record<string, number> = {
        "critical": Math.floor(totalErrors * 0.1),
        "high": Math.floor(totalErrors * 0.2),
        "medium": Math.floor(totalErrors * 0.4),
        "low": Math.floor(totalErrors * 0.2),
        "none": Math.floor(totalErrors * 0.1)
      }

      return {
        date: day.date,
        totalErrors,
        errorsByCategory,
        errorsByPriority
      }
    })

    return {
      has_more: apiData.has_more,
      allBots: botsWithPlatform,
        successfulBots,
        errorBots,
        platformDistribution,
        dailyStats,
      errorTypes,
      userReportedErrors,
      errorsByDate
    }
  }, [apiData])

  return {
    data,
    isLoading,
    isError,
    error,
    isRefetching,
  }
}

function getMockPriorityForError(category?: string): string {
  switch (category) {
    case 'system_error':
    case 'stalled_error':
      return 'critical'
    case 'auth_error':
    case 'capacity_error':
    case 'connection_error':
      return 'high'
    case 'permission_error':
    case 'input_error':
    case 'duplicate_error':
    case 'unknown_error':
      return 'medium'
    case 'webhook_error':
    case 'api_error':
      return 'low'
    default:
      return 'medium'
  }
}

function getMockBotStats() {
  const generateMockBot = (id: number): BotData => {
    const isError = Math.random() > 0.7
    const platforms = ["zoom", "teams", "google meet"]
    const platformIndex = Math.floor(Math.random() * platforms.length)
    const platform = platforms[platformIndex]

    let meetingUrl = ""
    switch (platform) {
      case "zoom":
        meetingUrl = `https://zoom.us/j/${Math.floor(Math.random() * 1000000)}`
        break
      case "teams":
        meetingUrl = `https://teams.microsoft.com/l/meetup-join/meeting_${Math.floor(
          Math.random() * 1000000
        )}`
        break
      case "google meet":
        meetingUrl = `https://meet.google.com/${Math.random()
          .toString(36)
          .substring(2, 8)}`
        break
      default:
        meetingUrl = `https://example.com/meeting/${Math.floor(Math.random() * 1000000)}`
    }

    const statusType = isError ? (Math.random() > 0.3 ? "error" : "warning") : "success"
    const statusCategory = isError 
      ? getRandomErrorCategory()
      : "success"
    
    return {
      id,
      account_id: Math.floor(Math.random() * 10) + 1,
      meeting_url: meetingUrl,
      created_at: new Date(
        Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
      ).toISOString(),
      session_id: `session_${id}`,
      reserved: Math.random() > 0.8,
      errors: isError ? "Some error occurred" : null,
      ended_at: isError ? null : new Date().toISOString(),
      mp4_s3_path: "",
      uuid: `uuid_${id}`,
      bot_param_id: id,
      event_id: Math.floor(Math.random() * 100),
      scheduled_bot_id: null,
      diarization_v2: Math.random() > 0.5,
      transcription_fails: isError ? Math.floor(Math.random() * 3) : null,
      diarization_fails: isError ? Math.floor(Math.random() * 3) : null,
      user_reported_error: {
        status: Math.random() > 0.7 ? "open" : Math.random() > 0.5 ? "in_progress" : "closed",
        messages: [],
      },
      params: {
        bot_name: `Bot ${id}`,
        bot_image: null,
        speech_to_text_provider: "Default",
        enter_message: null,
        recording_mode: "gallery_view",
        speech_to_text_api_key: null,
        streaming_input: null,
        streaming_output: null,
        waiting_room_timeout: 300,
        noone_joined_timeout: 600,
        deduplication_key: null,
        extra: {},
        webhook_url: "https://example.com/webhook",
        streaming_audio_frequency: null,
        zoom_sdk_id: null,
        zoom_sdk_pwd: null,
      },
      duration: Math.floor(Math.random() * 3600),
      status: {
        value: isError ? getErrorValueForCategory(statusCategory) : "Completed",
        type: statusType,
        details: isError ? "Error details here" : null,
        sort_priority: isError ? Math.floor(Math.random() * 5) : 10,
        category: statusCategory as any,
      },
    }
  }

  const bots = Array.from({ length: 100 }, (_, i) => generateMockBot(i + 1))

  return {
    has_more: false,
    bots,
  }
}

function getRandomErrorCategory(): string {
  const categories = [
    "system_error",
    "auth_error",
    "capacity_error",
    "connection_error",
    "permission_error",
    "input_error",
    "duplicate_error",
    "webhook_error",
    "api_error",
    "unknown_error",
    "stalled_error"
  ]
  
  return categories[Math.floor(Math.random() * categories.length)]
}

function getErrorValueForCategory(category: string): string {
  switch (category) {
    case 'system_error':
      return 'Internal Error'
    case 'auth_error':
      return 'Unauthorized'
    case 'capacity_error':
      return 'Quota Exceeded'
    case 'connection_error':
      return 'Connection Failed'
    case 'permission_error':
      return 'Bot Not Accepted'
    case 'input_error':
      return 'Invalid Meeting URL'
    case 'duplicate_error':
      return 'Meeting Already Started'
    case 'webhook_error':
      return 'Webhook Error'
    case 'api_error':
      return 'API Error'
    case 'unknown_error':
      return 'Unknown Error'
    case 'stalled_error':
      return 'Stalled'
    default:
      return 'Error'
  }
}
