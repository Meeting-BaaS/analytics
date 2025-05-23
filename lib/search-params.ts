import {
    allErrorCategories,
    allErrorPriorities,
    allPlatforms,
    allStatuses,
    allUserReportedErrorStatuses
} from "@/lib/filter-options"
import type { FilterState } from "@/lib/types"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import type { DateValueType } from "react-tailwindcss-datepicker/dist/types"

// Initialize dayjs UTC plugin
dayjs.extend(utc)

// Helper function to find option by searchParam
const findOptionBySearchParam = <T extends { searchParam: string; value: string }>(
  options: T[],
  searchParam: string
): string | undefined => options.find((opt) => opt.searchParam === searchParam)?.value

// Helper function to get searchParam from value
const getSearchParamFromValue = <T extends { searchParam: string; value: string }>(
  options: T[],
  value: string
): string | undefined => options.find((opt) => opt.value === value)?.searchParam

// Validate and parse date from search params
export function validateDate(dateStr: string | null): Date | null {
  if (!dateStr) return null

  const date = dayjs.utc(dateStr)
  return date.isValid() ? date.toDate() : null
}

// Validate and parse filter values from search params
export function validateFilterValues(
  platformFilters: string | null,
  statusFilters: string | null,
  userReportedErrorStatusFilters: string | null,
  errorCategoryFilters: string | null = null,
  errorPriorityFilters: string | null = null
): FilterState {
  const validPlatformFilters =
    platformFilters
      ?.split(",")
      .map((value) => findOptionBySearchParam(allPlatforms, value))
      .filter((value): value is string => value !== undefined) ?? []

  const validStatusFilters =
    statusFilters
      ?.split(",")
      .map((value) => findOptionBySearchParam(allStatuses, value))
      .filter((value): value is string => value !== undefined) ?? []

  const validUserReportedErrorStatusFilters =
    userReportedErrorStatusFilters
      ?.split(",")
      .map((value) => findOptionBySearchParam(allUserReportedErrorStatuses, value))
      .filter((value): value is string => value !== undefined) ?? []

  const validErrorCategoryFilters =
    errorCategoryFilters
      ?.split(",")
      .map((value) => findOptionBySearchParam(allErrorCategories, value))
      .filter((value): value is string => value !== undefined) ?? []

  const validErrorPriorityFilters =
    errorPriorityFilters
      ?.split(",")
      .map((value) => findOptionBySearchParam(allErrorPriorities, value))
      .filter((value): value is string => value !== undefined) ?? []

  return {
    platformFilters: validPlatformFilters,
    statusFilters: validStatusFilters,
    userReportedErrorStatusFilters: validUserReportedErrorStatusFilters,
    errorCategoryFilters: validErrorCategoryFilters,
    errorPriorityFilters: validErrorPriorityFilters
  }
}

// Convert filter state to URL-safe values
export function filterStateToSearchValues(filters: FilterState): {
  platformFilters: string[]
  statusFilters: string[]
  userReportedErrorStatusFilters: string[]
  errorCategoryFilters: string[]
  errorPriorityFilters: string[]
} {
  return {
    platformFilters: filters.platformFilters
      .map((value) => getSearchParamFromValue(allPlatforms, value))
      .filter((value): value is string => value !== undefined),
    statusFilters: filters.statusFilters
      .map((value) => getSearchParamFromValue(allStatuses, value))
      .filter((value): value is string => value !== undefined),
    userReportedErrorStatusFilters: filters.userReportedErrorStatusFilters
      .map((value) => getSearchParamFromValue(allUserReportedErrorStatuses, value))
      .filter((value): value is string => value !== undefined),
    errorCategoryFilters: (filters.errorCategoryFilters || [])
      .map((value) => getSearchParamFromValue(allErrorCategories, value))
      .filter((value): value is string => value !== undefined),
    errorPriorityFilters: (filters.errorPriorityFilters || [])
      .map((value) => getSearchParamFromValue(allErrorPriorities, value))
      .filter((value): value is string => value !== undefined)
  }
}

// Validate and parse date range from search params
export function validateDateRange(startDate: string | null, endDate: string | null): DateValueType {
  const validStartDate = validateDate(startDate)
  const validEndDate = validateDate(endDate)

  // Only use dates if both are valid and in correct order
  if (validStartDate && validEndDate && dayjs(validStartDate).isBefore(validEndDate)) {
    return {
      startDate: validStartDate,
      endDate: validEndDate
    }
  }

  // If either date is invalid or dates are in wrong order, use defaults
  return {
    startDate: dayjs().subtract(14, "day").startOf("day").toDate(),
    endDate: dayjs().endOf("day").toDate()
  }
}

// Convert date to UTC string for URL
export function dateToUtcString(date: Date | null): string | null {
  if (!date) return null
  return dayjs(date).utc().format()
}

// Update URL search params with current filter state and date range
export function updateSearchParams(
  currentParams: URLSearchParams,
  dateRange: DateValueType,
  filters: FilterState
): URLSearchParams {
  const params = new URLSearchParams(currentParams.toString())

  const startDateUtc = dateToUtcString(dateRange?.startDate ?? null)
  if (startDateUtc) {
    params.set("startDate", startDateUtc)
  } else {
    params.delete("startDate")
  }

  const endDateUtc = dateToUtcString(dateRange?.endDate ?? null)
  if (endDateUtc) {
    params.set("endDate", endDateUtc)
  } else {
    params.delete("endDate")
  }

  const searchValues = filterStateToSearchValues(filters)

  if (searchValues.platformFilters.length > 0) {
    params.set("platformFilters", searchValues.platformFilters.join(","))
  } else {
    params.delete("platformFilters")
  }

  if (searchValues.statusFilters.length > 0) {
    params.set("statusFilters", searchValues.statusFilters.join(","))
  } else {
    params.delete("statusFilters")
  }

  if (searchValues.userReportedErrorStatusFilters.length > 0) {
    params.set(
      "userReportedErrorStatusFilters",
      searchValues.userReportedErrorStatusFilters.join(",")
    )
  } else {
    params.delete("userReportedErrorStatusFilters")
  }

  if (searchValues.errorCategoryFilters.length > 0) {
    params.set(
      "errorCategoryFilters",
      searchValues.errorCategoryFilters.join(",")
    )
  } else {
    params.delete("errorCategoryFilters")
  }

  if (searchValues.errorPriorityFilters.length > 0) {
    params.set(
      "errorPriorityFilters",
      searchValues.errorPriorityFilters.join(",")
    )
  } else {
    params.delete("errorPriorityFilters")
  }

  return params
}
