import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useEffect } from "react"

export const LIMIT_STORAGE_KEY = "analytics-limit"

interface LimitSelectorProps {
  value: number
  onChange: (value: number) => void
}

export const limitOptions = [
  {
    label: "Last 50 bots",
    value: 50
  },
  {
    label: "Last 100 bots",
    value: 100
  },
  {
    label: "Last 200 bots",
    value: 200
  },
  {
    label: "Last 500 bots",
    value: 500
  },
  {
    label: "Last 1000 bots",
    value: 1000
  },
  {
    label: "Last 2000 bots",
    value: 2000
  }
]

export function LimitSelector({ value, onChange }: LimitSelectorProps) {
  // Listen for changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LIMIT_STORAGE_KEY && e.newValue) {
        const limit = Number(e.newValue)
        if (limitOptions.some((option) => option.value === limit)) {
          onChange(limit)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [onChange])

  // Function to handle page size changes
  const handleLimitChange = (newValue: string) => {
    const limit = Number(newValue)
    // Update local storage
    localStorage.setItem(LIMIT_STORAGE_KEY, limit.toString())
    // Update component state
    onChange(limit)
  }

  return (
    <Select value={value.toString()} onValueChange={handleLimitChange}>
      <SelectTrigger className="w-full h-12 px-5 text-base font-medium border-2 bg-primary/5 hover:bg-primary/10 transition-colors">
        <SelectValue placeholder="Limit" />
      </SelectTrigger>
      <SelectContent className="py-3">
        {limitOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value.toString()}
            className="px-5 py-3 text-base rounded-md hover:bg-primary/5"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
