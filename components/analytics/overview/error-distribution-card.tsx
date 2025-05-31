"use client"

import { AnimatedNumber } from "@/components/ui/animated-number"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSelectedBots } from "@/hooks/use-selected-bots"
import { useSelectedErrorContext } from "@/hooks/use-selected-error-context"
import { getErrorTable } from "@/lib/format-bot-stats"
import type { ErrorDistribution, FormattedBotData } from "@/lib/types"
import { cn, formatNumber, formatPercentage } from "@/lib/utils"
import { scaleOrdinal } from "d3-scale"
import { schemeTableau10 } from "d3-scale-chromatic"
import { debounce, groupBy } from "lodash-es"
import { Check, CheckSquare, ChevronDown, ChevronRight, RotateCcw, Square } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Cell,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  type TooltipProps as RechartsTooltipProps
} from "recharts"

interface ErrorDistributionCardProps {
  errorDistributionData: ErrorDistribution[]
  totalErrors: number
}

interface ExpandedErrorItem {
  name: string
  value: number
  percentage: number
  isSubtype?: boolean
  parentType?: string
  botUuids?: string[]
}

function ErrorDistributionTooltip(props: RechartsTooltipProps<number, string>) {
  const { active, payload } = props

  if (!active || !payload?.length) return null

  const data = payload[0]
  const value = Number(data.value)

  return (
    <div className="z-50 rounded-lg border bg-background p-2 shadow-sm">
      <p className="mb-2 font-medium text-sm">{data.name}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: data.payload.fill }} />
          <span className="ml-auto font-medium">
            {formatNumber(value)} ({formatPercentage(data.payload.percentage)})
          </span>
        </div>
      </div>
    </div>
  )
}

export function ErrorDistributionCard({
  errorDistributionData,
  totalErrors
}: ErrorDistributionCardProps) {
  const context = useSelectedErrorContext()
  if (!context) {
    throw new Error("ErrorDistributionCard must be used within a SelectedErrorProvider")
  }

  const {
    selectedErrorValues,
    addErrorValue,
    removeErrorValue,
    selectAll,
    selectNone,
    selectDefault,
    filteredBots,
    allBots
  } = context

  const { setHoveredBots, selectBotsByCategory } = useSelectedBots()
  const [filteredData, setFilteredData] = useState(errorDistributionData)
  const [filteredTotal, setFilteredTotal] = useState(totalErrors)
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())
  const [selectedSubtypes, setSelectedSubtypes] = useState<Set<string>>(new Set())

  // Get all error bots for the selected main error types (from global context)
  const allErrorBots = useMemo(() => {
    return allBots.filter((bot: FormattedBotData) => {
      if (!["error", "warning"].includes(bot.status.type)) return false
      return selectedErrorValues.includes(bot.status.value)
    })
  }, [allBots, selectedErrorValues])

  // Check if an error type can be expanded (has subtypes)
  const canExpand = useCallback((errorType: string): boolean => {
    const errorBots = allErrorBots.filter((bot: FormattedBotData) => bot.status.value === errorType)
    const errorDistribution = groupBy(errorBots, "status.value")
    const errorTableData = getErrorTable(errorDistribution)
    const subtypes = errorTableData.filter(entry => entry.originalType === errorType)
    return subtypes.length > 1
  }, [allErrorBots])

  // Get locally filtered bots based on selected subtypes
  const locallyFilteredBots = useMemo(() => {
    if (selectedSubtypes.size === 0) {
      return filteredBots
    }

    // Get detailed error table data for subtype filtering
    const errorDistribution = groupBy(allErrorBots, "status.value")
    const errorTableData = getErrorTable(errorDistribution)

    // Get all UUIDs for selected subtypes
    const selectedSubtypeUuids = new Set<string>()

    errorTableData.forEach((entry) => {
      const subtypeName = entry.type === entry.originalType ? entry.message : entry.type
      const subtypeKey = `${entry.originalType}::${subtypeName}`

      if (selectedSubtypes.has(subtypeKey)) {
        entry.botUuids.forEach(uuid => selectedSubtypeUuids.add(uuid))
      }
    })

    // Filter bots: include success/pending + error/warning bots that match criteria
    return filteredBots.filter((bot: FormattedBotData) => {
      // Always include success and pending bots
      if (bot.status.type === "pending" || bot.status.type === "success") {
        return true
      }

      const errorType = bot.status.value
      const hasExpandableSubtypes = canExpand(errorType)

      if (hasExpandableSubtypes && selectedErrorValues.includes(errorType)) {
        // If this error type has expandable subtypes and is selected,
        // only include if the bot's UUID is in selected subtypes
        return selectedSubtypeUuids.has(bot.uuid)
      } else {
        // If this error type doesn't have expandable subtypes, include all bots of this type
        return selectedErrorValues.includes(bot.status.value)
      }
    })
  }, [filteredBots, selectedSubtypes, allErrorBots, canExpand, selectedErrorValues])

  // Memoize bots by error type for better performance (use locally filtered bots for interactions)
  const botsByErrorType = useMemo(() => {
    return locallyFilteredBots.reduce(
      (acc, bot: FormattedBotData) => {
        const errorType = bot.status.value
        if (!acc[errorType]) {
          acc[errorType] = []
        }
        acc[errorType].push(bot)
        return acc
      },
      {} as Record<string, FormattedBotData[]>
    )
  }, [locallyFilteredBots])

  // Get all available subtypes for managing selection state - use unfiltered data
  const allSubtypes = useMemo(() => {
    const subtypes = new Set<string>()
    // Use allErrorBots which includes all error bots for the selected main error types (unfiltered by subtypes)
    const errorDistribution = groupBy(allErrorBots, "status.value")
    const errorTableData = getErrorTable(errorDistribution)
    const errorTableByType = groupBy(errorTableData, "originalType")

    errorDistributionData.forEach((item) => {
      const itemSubtypes = errorTableByType[item.name] || []
      if (itemSubtypes.length > 1) {
        itemSubtypes.forEach((subtype) => {
          const subtypeName = subtype.type === item.name ? subtype.message : subtype.type
          const subtypeKey = `${item.name}::${subtypeName}`
          subtypes.add(subtypeKey)
        })
      }
    })

    return subtypes
  }, [errorDistributionData, allErrorBots])

  // Get expanded error data with subtypes - use unfiltered data for available options, filtered data for counts
  const expandedErrorData = useMemo((): ExpandedErrorItem[] => {
    const items: ExpandedErrorItem[] = []

    // Use allErrorBots to get all available subtypes (unfiltered by subtype selection)
    const allErrorDistribution = groupBy(allErrorBots, "status.value")
    const allErrorTableData = getErrorTable(allErrorDistribution)

    // Group error table data by original type
    const errorTableByType = groupBy(allErrorTableData, "originalType")

    errorDistributionData.forEach((item) => {
      // Add the main error type with current filtered counts
      const currentFilteredCount = locallyFilteredBots.filter((bot: FormattedBotData) =>
        ["error", "warning"].includes(bot.status.type) && bot.status.value === item.name
      ).length

      items.push({
        name: item.name,
        value: currentFilteredCount,
        percentage: currentFilteredCount > 0 ? (currentFilteredCount / locallyFilteredBots.filter((bot: FormattedBotData) => ["error", "warning"].includes(bot.status.type)).length) * 100 : 0
      })

      // Check if this error type should be expanded and has subtypes
      if (expandedErrors.has(item.name)) {
        const subtypes = errorTableByType[item.name] || []

        // Only show subtypes if there are multiple distinct subtypes
        if (subtypes.length > 1) {
          subtypes.forEach((subtype) => {
            const subtypeName = subtype.type === item.name ? subtype.message : subtype.type

            // Calculate current filtered count for this subtype
            const currentSubtypeCount = locallyFilteredBots.filter((bot: FormattedBotData) =>
              subtype.botUuids.includes(bot.uuid)
            ).length

            const subtypePercentage = currentFilteredCount > 0 ? (currentSubtypeCount / currentFilteredCount) * 100 : 0

            items.push({
              name: subtypeName,
              value: currentSubtypeCount,
              percentage: subtypePercentage,
              isSubtype: true,
              parentType: item.name,
              botUuids: subtype.botUuids
            })
          })
        }
      }
    })

    return items
  }, [errorDistributionData, expandedErrors, allErrorBots, locallyFilteredBots])

  // Debounced hover handler to prevent rapid state updates
  const debouncedSetHoveredBots = useMemo(
    () => debounce((bots: FormattedBotData[]) => setHoveredBots(bots), 100),
    [setHoveredBots]
  )

  // Handle cell hover
  const handleCellHover = useCallback(
    (entry: ExpandedErrorItem) => {
      let botsWithError: FormattedBotData[] = []

      if (entry.isSubtype && entry.botUuids) {
        // For subtypes, find bots by UUID
        botsWithError = locallyFilteredBots.filter((bot: FormattedBotData) => entry.botUuids!.includes(bot.uuid))
      } else {
        // For main types, get all bots with that error type
        botsWithError = botsByErrorType[entry.name] || []
      }

      if (botsWithError.length > 0) {
        debouncedSetHoveredBots(botsWithError)
      }
    },
    [botsByErrorType, locallyFilteredBots, debouncedSetHoveredBots]
  )

  // Handle cell leave
  const handleCellLeave = useCallback(() => {
    debouncedSetHoveredBots([])
  }, [debouncedSetHoveredBots])

  // Handle cell click
  const handleCellClick = useCallback(
    (entry: ExpandedErrorItem) => {
      let botsWithError: FormattedBotData[] = []

      if (entry.isSubtype && entry.botUuids) {
        // For subtypes, find bots by UUID
        botsWithError = locallyFilteredBots.filter((bot: FormattedBotData) => entry.botUuids!.includes(bot.uuid))
      } else {
        // For main types, get all bots with that error type
        botsWithError = botsByErrorType[entry.name] || []
      }

      if (botsWithError.length > 0) {
        selectBotsByCategory(botsWithError)
      }
    },
    [botsByErrorType, locallyFilteredBots, selectBotsByCategory]
  )

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSetHoveredBots.cancel()
    }
  }, [debouncedSetHoveredBots])

  // Update filtered data when selection changes or new data arrives
  useEffect(() => {
    // If we have no valid selections, show no data
    if (selectedErrorValues.length === 0) {
      setFilteredData([])
      setFilteredTotal(0)
      return
    }

    // Use the locally filtered bots for calculating distribution
    const filteredErrorBots = locallyFilteredBots.filter((bot: FormattedBotData) => ["error", "warning"].includes(bot.status.type))
    const distribution = groupBy(filteredErrorBots, "status.value")

    // Create chart data that includes expanded subtypes
    const chartData: ErrorDistribution[] = []

    errorDistributionData
      .filter((item) => selectedErrorValues.includes(item.name))
      .forEach((item) => {
        const currentCount = distribution[item.name]?.length || 0

        if (currentCount === 0) return

        // Check if this error type is expanded and has subtypes
        if (expandedErrors.has(item.name)) {
          // Get subtypes for this error type
          const allErrorDistribution = groupBy(allErrorBots, "status.value")
          const allErrorTableData = getErrorTable(allErrorDistribution)
          const subtypes = allErrorTableData.filter(entry => entry.originalType === item.name)

          if (subtypes.length > 1) {
            // Add individual subtypes to chart data
            subtypes.forEach((subtype, index) => {
              const subtypeName = subtype.type === item.name ? subtype.message : subtype.type
              const currentSubtypeCount = locallyFilteredBots.filter((bot: FormattedBotData) =>
                subtype.botUuids.includes(bot.uuid)
              ).length

              if (currentSubtypeCount > 0) {
                chartData.push({
                  name: subtypeName,
                  value: currentSubtypeCount,
                  percentage: (currentSubtypeCount / filteredErrorBots.length) * 100,
                  // Add metadata for styling and interactions
                  isSubtype: true,
                  parentType: item.name,
                  subtypeIndex: index,
                  botUuids: subtype.botUuids
                } as ErrorDistribution & {
                  isSubtype?: boolean
                  parentType?: string
                  subtypeIndex?: number
                  botUuids?: string[]
                })
              }
            })
          } else {
            // Single subtype, show as main type
            chartData.push({
              name: item.name,
              value: currentCount,
              percentage: (currentCount / filteredErrorBots.length) * 100
            })
          }
        } else {
          // Not expanded, show as main type
          chartData.push({
            name: item.name,
            value: currentCount,
            percentage: (currentCount / filteredErrorBots.length) * 100
          })
        }
      })

    setFilteredData(chartData)
    setFilteredTotal(chartData.reduce((sum, item) => sum + item.value, 0))
  }, [errorDistributionData, selectedErrorValues, locallyFilteredBots, expandedErrors, allErrorBots])

  // Create a color scale that handles both main types and subtypes
  const getColor = useCallback((name: string, isSubtype?: boolean, parentType?: string, subtypeIndex?: number) => {
    const scale = scaleOrdinal()
      .domain(errorDistributionData.map((d) => d.name))
      .range(schemeTableau10)

    if (isSubtype && parentType) {
      const baseColor = scale(parentType) as string
      // Create variations using opacity and hue adjustments
      const opacity = Math.max(0.6, 1 - (subtypeIndex || 0) * 0.2)
      return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
    }
    return scale(name) as string
  }, [errorDistributionData])

  // Chart configuration
  const chartConfig = useMemo(() => {
    return filteredData.reduce(
      (acc, item: any) => {
        const colorKey = item.isSubtype ? `${item.parentType}-${item.name}` : item.name
        acc[colorKey] = {
          label: item.name,
          color: getColor(item.name, item.isSubtype, item.parentType, item.subtypeIndex)
        }
        return acc
      },
      {} as Record<string, { label: string; color: string }>
    )
  }, [filteredData, getColor])

  // Handle chart cell hover for subtypes
  const handleChartCellHover = useCallback(
    (data: any) => {
      if (data.isSubtype && data.botUuids) {
        // For subtypes, find bots by UUID
        const botsWithError = locallyFilteredBots.filter((bot: FormattedBotData) => data.botUuids.includes(bot.uuid))
        if (botsWithError.length > 0) {
          debouncedSetHoveredBots(botsWithError)
        }
      } else {
        // For main types, get all bots with that error type
        const botsWithError = botsByErrorType[data.name] || []
        if (botsWithError.length > 0) {
          debouncedSetHoveredBots(botsWithError)
        }
      }
    },
    [botsByErrorType, locallyFilteredBots, debouncedSetHoveredBots]
  )

  // Handle chart cell click for subtypes
  const handleChartCellClick = useCallback(
    (data: any) => {
      if (data.isSubtype && data.botUuids) {
        // For subtypes, find bots by UUID
        const botsWithError = locallyFilteredBots.filter((bot: FormattedBotData) => data.botUuids.includes(bot.uuid))
        if (botsWithError.length > 0) {
          selectBotsByCategory(botsWithError)
        }
      } else {
        // For main types, get all bots with that error type
        const botsWithError = botsByErrorType[data.name] || []
        if (botsWithError.length > 0) {
          selectBotsByCategory(botsWithError)
        }
      }
    },
    [botsByErrorType, locallyFilteredBots, selectBotsByCategory]
  )

  // Handle legend click
  const handleLegendClick = (errorValue: string) => {
    if (selectedErrorValues.includes(errorValue)) {
      removeErrorValue(errorValue)
    } else {
      addErrorValue(errorValue)
    }
  }

  // Handle subtype selection
  const handleSubtypeClick = (parentType: string, subtypeName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const subtypeKey = `${parentType}::${subtypeName}`

    if (selectedSubtypes.has(subtypeKey)) {
      setSelectedSubtypes(prev => {
        const newSet = new Set(prev)
        newSet.delete(subtypeKey)
        return newSet
      })
    } else {
      setSelectedSubtypes(prev => {
        const newSet = new Set(prev)
        newSet.add(subtypeKey)
        return newSet
      })
    }
  }

  // Handle expand/collapse toggle
  const toggleExpanded = (errorType: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(errorType)) {
        newSet.delete(errorType)
      } else {
        newSet.add(errorType)
      }
      return newSet
    })
  }

  // Handle select all/none
  const handleSelectAll = () => {
    selectAll(errorDistributionData.map((item) => item.name))
  }

  const handleSelectNone = () => {
    selectNone()
  }

  // Handle select default with subtypes
  const handleSelectDefault = () => {
    selectDefault()
  }

  // Check if a subtype is selected
  const isSubtypeSelected = (parentType: string, subtypeName: string): boolean => {
    const subtypeKey = `${parentType}::${subtypeName}`
    return selectedSubtypes.has(subtypeKey)
  }

  // Sort error types alphabetically
  const sortedErrorTypes = useMemo(() => {
    return [...errorDistributionData].sort((a, b) => a.name.localeCompare(b.name))
  }, [errorDistributionData])

  return (
    <Card className="dark:bg-baas-black">
      <CardHeader>
        <CardTitle>Error Type Summary</CardTitle>
        <CardDescription>Distribution of errors by type</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Donut Chart */}
          <div className="w-full md:w-1/2">
            <div className="relative h-80">
              <ChartContainer config={chartConfig} className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredData}
                      cx="50%"
                      cy="50%"
                      innerRadius={90}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      strokeWidth={0}
                      animationDuration={800}
                      onMouseEnter={(data) => handleChartCellHover(data)}
                      onMouseLeave={handleCellLeave}
                      className="cursor-pointer"
                      onClick={(data) => handleChartCellClick(data)}
                    >
                      {filteredData.map((entry: any) => (
                        <Cell
                          key={entry.isSubtype ? `${entry.parentType}-${entry.name}` : entry.name}
                          fill={getColor(entry.name, entry.isSubtype, entry.parentType, entry.subtypeIndex)}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={ErrorDistributionTooltip}
                      cursor={false}
                      wrapperStyle={{ outline: "none", zIndex: 10 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, delay: 1.2, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <span className="font-bold text-4xl">
                      <AnimatedNumber value={filteredTotal} />
                    </span>
                    <span className="text-muted-foreground text-sm">Errors</span>
                  </motion.div>
                </AnimatePresence>
              </ChartContainer>
            </div>
          </div>

          {/* Interactive Legend */}
          <div className="md:-mt-16 grow space-y-4">
            <div className="flex items-center justify-between md:pr-4">
              <div>
                <div className="font-medium text-sm">Error Types</div>
                <div className="text-muted-foreground text-xs">
                  {selectedErrorValues.length === 0
                    ? "No error types selected"
                    : `${selectedErrorValues.length} of ${errorDistributionData.length} available error types selected`}
                  {selectedSubtypes.size > 0 && (
                    <span className="ml-2">• {selectedSubtypes.size} subtypes selected</span>
                  )}
                </div>
              </div>
              <TooltipProvider>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSelectAll}
                        disabled={selectedErrorValues.length === errorDistributionData.length}
                        aria-label="Select All"
                      >
                        <CheckSquare />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Select All</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSelectNone}
                        disabled={selectedErrorValues.length === 0 && selectedSubtypes.size === 0}
                        aria-label="Select None"
                      >
                        <Square />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Select None</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSelectDefault}
                        aria-label="Reset to Default Selection"
                      >
                        <RotateCcw />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset to Default Selection</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
            <ScrollArea className="h-80 md:pr-4">
              <div className="space-y-2">
                <AnimatePresence>
                  {sortedErrorTypes.length > 0 ? (
                    sortedErrorTypes.map((item) => (
                      <div key={item.name}>
                        {/* Main error type */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md p-3 transition-colors",
                            selectedErrorValues.includes(item.name) && "bg-muted",
                            "hover:bg-muted/50"
                          )}
                        >
                          {/* Expand/collapse button */}
                          {canExpand(item.name) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpanded(item.name)
                              }}
                              className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                            >
                              {expandedErrors.has(item.name) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                          )}
                          {!canExpand(item.name) && <div className="w-4" />}

                          {/* Color indicator and name */}
                          <button
                            type="button"
                            className="flex flex-1 items-center gap-2"
                            onClick={() => handleLegendClick(item.name)}
                          >
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: getColor(item.name) as string,
                                opacity: selectedErrorValues.includes(item.name) ? 1 : 0.3
                              }}
                            />
                            <span className="flex-1 truncate text-left text-sm">{item.name}</span>
                            <span className="font-medium text-sm">{formatNumber(item.value)}</span>
                          </button>
                        </motion.div>

                        {/* Subtypes */}
                        <AnimatePresence>
                          {expandedErrors.has(item.name) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="ml-6 overflow-hidden"
                            >
                              {expandedErrorData
                                .filter(subItem => subItem.isSubtype && subItem.parentType === item.name)
                                .map((subItem, index) => {
                                  const isSelected = isSubtypeSelected(item.name, subItem.name)
                                  return (
                                    <motion.div
                                      key={`${subItem.parentType}-${subItem.name}-${index}`}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -10 }}
                                      transition={{ duration: 0.2, delay: index * 0.05 }}
                                      className={cn(
                                        "flex w-full items-center gap-2 rounded-md p-2 text-sm transition-colors hover:bg-muted/30",
                                        isSelected && "bg-muted/20"
                                      )}
                                    >
                                      {/* Selection checkbox */}
                                      <button
                                        type="button"
                                        onClick={(e) => handleSubtypeClick(item.name, subItem.name, e)}
                                        className="flex h-4 w-4 items-center justify-center rounded border border-border transition-colors hover:border-foreground"
                                        style={{
                                          backgroundColor: isSelected ? getColor(item.name) as string : 'transparent'
                                        }}
                                      >
                                        {isSelected && <Check className="h-2.5 w-2.5 text-background" />}
                                      </button>

                                      {/* Subtype content */}
                                      <button
                                        type="button"
                                        className="flex flex-1 items-center gap-2"
                                        onClick={() => handleCellClick(subItem)}
                                        onMouseEnter={() => handleCellHover(subItem)}
                                        onMouseLeave={handleCellLeave}
                                      >
                                        <div
                                          className="h-2 w-2 rounded-full opacity-70"
                                          style={{
                                            backgroundColor: getColor(item.name) as string
                                          }}
                                        />
                                        <span className="flex-1 truncate text-left text-muted-foreground">
                                          {subItem.name}
                                        </span>
                                        <span className="font-medium text-muted-foreground text-xs">
                                          {formatNumber(subItem.value)}
                                        </span>
                                      </button>
                                    </motion.div>
                                  )
                                })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-sm">No error types available</div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
