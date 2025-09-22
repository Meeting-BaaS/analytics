import type { ConsumptionChartData, DailyTokenConsumption } from "@/lib/types"
import dayjs from "dayjs"
import { secondsToHours } from "./utils"

// Token conversion rates (tokens per hour)
const RECORDING_RATE = 1.0 // 1.00 token/hour
const TRANSCRIPTION_RATE = 0.25 // 0.25 token/hour
const TRANSCRIPTION_BYOK_RATE = 0.10 // 0.10 token/hour
const STREAMING_INPUT_RATE = 0.10 // 0.10 token/hour
const STREAMING_OUTPUT_RATE = 0.10 // 0.10 token/hour

/**
 * Calculate tokens from hours using the appropriate rate
 * @param hours - Hours of usage
 * @param rate - Tokens per hour rate
 * @returns Calculated tokens
 */
const calculateTokensFromHours = (hours: number, rate: number): number => {
  return hours * rate
}

/**
 * Calculate the total number of recording tokens consumed
 * @param tokenConsumption - The daily token consumption data
 * @returns The total number of recording tokens consumed
 */
export const getTotalRecordingTokens = (tokenConsumption: DailyTokenConsumption[]) =>
  tokenConsumption.reduce((sum, day) => {
    const recordingTokens = day.consumption_by_service.recording_tokens
    const recordingHours = secondsToHours(day.consumption_by_service.duration)
    // Use provided tokens if available, otherwise calculate from duration
    return sum + (recordingTokens > 0 ? recordingTokens : calculateTokensFromHours(recordingHours, RECORDING_RATE))
  }, 0)

/**
 * Calculate the total number of transcription tokens consumed
 * @param tokenConsumption - The daily token consumption data
 * @returns The total number of transcription tokens consumed
 */
export const getTotalTranscriptionTokens = (tokenConsumption: DailyTokenConsumption[]) =>
  tokenConsumption.reduce((sum, day) => {
    const transcriptionTokens = day.consumption_by_service.transcription_tokens
    const transcriptionByokTokens = day.consumption_by_service.transcription_byok_tokens
    const transcriptionHours = secondsToHours(day.consumption_by_service.transcription_hour)
    const transcriptionByokHours = secondsToHours(day.consumption_by_service.transcription_byok_hour)
    
    // Use provided tokens if available, otherwise calculate from hours
    const calculatedTranscriptionTokens = transcriptionTokens > 0 
      ? transcriptionTokens 
      : calculateTokensFromHours(transcriptionHours, TRANSCRIPTION_RATE)
    
    const calculatedTranscriptionByokTokens = transcriptionByokTokens > 0 
      ? transcriptionByokTokens 
      : calculateTokensFromHours(transcriptionByokHours, TRANSCRIPTION_BYOK_RATE)
    
    return sum + calculatedTranscriptionTokens + calculatedTranscriptionByokTokens
  }, 0)

/**
 * Calculate the total number of streaming tokens consumed
 * @param tokenConsumption - The daily token consumption data
 * @returns The total number of streaming tokens consumed
 */
export const getTotalStreamingTokens = (tokenConsumption: DailyTokenConsumption[]) =>
  tokenConsumption.reduce((sum, day) => {
    const streamingInputTokens = day.consumption_by_service.streaming_input_tokens
    const streamingOutputTokens = day.consumption_by_service.streaming_output_tokens
    const streamingInputHours = secondsToHours(day.consumption_by_service.streaming_input_hour)
    const streamingOutputHours = secondsToHours(day.consumption_by_service.streaming_output_hour)
    
    // Use provided tokens if available, otherwise calculate from hours
    const calculatedInputTokens = streamingInputTokens > 0 
      ? streamingInputTokens 
      : calculateTokensFromHours(streamingInputHours, STREAMING_INPUT_RATE)
    
    const calculatedOutputTokens = streamingOutputTokens > 0 
      ? streamingOutputTokens 
      : calculateTokensFromHours(streamingOutputHours, STREAMING_OUTPUT_RATE)
    
    return sum + calculatedInputTokens + calculatedOutputTokens
  }, 0)

/**
 * Calculate the total number of tokens consumed
 * @param tokenConsumption - The daily token consumption data
 * @returns The total number of tokens consumed
 */
export const getTotalTokensConsumed = (tokenConsumption: DailyTokenConsumption[]) =>
  getTotalRecordingTokens(tokenConsumption) +
  getTotalTranscriptionTokens(tokenConsumption) +
  getTotalStreamingTokens(tokenConsumption)

/**
 * Format consumption data for charts
 * @param tokenConsumption - The daily token consumption data
 * @returns The formatted consumption data
 */
export function getChartData(
  tokenConsumption: DailyTokenConsumption[],
  startDate: Date,
  endDate: Date
): ConsumptionChartData[] {
  // Generate array of all dates in range
  const allDates: Date[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    allDates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Map each date to chart data, filling in gaps with zeros
  return allDates.map((date) => {
    const existingData = tokenConsumption.find(
      (d) => dayjs(d.date).format("YYYY-MM-DD") === dayjs(date).format("YYYY-MM-DD")
    )

    if (!existingData) {
      return {
        date: dayjs(date).format("YYYY-MM-DD"),
        recording: 0,
        transcription: 0,
        streaming: 0,
        duration: 0,
        transcription_hour: 0,
        streaming_input_hour: 0,
        streaming_output_hour: 0
      }
    }

    const { consumption_by_service } = existingData

    // Calculate tokens from hours if token values are 0
    const recordingTokens = consumption_by_service.recording_tokens > 0 
      ? consumption_by_service.recording_tokens 
      : calculateTokensFromHours(secondsToHours(consumption_by_service.duration), RECORDING_RATE)

    const transcriptionTokens = consumption_by_service.transcription_tokens > 0 
      ? consumption_by_service.transcription_tokens 
      : calculateTokensFromHours(secondsToHours(consumption_by_service.transcription_hour), TRANSCRIPTION_RATE)

    const transcriptionByokTokens = consumption_by_service.transcription_byok_tokens > 0 
      ? consumption_by_service.transcription_byok_tokens 
      : calculateTokensFromHours(secondsToHours(consumption_by_service.transcription_byok_hour), TRANSCRIPTION_BYOK_RATE)

    const streamingInputTokens = consumption_by_service.streaming_input_tokens > 0 
      ? consumption_by_service.streaming_input_tokens 
      : calculateTokensFromHours(secondsToHours(consumption_by_service.streaming_input_hour), STREAMING_INPUT_RATE)

    const streamingOutputTokens = consumption_by_service.streaming_output_tokens > 0 
      ? consumption_by_service.streaming_output_tokens 
      : calculateTokensFromHours(secondsToHours(consumption_by_service.streaming_output_hour), STREAMING_OUTPUT_RATE)

    return {
      date: dayjs(date).format("YYYY-MM-DD"),
      recording: recordingTokens,
      transcription: transcriptionTokens + transcriptionByokTokens,
      streaming: streamingInputTokens + streamingOutputTokens,
      duration: secondsToHours(consumption_by_service.duration),
      transcription_hour: secondsToHours(consumption_by_service.transcription_hour),
      streaming_input_hour: secondsToHours(consumption_by_service.streaming_input_hour),
      streaming_output_hour: secondsToHours(consumption_by_service.streaming_output_hour)
    }
  })
}
