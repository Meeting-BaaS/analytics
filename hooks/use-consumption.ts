import type { ConsumptionChartData, SubscriptionResponse } from "@/lib/types"
import {
  fetchSubscriptionsInfo,
  fetchTokenConsumption,
  fetchUserTokens,
  type FetchConsumptionParams
} from "@/lib/api"
import {
  getChartData,
  getTotalRecordingTokens,
  getTotalStreamingTokens,
  getTotalTokensConsumed,
  getTotalTranscriptionTokens
} from "@/lib/format-consumptions"
import type { DailyTokenConsumption, UserTokensResponse } from "@/lib/types"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"

interface UseConsumptionParams {
  startDate: Date | null
  endDate: Date | null
}

interface RawConsumptionData {
  tokenConsumption: DailyTokenConsumption[]
  userTokens: UserTokensResponse
  subscriptionInfo: SubscriptionResponse
}

export interface ConsumptionData extends RawConsumptionData {
  totalTokensConsumed: number
  totalRecordingTokens: number
  totalTranscriptionTokens: number
  totalStreamingTokens: number
  chartData: ConsumptionChartData[]
}

export function useConsumption({ startDate, endDate }: UseConsumptionParams) {
  const { data, isLoading, isRefetching, refetch } = useQuery<
    RawConsumptionData,
    Error,
    ConsumptionData
  >({
    queryKey: ["consumption", startDate, endDate],
    enabled: !!startDate && !!endDate,
    queryFn: async () => {
      const queryParams: FetchConsumptionParams = {
        start_date: dayjs(startDate).format("YYYY-MM-DDTHH:mm:ss"),
        end_date: dayjs(endDate).format("YYYY-MM-DDTHH:mm:ss")
      }
      const [tokenConsumption, userTokens, subscriptionInfo] = await Promise.all([
        fetchTokenConsumption(queryParams),
        fetchUserTokens(),
        fetchSubscriptionsInfo()
      ])
      return { tokenConsumption, userTokens, subscriptionInfo }
    },
    select: (data) => {
      const { tokenConsumption, userTokens, subscriptionInfo } = data
      const totalRecordingTokens = getTotalRecordingTokens(tokenConsumption)
      const totalTranscriptionTokens = getTotalTranscriptionTokens(tokenConsumption)
      const totalStreamingTokens = getTotalStreamingTokens(tokenConsumption)
      const totalTokensConsumed = getTotalTokensConsumed(tokenConsumption)
      const chartData =
        startDate && endDate ? getChartData(tokenConsumption, startDate, endDate) : []

      return {
        tokenConsumption,
        userTokens,
        subscriptionInfo,
        totalTokensConsumed,
        totalRecordingTokens,
        totalTranscriptionTokens,
        totalStreamingTokens,
        chartData
      }
    },
    staleTime: 1000 * 60 * 5,
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
