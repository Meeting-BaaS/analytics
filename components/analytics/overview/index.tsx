import { ErrorDistributionCard } from "@/components/analytics/overview/error-distribution-card"
import { ErrorTableCard } from "@/components/analytics/overview/error-table-card"
import type { ErrorTableData } from "@/components/analytics/overview/error-table-columns"
import { PlatformDistributionCard } from "@/components/analytics/overview/platform-distribution-card"
import { PlatformPerformanceCard } from "@/components/analytics/overview/platform-performance-card"
import type { ErrorDistribution, FormattedBotData, PlatformDistribution } from "@/lib/types"
import { useCallback, useMemo, useState } from "react"

interface OverviewProps {
  platformDistribution: PlatformDistribution[]
  allBots: FormattedBotData[]
  errorDistributionData: ErrorDistribution[]
  errorBots: FormattedBotData[]
  errorTableData: ErrorTableData[]
}

export default function Overview({
  platformDistribution,
  allBots,
  errorDistributionData,
  errorBots,
  errorTableData
}: OverviewProps) {
  // Track selected error types and filtered error count
  const [selectedErrorTypes, setSelectedErrorTypes] = useState<string[]>(() =>
    errorDistributionData.map((item) => item.name)
  )
  const [filteredErrorCount, setFilteredErrorCount] = useState(errorBots.length)

  // Handle filter changes from ErrorDistributionCard
  const handleFilterChange = useCallback((newSelectedErrorTypes: string[], newFilteredErrorCount: number) => {
    setSelectedErrorTypes(newSelectedErrorTypes)
    setFilteredErrorCount(newFilteredErrorCount)
  }, [])

  // Calculate filtered error bots based on selected error types
  const filteredErrorBots = useMemo(() => {
    if (selectedErrorTypes.length === 0) {
      return []
    }
    // Filter error bots by their status.value which matches the error distribution names
    return errorBots.filter(bot => selectedErrorTypes.includes(bot.status.value))
  }, [errorBots, selectedErrorTypes])

  // Recalculate platform distribution with filtered errors
  const adjustedPlatformDistribution = useMemo(() => {
    return platformDistribution.map(platform => {
      const platformTotalBots = allBots.filter(bot => bot.platform === platform.platform).length
      const platformFilteredErrors = filteredErrorBots.filter(bot => bot.platform === platform.platform).length
      const platformSuccessBots = platformTotalBots - platformFilteredErrors

      const successPercentage = platformTotalBots > 0 ? (platformSuccessBots / platformTotalBots) * 100 : 0
      const errorPercentage = platformTotalBots > 0 ? (platformFilteredErrors / platformTotalBots) * 100 : 0

      return {
        ...platform,
        statusDistribution: {
          success: {
            count: platformSuccessBots,
            percentage: successPercentage
          },
          error: {
            count: platformFilteredErrors,
            percentage: errorPercentage
          },
          warning: {
            count: 0,
            percentage: 0
          },
          other: {
            count: 0,
            percentage: 0
          }
        }
      }
    })
  }, [platformDistribution, allBots, filteredErrorBots])

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row">
        <PlatformDistributionCard
          platformDistribution={platformDistribution}
          totalBots={allBots.length}
        />
        <PlatformPerformanceCard platformDistribution={adjustedPlatformDistribution} />
      </div>
      <ErrorDistributionCard
        errorDistributionData={errorDistributionData}
        totalErrors={errorBots.length}
        onFilterChange={handleFilterChange}
      />
      <ErrorTableCard data={errorTableData} />
    </>
  )
}
