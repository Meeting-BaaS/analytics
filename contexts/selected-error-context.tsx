"use client"

import { getErrorTable } from "@/lib/format-bot-stats"
import type { ErrorDistribution, FormattedBotData } from "@/lib/types"
import { groupBy } from "lodash-es"
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

export const SELECTED_ERROR_STORAGE_KEY = "analytics-selected-errors"
export const SELECTED_SUBTYPES_STORAGE_KEY = "analytics-selected-subtypes"

// Non-critical errors that should be excluded from default selection
const NON_CRITICAL_ERRORS = [
  "Bot Not Accepted",
  "Insufficient Tokens",
  "Invalid Meeting URL",
  "Meeting Already Started",
  "Meeting Start Timeout",
  "Webhook Error"
]

interface SelectedErrorContextType {
  selectedErrorValues: string[]
  setSelectedErrorValues: (values: string[]) => void
  selectedSubtypes: Set<string>
  setSelectedSubtypes: (subtypes: Set<string>) => void
  addSubtype: (subtype: string) => void
  removeSubtype: (subtype: string) => void
  clearSubtypesForError: (errorType: string) => void
  reset: () => void
  addErrorValue: (value: string) => void
  removeErrorValue: (value: string) => void
  selectAll: (values: string[]) => void
  selectNone: () => void
  selectDefault: () => void
  filteredBots: FormattedBotData[]
  botsFilteredByError: boolean
  canExpand: (errorType: string) => boolean
}

export const SelectedErrorContext = createContext<SelectedErrorContextType | undefined>(undefined)

interface SelectedErrorProviderProps {
  children: ReactNode
  initialErrorDistribution: ErrorDistribution[]
  allBots: FormattedBotData[]
}

export function SelectedErrorProvider({
  children,
  initialErrorDistribution,
  allBots
}: SelectedErrorProviderProps) {
  const allErrorValues = useMemo(
    () => initialErrorDistribution.map((item) => item.name),
    [initialErrorDistribution]
  )

  // Get default error values (excluding non-critical errors)
  const defaultErrorValues = useMemo(
    () => allErrorValues.filter((value) => !NON_CRITICAL_ERRORS.includes(value)),
    [allErrorValues]
  )

  // Initialize from localStorage if available, otherwise use defaultErrorValues
  const [selectedErrorValues, setSelectedErrorValues] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultErrorValues

    const stored = localStorage.getItem(SELECTED_ERROR_STORAGE_KEY)
    if (!stored) return defaultErrorValues

    try {
      const parsed = JSON.parse(stored) as string[]
      // Validate stored values against available error types
      return parsed.filter((value) => allErrorValues.includes(value))
    } catch {
      return defaultErrorValues
    }
  })

  // Initialize subtypes from localStorage
  const [selectedSubtypes, setSelectedSubtypesState] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()

    const stored = localStorage.getItem(SELECTED_SUBTYPES_STORAGE_KEY)
    if (!stored) return new Set()

    try {
      const parsed = JSON.parse(stored) as string[]
      return new Set(parsed)
    } catch {
      return new Set()
    }
  })

  const [filteredBots, setFilteredBots] = useState<FormattedBotData[]>(allBots)

  // Check if an error type can be expanded (has subtypes)
  const canExpand = useCallback((errorType: string): boolean => {
    const errorBots = allBots.filter(bot => ["error", "warning"].includes(bot.status.type))
    const errorDistribution = groupBy(errorBots, "status.value")
    const errorTableData = getErrorTable(errorDistribution)
    const subtypes = errorTableData.filter(entry => entry.originalType === errorType)
    return subtypes.length > 1
  }, [allBots])

  const getFilteredBots = useCallback(
    (errorValues: string[], subtypes: Set<string>) => {
      let filtered = allBots.filter((bot) => {
        // Always include pending and success statuses
        if (bot.status.type === "pending" || bot.status.type === "success") {
          return true
        }
        // For error and warning statuses, check against error values
        return errorValues.includes(bot.status.value)
      })

      // Apply subtype filtering if any subtypes are selected
      if (subtypes.size > 0) {
        const errorBots = allBots.filter(bot => ["error", "warning"].includes(bot.status.type))
        const errorDistribution = groupBy(errorBots, "status.value")
        const errorTableData = getErrorTable(errorDistribution)

        // Get all UUIDs for selected subtypes
        const selectedSubtypeUuids = new Set<string>()

        errorTableData.forEach((entry) => {
          const subtypeName = entry.type === entry.originalType ? entry.message : entry.type
          const subtypeKey = `${entry.originalType}::${subtypeName}`

          if (subtypes.has(subtypeKey)) {
            entry.botUuids.forEach(uuid => selectedSubtypeUuids.add(uuid))
          }
        })

        // Filter to only include bots that match selected subtypes or are not from expandable error types
        filtered = filtered.filter(bot => {
          // Always include success and pending bots
          if (bot.status.type === "pending" || bot.status.type === "success") {
            return true
          }

          const errorType = bot.status.value
          const hasExpandableSubtypes = canExpand(errorType)

          if (hasExpandableSubtypes && errorValues.includes(errorType)) {
            // If this error type has expandable subtypes and is selected, 
            // only include if the bot's UUID is in selected subtypes
            return selectedSubtypeUuids.has(bot.uuid)
          } else {
            // If this error type doesn't have expandable subtypes, include all bots of this type
            return errorValues.includes(bot.status.value)
          }
        })
      }

      return filtered
    },
    [allBots, canExpand]
  )

  // Helper function to update selected values
  const updateSelectedValues = useCallback(
    (newValues: string[]) => {
      setSelectedErrorValues(newValues)
      setFilteredBots(getFilteredBots(newValues, selectedSubtypes))
      localStorage.setItem(SELECTED_ERROR_STORAGE_KEY, JSON.stringify(newValues))
    },
    [getFilteredBots, selectedSubtypes]
  )

  // Helper function to update selected subtypes
  const setSelectedSubtypes = useCallback(
    (newSubtypes: Set<string>) => {
      setSelectedSubtypesState(newSubtypes)
      setFilteredBots(getFilteredBots(selectedErrorValues, newSubtypes))
      localStorage.setItem(SELECTED_SUBTYPES_STORAGE_KEY, JSON.stringify(Array.from(newSubtypes)))
    },
    [getFilteredBots, selectedErrorValues]
  )

  // Listen for changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SELECTED_ERROR_STORAGE_KEY && e.newValue) {
        try {
          const newValues = JSON.parse(e.newValue) as string[]
          // Validate the new values against available error types
          const validValues = newValues.filter((value) => allErrorValues.includes(value))
          updateSelectedValues(validValues)
        } catch {
          // If parsing fails, reset to all values
          updateSelectedValues(allErrorValues)
        }
      } else if (e.key === SELECTED_SUBTYPES_STORAGE_KEY && e.newValue) {
        try {
          const newSubtypes = JSON.parse(e.newValue) as string[]
          setSelectedSubtypes(new Set(newSubtypes))
        } catch {
          setSelectedSubtypes(new Set())
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [allErrorValues, updateSelectedValues, setSelectedSubtypes])

  // Update filtered bots when allBots changes
  useEffect(() => {
    setFilteredBots(getFilteredBots(selectedErrorValues, selectedSubtypes))
  }, [getFilteredBots, selectedErrorValues, selectedSubtypes])

  // Update selected values when initial distribution changes
  useEffect(() => {
    const availableErrorTypes = initialErrorDistribution.map((item) => item.name)
    const validSelectedValues = selectedErrorValues.filter((value) =>
      availableErrorTypes.includes(value)
    )

    if (validSelectedValues.length !== selectedErrorValues.length) {
      updateSelectedValues(validSelectedValues)
    }
  }, [initialErrorDistribution, selectedErrorValues, updateSelectedValues])

  const addErrorValue = (value: string) => {
    const newSelectedValues = [...selectedErrorValues, value]
    updateSelectedValues(newSelectedValues)
  }

  const removeErrorValue = (value: string) => {
    const newSelectedValues = selectedErrorValues.filter((v) => v !== value)
    updateSelectedValues(newSelectedValues)
  }

  const addSubtype = (subtype: string) => {
    const newSubtypes = new Set(selectedSubtypes)
    newSubtypes.add(subtype)
    setSelectedSubtypes(newSubtypes)
  }

  const removeSubtype = (subtype: string) => {
    const newSubtypes = new Set(selectedSubtypes)
    newSubtypes.delete(subtype)
    setSelectedSubtypes(newSubtypes)
  }

  const clearSubtypesForError = (errorType: string) => {
    const newSubtypes = new Set(selectedSubtypes)
    Array.from(selectedSubtypes).forEach(subtypeKey => {
      if (subtypeKey.startsWith(`${errorType}::`)) {
        newSubtypes.delete(subtypeKey)
      }
    })
    setSelectedSubtypes(newSubtypes)
  }

  const reset = () => {
    updateSelectedValues(allErrorValues)
    setSelectedSubtypes(new Set())
  }

  const selectAll = (values: string[]) => {
    updateSelectedValues(values)
  }

  const selectNone = () => {
    updateSelectedValues([])
    setSelectedSubtypes(new Set())
  }

  const selectDefault = () => {
    updateSelectedValues(defaultErrorValues)
    setSelectedSubtypes(new Set())
  }

  const botsFilteredByError = useMemo(
    () =>
      selectedErrorValues.length !== allErrorValues.length ||
      !selectedErrorValues.every((value) => allErrorValues.includes(value)) ||
      selectedSubtypes.size > 0,
    [selectedErrorValues, allErrorValues, selectedSubtypes]
  )

  return (
    <SelectedErrorContext.Provider
      value={{
        selectedErrorValues,
        setSelectedErrorValues,
        selectedSubtypes,
        setSelectedSubtypes,
        addSubtype,
        removeSubtype,
        clearSubtypesForError,
        reset,
        addErrorValue,
        removeErrorValue,
        selectAll,
        selectNone,
        selectDefault,
        filteredBots,
        botsFilteredByError,
        canExpand
      }}
    >
      {children}
    </SelectedErrorContext.Provider>
  )
}
