"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSelectedBots } from "@/contexts/selected-bots-context"
import type { FormattedBotData } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { ArrowRight, Clipboard, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface BotLogsTableProps {
    bots: FormattedBotData[]
    dateRange: {
        startDate: Date | null
        endDate: Date | null
    }
    onBotSelect?: (bot: FormattedBotData, selected: boolean) => void
    selectedBots?: FormattedBotData[]
}

export function BotLogsTable({
    bots,
    dateRange,
    onBotSelect
}: BotLogsTableProps) {
    const { selectedBots, toggleBotSelection } = useSelectedBots()

    // Get error bots only
    const errorBots = bots.filter(bot =>
        bot.status.type === "error" || bot.status.type === "warning"
    )

    // Get most recent error bot if any exist
    const mostRecentBot = errorBots.length > 0 ? errorBots[0] : null

    const generateBotLogsUrl = (botUuid?: string) => {
        // Format start and end dates
        const startDateParam = dateRange.startDate ?
            dateRange.startDate.toISOString().split('.')[0] + 'Z' : '';
        const endDateParam = dateRange.endDate ?
            dateRange.endDate.toISOString().split('.')[0] + 'Z' : '';

        // Create bot UUID parameter if provided
        const botParam = botUuid ? `&bot_uuid=${botUuid}` : '';

        // Create selected bots parameter if any are selected
        const selectedBotsParam = selectedBots.length > 0 ?
            `&bot_uuid=${selectedBots.map(bot => bot.uuid).join('%2C')}` : '';

        return `https://logs.meetingbaas.com/?startDate=${encodeURIComponent(startDateParam)}&endDate=${encodeURIComponent(endDateParam)}${botUuid ? botParam : selectedBotsParam}`;
    }

    const copyBotId = (uuid: string) => {
        navigator.clipboard.writeText(uuid)
        toast.success("Bot ID copied to clipboard")
    }

    // Handle bot selection
    const handleBotSelect = (bot: FormattedBotData) => {
        if (onBotSelect) {
            onBotSelect(bot, true)
        } else {
            toggleBotSelection(bot, true)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Error Logs</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(generateBotLogsUrl(), '_blank')}
                        className="flex items-center gap-1 text-xs"
                    >
                        View All Logs <ExternalLink className="h-3 w-3" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {errorBots.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        No errors found
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Most recent error summary */}
                        <div className="flex flex-col gap-3 p-3 border rounded-lg bg-destructive/5">
                            <div className="flex justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${mostRecentBot?.status.type === "error" ?
                                        "bg-destructive/10 text-destructive" :
                                        "bg-warning/10 text-warning"
                                        }`}>
                                        {mostRecentBot?.status.value}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {mostRecentBot && formatDate(mostRecentBot.created_at)}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => mostRecentBot && copyBotId(mostRecentBot.uuid)}
                                >
                                    <Clipboard className="h-3 w-3" />
                                </Button>
                            </div>

                            <div className="font-mono text-xs break-all">
                                {mostRecentBot?.uuid}
                            </div>

                            <div className="flex justify-between items-center mt-2">
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Platform: </span>
                                    <span className="font-medium">{mostRecentBot?.platform}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => mostRecentBot && handleBotSelect(mostRecentBot)}
                                        className="h-7 px-2 text-xs"
                                    >
                                        Select
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => mostRecentBot && window.open(generateBotLogsUrl(mostRecentBot.uuid), '_blank')}
                                        className="h-7 flex items-center gap-1 text-xs"
                                    >
                                        View Details <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Error count summary */}
                        {/* <div className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                                <span className="text-sm font-medium">{errorBots.length} Total Errors</span>
                                <p className="text-xs text-muted-foreground">
                                    {selectedBots.length > 0 ? `${selectedBots.length} ${selectedBots.length === 1 ? 'bot' : 'bots'} selected` : 'Select errors to view details'}
                                </p>
                            </div>
                            {selectedBots.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(generateBotLogsUrl(), '_blank')}
                                    className="h-7 flex items-center gap-1 text-xs border-primary text-primary hover:bg-primary/10"
                                >
                                    View Selected <ExternalLink className="h-3 w-3" />
                                </Button>
                            )}
                        </div> */}
                    </div>
                )}
            </CardContent>
        </Card>
    )
} 