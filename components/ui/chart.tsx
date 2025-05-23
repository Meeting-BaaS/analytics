"use client"

import { cn } from "@/lib/utils"
import { createContext, useContext, type ReactElement, type ReactNode } from "react"
import * as RechartsComponents from "recharts"

export interface ChartConfig {
  [key: string]: {
    label?: ReactNode
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
    color?: string
  }
}

interface ChartContextValue {
  config: ChartConfig
}

const ChartContext = createContext<ChartContextValue | null>(null)

export function ChartContainer({
  config,
  children,
  className
}: {
  config: ChartConfig
  children: ReactElement | ReactElement[]
  className?: string
}) {
  // Set custom CSS variables for colors based on config
  const style = Object.entries(config).reduce((style, [key, value]) => {
    if (value.color) {
      style[`--color-${key}`] = value.color
    }
    return style
  }, {} as Record<string, string>)

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn("chart", className)} style={style}>
        {children}
      </div>
    </ChartContext.Provider>
  )
}

export function useChartConfig() {
  const context = useContext(ChartContext)
  if (!context) {
    throw new Error("useChartConfig must be used within a ChartContainer")
  }
  return context
}

// Custom tooltip for charts
interface ChartTooltipContentProps {
  label?: string
  payload?: any[]
  formatter?: (value: any) => string
  active?: boolean
  labelFormatter?: (label: string) => string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  labelFormatter
}: ChartTooltipContentProps) {
  const { config } = useChartConfig()

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      {label && (
        <div className="mb-2 text-center text-sm font-medium">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((item: any, index) => {
          // Get config for the current dataKey, using it for label and color
          const key = item.dataKey as string
          const value = item.value
          const chartItem = config[key]
          const name = chartItem?.label || key

          return (
            <div key={`item-${index}`} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: chartItem?.color || item.color }}
              />
              {chartItem?.icon && <chartItem.icon />}
              <span className="text-xs">{name}</span>
              <span className="ml-auto text-xs font-medium">
                {formatter ? formatter(value) : value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartTooltip(props: any) {
  // This component just wraps the recharts Tooltip component
  return (
    <RechartsComponents.Tooltip
      cursor={{ opacity: 0.1 }}
      offset={10}
      wrapperStyle={{ outline: "none" }}
      {...props}
    />
  )
}

// Custom legend
interface ChartLegendContentProps {
  payload?: Array<{
    value: string
    type: string
    id: string
    color: string
  }>
}

export function ChartLegendContent({ payload }: ChartLegendContentProps) {
  const { config } = useChartConfig()

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
      {payload?.map((entry) => {
        // Map the entry.value (which is dataKey) to the config
        const chartItem = config[entry.value]
        const name = chartItem?.label || entry.value
        const Icon = chartItem?.icon

        return (
          <div key={`item-${entry.value}`} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: chartItem?.color || entry.color }}
            />
            {Icon && <Icon />}
            <span className="text-xs">{name}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ChartLegend(props: any) {
  return <RechartsComponents.Legend verticalAlign="top" height={36} {...props} />
}

// Export recharts components
export const recharts = RechartsComponents
