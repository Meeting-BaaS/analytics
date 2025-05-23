"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { Option } from "@/lib/filter-options"

interface CheckboxFilterProps {
  options: readonly Option[]
  label: string
  selectedValues: string[]
  onFilterChange: (value: string[]) => void
}

export function CheckboxFilter({
  options,
  label,
  selectedValues,
  onFilterChange
}: CheckboxFilterProps) {
  const handleOptionChange = (option: Option, checked: boolean) => {
    const newFilter = checked
      ? [...selectedValues, option.value]
      : selectedValues.filter((v) => v !== option.value)
    onFilterChange(newFilter)
  }

  return (
    <>
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`${label}-${option.label}`}
              name={`${label}-${option.label}`}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={(checked) => handleOptionChange(option, checked as boolean)}
            />
            <Label htmlFor={`${label}-${option.label}`} className="font-medium text-sm">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </>
  )
}
