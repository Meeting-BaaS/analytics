"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { formatNumber, formatPercentage } from "@/lib/utils"
import { useMemo, useState, useEffect } from "react"
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  type TooltipProps as RechartsTooltipProps
} from "recharts"
import { scaleOrdinal } from "d3-scale"
import { schemeTableau10 } from "d3-scale-chromatic"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AnimatedNumber } from "@/components/ui/animated-number"
import type { ErrorDistribution } from "@/lib/types"
import { useSelectedErrorContext } from "@/hooks/use-selected-error-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckSquare, Square, RotateCcw } from "lucide-react"

interface ErrorDistributionCardProps {
  errorDistributionData: ErrorDistribution[]
  totalErrors: number
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
  const {
    selectedErrorValues,
    addErrorValue,
    removeErrorValue,
    selectAll,
    selectNone,
    selectDefault
  } = useSelectedErrorContext()
  const [filteredData, setFilteredData] = useState(errorDistributionData)
  const [filteredTotal, setFilteredTotal] = useState(totalErrors)

  // Update filtered data when selection changes or new data arrives
  useEffect(() => {
    // If we have no valid selections, show no data
    if (selectedErrorValues.length === 0) {
      setFilteredData([])
      setFilteredTotal(0)
      return
    }

    // Filter the data based on valid selections
    const filtered = errorDistributionData.filter((item) => selectedErrorValues.includes(item.name))
    setFilteredData(filtered)
    setFilteredTotal(filtered.reduce((sum, item) => sum + item.value, 0))
  }, [errorDistributionData, selectedErrorValues])

  // Create a color scale based on the number of error types
  const colorScale = useMemo(() => {
    return scaleOrdinal()
      .domain(errorDistributionData.map((d) => d.name))
      .range(schemeTableau10)
  }, [errorDistributionData])

  // Chart configuration
  const chartConfig = useMemo(() => {
    return errorDistributionData.reduce(
      (acc, item) => {
        acc[item.name] = {
          label: item.name,
          color: colorScale(item.name) as string
        }
        return acc
      },
      {} as Record<string, { label: string; color: string }>
    )
  }, [errorDistributionData, colorScale])

  // Handle legend click
  const handleLegendClick = (errorValue: string) => {
    if (selectedErrorValues.includes(errorValue)) {
      removeErrorValue(errorValue)
    } else {
      addErrorValue(errorValue)
    }
  }

  // Handle select all/none
  const handleSelectAll = () => {
    selectAll(errorDistributionData.map((item) => item.name))
  }

  const handleSelectNone = () => {
    selectNone()
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
                    >
                      {filteredData.map((entry) => (
                        <Cell key={entry.name} fill={colorScale(entry.name) as string} />
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
                        disabled={selectedErrorValues.length === 0}
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
                        onClick={selectDefault}
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
                      <motion.button
                        type="button"
                        key={item.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md p-3 transition-colors",
                          selectedErrorValues.includes(item.name) && "bg-muted",
                          "hover:bg-muted/50"
                        )}
                        onClick={() => handleLegendClick(item.name)}
                      >
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: colorScale(item.name) as string,
                            opacity: selectedErrorValues.includes(item.name) ? 1 : 0.3
                          }}
                        />
                        <span className="flex-1 truncate text-left text-sm">{item.name}</span>
                        <span className="font-medium text-sm">{formatNumber(item.value)}</span>
                      </motion.button>
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
