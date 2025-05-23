"use client"

import { Button } from "@/components/ui/button"
import type { FormattedBotData } from "@/lib/types"
import { ExternalLink } from "lucide-react"
import { createContext, ReactNode, useContext, useState } from "react"

interface SelectedBotsContextType {
    selectedBots: FormattedBotData[]
    toggleBotSelection: (bot: FormattedBotData, selected?: boolean) => void
    clearSelectedBots: () => void
    isSelected: (botId: string) => boolean
    generateLogsUrl: (startDate: Date | null, endDate: Date | null, botIds?: string[]) => string
    hoveredBots: FormattedBotData[]
    setHoveredBots: (bots: FormattedBotData[]) => void
    selectBotsByCategory: (bots: FormattedBotData[], selected?: boolean) => void
}

const SelectedBotsContext = createContext<SelectedBotsContextType | undefined>(undefined)

export function SelectedBotsProvider({ children }: { children: ReactNode }) {
    const [selectedBots, setSelectedBots] = useState<FormattedBotData[]>([])
    const [hoveredBots, setHoveredBots] = useState<FormattedBotData[]>([])

    const toggleBotSelection = (bot: FormattedBotData, selected?: boolean) => {
        const isCurrentlySelected = selectedBots.some(selected => selected.uuid === bot.uuid)

        // If selected is explicitly provided, use that value
        const shouldBeSelected = selected !== undefined ? selected : !isCurrentlySelected

        if (shouldBeSelected && !isCurrentlySelected) {
            setSelectedBots([...selectedBots, bot])
        } else if (!shouldBeSelected && isCurrentlySelected) {
            setSelectedBots(selectedBots.filter(selected => selected.uuid !== bot.uuid))
        }
    }

    // Add a function to select all bots in a category at once
    const selectBotsByCategory = (bots: FormattedBotData[], selected?: boolean) => {
        if (bots.length === 0) return;

        // Check if all bots in this category are already selected
        const allAlreadySelected = bots.every(bot =>
            selectedBots.some(selected => selected.uuid === bot.uuid)
        );

        // If selected state is provided, use that, otherwise toggle based on current state
        const shouldSelect = selected !== undefined ? selected : !allAlreadySelected;

        if (shouldSelect) {
            // Add all bots that aren't already selected
            const botsToAdd = bots.filter(bot =>
                !selectedBots.some(selected => selected.uuid === bot.uuid)
            );

            if (botsToAdd.length > 0) {
                setSelectedBots([...selectedBots, ...botsToAdd]);
            }
        } else {
            // Remove all bots in this category
            const botUuids = new Set(bots.map(bot => bot.uuid));
            setSelectedBots(selectedBots.filter(bot => !botUuids.has(bot.uuid)));
        }
    }

    const clearSelectedBots = () => {
        setSelectedBots([])
    }

    const isSelected = (botId: string) => {
        return selectedBots.some(bot => bot.uuid === botId)
    }

    const generateLogsUrl = (startDate: Date | null, endDate: Date | null, botIds?: string[]) => {
        // Format start and end dates
        const startDateParam = startDate
            ? startDate.toISOString().split('.')[0] + 'Z'
            : ''

        const endDateParam = endDate
            ? endDate.toISOString().split('.')[0] + 'Z'
            : ''

        // Use provided botIds or take from selectedBots
        const botUuids = botIds || selectedBots.map(bot => bot.uuid)

        // Return URL with bot UUIDs, if any
        return botUuids.length > 0
            ? `https://logs.meetingbaas.com/?startDate=${encodeURIComponent(startDateParam)}&endDate=${encodeURIComponent(endDateParam)}&bot_uuid=${botUuids.join('%2C')}`
            : `https://logs.meetingbaas.com/?startDate=${encodeURIComponent(startDateParam)}&endDate=${encodeURIComponent(endDateParam)}`;
    }

    return (
        <SelectedBotsContext.Provider
            value={{
                selectedBots,
                toggleBotSelection,
                clearSelectedBots,
                isSelected,
                generateLogsUrl,
                hoveredBots,
                setHoveredBots,
                selectBotsByCategory
            }}
        >
            {children}
        </SelectedBotsContext.Provider>
    )
}

export function useSelectedBots() {
    const context = useContext(SelectedBotsContext)

    if (context === undefined) {
        throw new Error("useSelectedBots must be used within a SelectedBotsProvider")
    }

    return context
}

// A floating button component that shows information about selected/hovered bots
export function SelectedBotsButton({
    dateRange
}: {
    dateRange: { startDate: Date | null; endDate: Date | null }
}) {
    const { selectedBots, hoveredBots, generateLogsUrl, clearSelectedBots } = useSelectedBots()

    // Always show the component, even if no bots are selected
    const hasSelected = selectedBots.length > 0;
    const hasHovered = hoveredBots.length > 0;

    // Determine which UI to show based on selection and hover state
    const showSelectedUI = hasSelected;
    const showHoveredUI = hasHovered && !hasSelected; // Only show hover UI if not showing selection UI

    // Nothing to show if no selection and no hover
    if (!showSelectedUI && !showHoveredUI) {
        return (
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
                <Button
                    onClick={() => window.open(generateLogsUrl(dateRange.startDate, dateRange.endDate), '_blank')}
                    className="bg-primary/90 hover:bg-primary shadow-md"
                    size="default"
                >
                    View All Logs <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
            </div>
        );
    }

    // Generate proper labels
    const botCount = showSelectedUI ? selectedBots.length : hoveredBots.length;
    const botsToDisplay = showSelectedUI ? selectedBots : hoveredBots;
    const actionLabel = showSelectedUI ? 'Selected' : 'Highlighted';

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
            <div className="bg-background/95 border-2 border-primary shadow-xl rounded-lg p-4 flex flex-col gap-3 max-w-[320px] backdrop-blur-sm">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-base">
                        {botCount} {botCount === 1 ? 'Bot' : 'Bots'} {actionLabel}
                    </span>
                    {showSelectedUI && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={clearSelectedBots}
                            className="h-7 px-3 flex items-center gap-1"
                        >
                            Clear All
                        </Button>
                    )}
                </div>

                <div className="text-xs text-foreground/80 max-h-[80px] overflow-auto border-l-2 border-primary/20 pl-2">
                    {botsToDisplay.slice(0, 5).map(bot => (
                        <div key={bot.uuid} className="truncate py-0.5">
                            {bot.uuid.substring(0, 8)}...{bot.uuid.substring(bot.uuid.length - 4)} - {bot.status.value}
                        </div>
                    ))}
                    {botsToDisplay.length > 5 && (
                        <div className="italic text-muted-foreground">+ {botsToDisplay.length - 5} more</div>
                    )}
                    {showSelectedUI && botCount > 1 && (
                        <div className="mt-2 text-primary font-medium">
                            Multi-select mode - click to add more
                        </div>
                    )}
                </div>

                <Button
                    onClick={() => {
                        const botIds = showSelectedUI ? undefined : hoveredBots.map(bot => bot.uuid);
                        window.open(generateLogsUrl(dateRange.startDate, dateRange.endDate, botIds), '_blank');
                    }}
                    className="w-full flex items-center justify-center gap-1 bg-primary/90 hover:bg-primary"
                    size="default"
                >
                    View {showSelectedUI ? 'Selected' : 'Highlighted'} Logs <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
    )
} 