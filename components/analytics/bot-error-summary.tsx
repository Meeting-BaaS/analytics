"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useSelectedBots } from "@/contexts/selected-bots-context"
import { chartColors } from "@/lib/chart-colors"
import type { ErrorType, FormattedBotData } from "@/lib/types"
import { formatNumber, formatPercentage } from "@/lib/utils"
import { useMemo, useState } from "react"

interface BotErrorSummaryProps {
    errorBots: FormattedBotData[]
    errorTypes: ErrorType[]
    onSelectBots: (bots: FormattedBotData[], toggle?: boolean) => void
}

type CrossTabDimension = "category" | "priority" | "platform"

interface CrossTabRow {
    dimension: string
    [key: string]: FormattedBotData[] | string
}

export function BotErrorSummary({ errorBots, errorTypes, onSelectBots }: BotErrorSummaryProps) {
    const [primaryDimension, setPrimaryDimension] = useState<CrossTabDimension>("category")
    const [secondaryDimension, setSecondaryDimension] = useState<CrossTabDimension>("platform")
    const { setHoveredBots, selectedBots } = useSelectedBots()

    // Helper function to toggle a selection
    const toggleSelection = (bots: FormattedBotData[]) => {
        // Check if all bots are already selected
        const allSelected = bots.every(bot =>
            selectedBots.some(selected => selected.uuid === bot.uuid));

        if (allSelected) {
            // Deselect all these bots
            onSelectBots(bots, false);
        } else {
            // Add these bots to the selection
            onSelectBots(bots, true);
        }
    }

    // Generate cross-tabulation data
    const crossTabData = useMemo(() => {
        // Extract unique values for each dimension
        const uniqueCategories = [...new Set(errorBots.map(bot => bot.status.category || "unknown"))].sort()
        const uniquePriorities = [...new Set(errorTypes.map(type => type.priority || "none"))].sort()
        const uniquePlatforms = [...new Set(errorBots.map(bot => bot.platform))].sort()

        // Get dimension values based on selection
        const getDimensionValues = (dimension: CrossTabDimension): string[] => {
            switch (dimension) {
                case "category": return uniqueCategories
                case "priority": return uniquePriorities
                case "platform": return uniquePlatforms
                default: return []
            }
        }

        // Get dimension value for a bot
        const getDimensionValue = (bot: FormattedBotData, dimension: CrossTabDimension): string => {
            switch (dimension) {
                case "category": return bot.status.category || "unknown"
                case "priority":
                    const errorType = errorTypes.find(type => type.type === bot.status.value)
                    return errorType?.priority || "none"
                case "platform": return bot.platform
                default: return ""
            }
        }

        const rows = getDimensionValues(primaryDimension)
        const columns = getDimensionValues(secondaryDimension)

        // Create the data structure for the cross-tab
        const data: CrossTabRow[] = rows.map(row => {
            const rowData: CrossTabRow = {
                dimension: row
            }

            // Initialize all columns with empty arrays
            columns.forEach(col => {
                rowData[col] = []
            })

            // Populate with bots that match both dimensions
            errorBots.forEach(bot => {
                const botPrimaryValue = getDimensionValue(bot, primaryDimension)
                const botSecondaryValue = getDimensionValue(bot, secondaryDimension)

                if (botPrimaryValue === row && columns.includes(botSecondaryValue)) {
                    (rowData[botSecondaryValue] as FormattedBotData[]).push(bot)
                }
            })

            // Add totals
            rowData["total"] = Object.entries(rowData)
                .filter(([key]) => key !== "dimension" && key !== "total")
                .flatMap(([_, bots]) => bots as FormattedBotData[])

            return rowData
        })

        // Calculate totals for each column
        const columnTotals: CrossTabRow = {
            dimension: "Total"
        }

        columns.forEach(col => {
            columnTotals[col] = data.flatMap(row => row[col] as FormattedBotData[])
        })

        columnTotals["total"] = errorBots

        return {
            rows,
            columns,
            data: [...data, columnTotals]
        }
    }, [errorBots, errorTypes, primaryDimension, secondaryDimension])

    // Get dimension display name
    const getDimensionDisplayName = (dimension: CrossTabDimension) => {
        switch (dimension) {
            case "category": return "Error Category"
            case "priority": return "Error Priority"
            case "platform": return "Platform"
            default: return dimension
        }
    }

    // Format dimension value for display
    const formatDimensionValue = (dimension: CrossTabDimension, value: string) => {
        if (dimension === "category") {
            const categoryMap: Record<string, string> = {
                "system_error": "System",
                "auth_error": "Auth",
                "capacity_error": "Capacity",
                "connection_error": "Connection",
                "permission_error": "Permission",
                "input_error": "Input",
                "duplicate_error": "Duplicate",
                "webhook_error": "Webhook",
                "api_error": "API",
                "unknown_error": "Unknown",
                "unknown": "Unknown"
            }
            return categoryMap[value] || value
        }

        if (dimension === "priority") {
            return value.charAt(0).toUpperCase() + value.slice(1)
        }

        return value
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                    <span>Error Cross-tabulation</span>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Primary:</span>
                        <select
                            value={primaryDimension}
                            onChange={e => setPrimaryDimension(e.target.value as CrossTabDimension)}
                            className="bg-background border rounded px-2 py-1 text-xs"
                        >
                            <option value="category">Category</option>
                            <option value="priority">Priority</option>
                            <option value="platform">Platform</option>
                        </select>

                        <span className="text-muted-foreground ml-2">Secondary:</span>
                        <select
                            value={secondaryDimension}
                            onChange={e => setSecondaryDimension(e.target.value as CrossTabDimension)}
                            className="bg-background border rounded px-2 py-1 text-xs"
                        >
                            <option value="category" disabled={primaryDimension === "category"}>Category</option>
                            <option value="priority" disabled={primaryDimension === "priority"}>Priority</option>
                            <option value="platform" disabled={primaryDimension === "platform"}>Platform</option>
                        </select>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-32">{getDimensionDisplayName(primaryDimension)}</TableHead>
                                {crossTabData.columns.map(col => (
                                    <TableHead key={col} className="text-center">
                                        {formatDimensionValue(secondaryDimension, col)}
                                    </TableHead>
                                ))}
                                <TableHead className="text-center">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {crossTabData.data.map(row => (
                                <TableRow key={`row-${row.dimension}`} className={row.dimension === "Total" ? "font-medium" : ""}>
                                    <TableCell className="font-medium">
                                        {formatDimensionValue(primaryDimension, row.dimension as string)}
                                    </TableCell>

                                    {crossTabData.columns.map(col => {
                                        const bots = row[col] as FormattedBotData[]
                                        const isEmpty = bots.length === 0

                                        // Get a color based on the dimension values
                                        const getCellColor = () => {
                                            if (primaryDimension === "priority" || secondaryDimension === "priority") {
                                                const priority = primaryDimension === "priority" ? row.dimension : col
                                                switch (priority) {
                                                    case "critical": return { bg: "rgba(254, 27, 78, 0.1)", text: chartColors.error }
                                                    case "high": return { bg: "rgba(254, 128, 156, 0.1)", text: chartColors.errorMid }
                                                    case "medium": return { bg: "rgba(255, 255, 147, 0.1)", text: chartColors.warning }
                                                    case "low": return { bg: "rgba(120, 255, 240, 0.1)", text: chartColors.chart1 }
                                                    default: return {}
                                                }
                                            }

                                            // Add colors for categories
                                            if (primaryDimension === "category" || secondaryDimension === "category") {
                                                const category = primaryDimension === "category" ? row.dimension : col
                                                const categoryIndex = ["system_error", "auth_error", "capacity_error", "connection_error",
                                                    "permission_error", "input_error", "duplicate_error",
                                                    "webhook_error", "api_error", "unknown_error", "unknown"]
                                                    .indexOf(category as string);

                                                if (categoryIndex >= 0) {
                                                    const colorKey = `chart${(categoryIndex % 10) + 1}` as keyof typeof chartColors;
                                                    return {
                                                        bg: `${chartColors[colorKey]}20`, // 20 is hex for 12% opacity
                                                        text: chartColors[colorKey]
                                                    };
                                                }
                                            }

                                            // Add colors for platforms
                                            if (primaryDimension === "platform" || secondaryDimension === "platform") {
                                                const platform = primaryDimension === "platform" ? row.dimension : col
                                                const platformMap: Record<string, keyof typeof chartColors> = {
                                                    "zoom": "chart2",
                                                    "teams": "chart3",
                                                    "google meet": "chart4",
                                                    "unknown": "chart9"
                                                };

                                                const colorKey = platformMap[platform as string] || "chart1";
                                                return {
                                                    bg: `${chartColors[colorKey]}20`,
                                                    text: chartColors[colorKey]
                                                };
                                            }

                                            return {}
                                        }

                                        const cellColor = getCellColor()

                                        return (
                                            <TableCell
                                                key={`cell-${row.dimension}-${col}`}
                                                className={`text-center ${isEmpty ? 'text-muted-foreground' : 'cursor-pointer hover:bg-secondary/50'}`}
                                                style={{
                                                    backgroundColor: !isEmpty ? cellColor.bg : undefined,
                                                    color: !isEmpty ? cellColor.text : undefined
                                                }}
                                                onClick={() => !isEmpty && toggleSelection(bots)}
                                                onMouseEnter={() => !isEmpty && setHoveredBots(bots)}
                                                onMouseLeave={() => setHoveredBots([])}
                                            >
                                                <div className="flex flex-col items-center justify-center">
                                                    <span>{formatNumber(bots.length)}</span>
                                                    {!isEmpty && row.dimension !== "Total" && col !== "total" && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatPercentage((bots.length / errorBots.length) * 100)}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )
                                    })}

                                    <TableCell
                                        className={`text-center ${row.dimension !== "Total" ? 'cursor-pointer hover:bg-primary/10' : 'font-medium'}`}
                                        onClick={() => row.dimension !== "Total" && toggleSelection(row.total as FormattedBotData[])}
                                        onMouseEnter={() => row.dimension !== "Total" && setHoveredBots(row.total as FormattedBotData[])}
                                        onMouseLeave={() => setHoveredBots([])}
                                    >
                                        <div className="flex flex-col items-center justify-center">
                                            <span>{formatNumber((row.total as FormattedBotData[]).length)}</span>
                                            {row.dimension !== "Total" && (
                                                <span className="text-xs text-muted-foreground">
                                                    {formatPercentage(((row.total as FormattedBotData[]).length / errorBots.length) * 100)}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
} 