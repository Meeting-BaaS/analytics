import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNumber } from "@/lib/utils"
import type { ConsumptionData } from "@/hooks/use-consumption"
import { Separator } from "@/components/ui/separator"

interface AdditionalCardsProps {
  data: ConsumptionData
  dateRangeFormatted: string
}

export function AdditionalCards({ data, dateRangeFormatted }: AdditionalCardsProps) {
  const {
    totalTokensConsumed,
    totalRecordingTokens,
    totalTranscriptionTokens,
    totalStreamingTokens,
    chartData
  } = data

  return (
    <>
      <Card className="dark:bg-baas-neutral-500/30">
        <CardHeader>
          <CardTitle>Period Usage</CardTitle>
          <CardDescription>Tokens used {dateRangeFormatted}</CardDescription>
        </CardHeader>
        <CardContent className="flex grow flex-col justify-end gap-2">
          <div className="mb-2 flex items-end gap-2">
            <div className="font-bold text-4xl">{formatNumber(totalTokensConsumed)}</div>
            <div className="pb-0.5 text-muted-foreground">tokens used</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground text-xs">Recording</span>
              <span className="font-medium">{formatNumber(totalRecordingTokens)}</span>
            </div>
            <Separator orientation="vertical" className="h-full" />
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground text-xs">Transcription</span>
              <span className="font-medium">{formatNumber(totalTranscriptionTokens)}</span>
            </div>
            <Separator orientation="vertical" className="h-full" />
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground text-xs">Streaming</span>
              <span className="font-medium">{formatNumber(totalStreamingTokens)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="dark:bg-baas-neutral-500/30">
        <CardHeader>
          <CardTitle>Meeting Hours</CardTitle>
          <CardDescription>Total meeting time recorded</CardDescription>
        </CardHeader>
        <CardContent className="flex grow flex-col justify-end gap-2">
          <div className="font-bold text-4xl">
            {(chartData.reduce((sum, day) => sum + day.duration, 0) / 3600).toFixed(1)}
          </div>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Hours of meetings recorded in this period
          </p>
        </CardContent>
      </Card>
    </>
  )
}
