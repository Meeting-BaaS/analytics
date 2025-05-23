"use client"

import { CheckboxFilter } from "@/components/filters/checkbox-filter"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"
import {
  allErrorCategories,
  allErrorPriorities,
  allPlatforms,
  allStatuses,
  allUserReportedErrorStatuses
} from "@/lib/filter-options"
import { filtersSchema, type FiltersFormData } from "@/lib/schemas/filters"
import type { FilterState } from "@/lib/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Filter, FunnelX } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

const filtersFields = [
  {
    name: "platformFilters",
    label: "Platform",
    options: allPlatforms
  },
  {
    name: "statusFilters",
    label: "Status",
    options: allStatuses
  },
  {
    name: "userReportedErrorStatusFilters",
    label: "User Reported Error",
    options: allUserReportedErrorStatuses
  },
  {
    name: "errorCategoryFilters",
    label: "Error Category",
    options: allErrorCategories
  },
  {
    name: "errorPriorityFilters",
    label: "Error Priority",
    options: allErrorPriorities
  }
]

interface AdditionalFiltersProps {
  filters: FilterState
  setFilters: (filters: FilterState) => void
}

export function AdditionalFilters({ filters, setFilters }: AdditionalFiltersProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<FiltersFormData>({
    resolver: zodResolver(filtersSchema),
    defaultValues: {
      platformFilters: filters.platformFilters || [],
      statusFilters: filters.statusFilters || [],
      userReportedErrorStatusFilters: filters.userReportedErrorStatusFilters || [],
      errorCategoryFilters: filters.errorCategoryFilters || [],
      errorPriorityFilters: filters.errorPriorityFilters || []
    }
  })

  const onSubmit = (data: FiltersFormData) => {
    setFilters({
      platformFilters: data.platformFilters || [],
      statusFilters: data.statusFilters || [],
      userReportedErrorStatusFilters: data.userReportedErrorStatusFilters || [],
      errorCategoryFilters: data.errorCategoryFilters || [],
      errorPriorityFilters: data.errorPriorityFilters || []
    })
    setOpen(false)
  }

  const clearAllFilters = () => {
    const emptyFilters = {
      platformFilters: [],
      statusFilters: [],
      userReportedErrorStatusFilters: [],
      errorCategoryFilters: [],
      errorPriorityFilters: []
    }
    form.reset(emptyFilters)
    setFilters(emptyFilters)
  }

  const isFiltered = Object.values(filters).some(
    (filter) => filter && filter.length > 0
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          {isFiltered ? <FunnelX /> : <Filter />}
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-2xs" side="right">
        <SheetHeader className="gap-0.5">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Select one or more filters to narrow down the results</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-4">
            {filtersFields.map((filter) => (
              <FormField
                key={filter.name}
                control={form.control}
                name={filter.name as keyof FiltersFormData}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <CheckboxFilter
                        options={filter.options}
                        label={filter.label}
                        selectedValues={field.value ?? []}
                        onFilterChange={(value) => field.onChange(value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="grow"
                onClick={clearAllFilters}
              >
                Clear All
              </Button>
              <Button type="submit" size="sm" className="grow">
                Apply Filters
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
