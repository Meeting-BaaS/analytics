import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useEffect } from "react"
import { isMeetingBaasUser } from "@/lib/utils"
import { useSession } from "@/hooks/use-session"

export const LIMIT_STORAGE_KEY = "analytics-limit"

interface LimitSelectorProps {
  value: number
  onChange: (value: number) => void
}

export const baseLimitOptions = [
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

// Additional limit options for Meeting Baas users
const additionalLimitOptions = [
  {
    label: "Last 5000 bots",
    value: 5000
  }
]

export const allLimitOptions = [...baseLimitOptions, ...additionalLimitOptions]

export const DEFAULT_LIMIT = baseLimitOptions[baseLimitOptions.length - 1].value

export function LimitSelector({ value, onChange }: LimitSelectorProps) {
  const session = useSession()
  const isBaasUser = isMeetingBaasUser(session?.user?.email)
  const limitOptions = isBaasUser ? allLimitOptions : baseLimitOptions

  // Reset to default if current limit is not valid for the user
  useEffect(() => {
    if (session?.user?.email && !limitOptions.some((option) => option.value === value)) {
      onChange(DEFAULT_LIMIT)
      try {
        localStorage.setItem(LIMIT_STORAGE_KEY, DEFAULT_LIMIT.toString())
      } catch (error) {
        console.warn("Failed to reset limit in localStorage:", error)
      }
    }
  }, [session?.user?.email, limitOptions, value, onChange])

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
  }, [onChange, limitOptions])

  // Function to handle page size changes
  const handleLimitChange = (newValue: string) => {
    const limit = Number(newValue)
    // Update local storage
    try {
      localStorage.setItem(LIMIT_STORAGE_KEY, limit.toString())
    } catch (error) {
      console.warn("Failed to save limit to localStorage:", error)
    }
    // Update component state
    onChange(limit)
  }

  return (
    <Select value={value.toString()} onValueChange={handleLimitChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Limit" />
      </SelectTrigger>
      <SelectContent>
        {limitOptions.map((option) => (
          <SelectItem key={option.value} value={option.value.toString()}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
