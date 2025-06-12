import type {
  BotPaginated,
  DailyTokenConsumption,
  SubscriptionResponse,
  UserTokensResponse
} from "@/lib/types"

export interface FetchLogsParams {
  offset: number
  limit: number
  start_date?: string
  end_date?: string
  meeting_url_contains?: string
  status_type?: string
  user_reported_error_json?: string
  bot_uuid?: string
  status_category?: string
  status_priority?: string
  user_reported_status?: string
}

/**
 * Fetches paginated bot stats from the API.
 * Returns { bots: BotData[], has_more: boolean }
 */
export async function fetchBotStats(params: FetchLogsParams): Promise<BotPaginated> {
  const queryParams = new URLSearchParams()

  queryParams.append("offset", String(params.offset))
  queryParams.append("limit", String(params.limit))

  // Add optional filters if they exist
  if (params.start_date) queryParams.append("start_date", params.start_date)
  if (params.end_date) queryParams.append("end_date", params.end_date)
  if (params.meeting_url_contains)
    queryParams.append("meeting_url_contains", params.meeting_url_contains)
  if (params.status_type) queryParams.append("status_type", params.status_type)
  if (params.user_reported_error_json)
    queryParams.append("user_reported_error_json", params.user_reported_error_json)
  if (params.bot_uuid) queryParams.append("bot_uuid", params.bot_uuid)

  // Add new filters from Rust implementation
  if (params.status_category) queryParams.append("status_category", params.status_category)
  if (params.status_priority) queryParams.append("status_priority", params.status_priority)
  if (params.user_reported_status)
    queryParams.append("user_reported_status", params.user_reported_status)

  const response = await fetch(`/api/baas/bots/all?${queryParams.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch bot stats: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export interface FetchConsumptionParams {
  start_date: string
  end_date: string
}

/**
 * Fetches token consumption data for a specific date range.
 * @param startDate Start date in ISO format
 * @param endDate End date in ISO format
 * @returns Array of daily token consumption data
 */
export async function fetchTokenConsumption(
  params: FetchConsumptionParams
): Promise<DailyTokenConsumption[]> {
  const queryParams = new URLSearchParams()
  queryParams.append("start_date", params.start_date)
  queryParams.append("end_date", params.end_date)

  const response = await fetch(`/api/baas/bots/token_consumption?${queryParams.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch token consumption: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

/**
 * Fetches current user token information.
 * @returns User tokens data including available tokens and purchase history
 */
export async function fetchUserTokens(): Promise<UserTokensResponse> {
  const response = await fetch("/api/baas/accounts/user_tokens")
  if (!response.ok) {
    throw new Error(`Failed to fetch user tokens: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export async function fetchSubscriptionsInfo(): Promise<SubscriptionResponse> {
  const response = await fetch("/api/baas/payment/subscriptions_infos")
  if (!response.ok) {
    throw new Error(`Failed to fetch subscription info: ${response.status} ${response.statusText}`)
  }
  return response.json()
}
