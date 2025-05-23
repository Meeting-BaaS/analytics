import { ClassValue, clsx } from "clsx"
import dayjs from "dayjs"
import { twMerge } from "tailwind-merge"
import type { PlatformName } from "./types"

/**
 * Combines class names with Tailwind CSS using clsx and twMerge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number with commas as thousands separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}

/**
 * Formats a percentage value with one decimal place
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Formats a date in a human-readable format (May 1, 2024)
 */
export function formatDate(dateString: string): string {
  return dayjs(dateString).format("MMM D, YYYY")
}

/**
 * Formats a date range as a string (May 1 - May 21, 2024)
 */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${dayjs(startDate).format("MMM D")} - ${dayjs(endDate).format("MMM D, YYYY")}`
}

/**
 * Formats a date string to be used in URL parameters (YYYY-MM-DD)
 */
export function formatDateString(date: Date): string {
  return dayjs(date).format("YYYY-MM-DD")
}

/**
 * Color values for different meeting platforms
 */
export const platformColors: Record<PlatformName | string, string> = {
  "google meet": "hsl(var(--chart-1))",
  zoom: "hsl(var(--chart-2))",
  teams: "hsl(var(--chart-3))",
  unknown: "hsl(var(--chart-4))"
}

/**
 * Capitalizes the first letter of each word in a string
 */
export function capitalize(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Creates a random ID string
 */
export function generateId(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length)
}

/**
 * Returns a color based on status type
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "success":
      return "hsl(var(--success))"
    case "error":
      return "hsl(var(--destructive))"
    case "warning":
      return "hsl(var(--warning))"
    case "pending":
      return "hsl(var(--muted))"
    default:
      return "hsl(var(--muted-foreground))"
  }
}

// Chart utility functions
export function getChartColorVars(config: Record<string, { color: string }>) {
  return Object.entries(config).reduce((acc, [key, value]) => {
    return Object.assign(acc, {
      [`--color-${key}`]: value.color
    })
  }, {})
}

// Status colors using CSS variables for consistency
export const statusColors = {
  success: "var(--color-success, #78FFF0)", // Primary teal
  error: "var(--color-error, #FE1B4E)",     // Error red
  warning: "var(--color-warning, #FFFF93)"  // Warning yellow
}

/**
 * Error categorization utilities to group similar errors for analysis
 */

/**
 * Groups similar error messages into more meaningful categories
 * Only applies to very specific cases (webhooks and stalled errors)
 * @param errorType The original error type
 * @param errorMessage The original error message
 * @param category The original error category
 * @returns An object with normalized error information
 */
export function categorizeError(errorType: string, errorMessage: string, category?: string): {
  normalizedType: string;
  normalizedMessage: string;
  normalizedCategory: string;
  originalType: string;
  originalMessage: string;
  originalCategory?: string;
  groupKey: string;
} {
  let normalizedType = errorType;
  let normalizedMessage = errorMessage;
  let normalizedCategory = category || 'unknown_error';
  let groupKey = '';

  // Only categorize webhook errors and stalled errors, keep everything else as-is
  
  // Webhook error normalization - simply group by status code
  if (category === 'webhook_error' && errorMessage.includes('Status:')) {
    const statusMatch = errorMessage.match(/Status: (\d+)/);
    if (statusMatch && statusMatch[1]) {
      const statusCode = parseInt(statusMatch[1], 10);
      normalizedMessage = `Status: ${statusCode} - ${errorMessage}`;
      groupKey = `webhook_error:${statusCode}`;
    } else {
      groupKey = `webhook_error:${errorType}`;
    }
  } 
  // Group all webhook builder errors
  else if (category === 'webhook_error' && errorMessage.includes('builder error')) {
    normalizedType = "Webhook Error";
    normalizedMessage = "URL Configuration Error";
    groupKey = "webhook_builder_error";
  }
  // Group stalled bots by timeframe
  else if (category === 'stalled_error') {
    const hoursMatch = errorMessage.match(/pending for (\d+\.?\d*) hours/);
    if (hoursMatch && hoursMatch[1]) {
      const hours = parseFloat(hoursMatch[1]);
      if (hours < 24) {
        groupKey = "stalled_under_24h";
      } else if (hours < 48) {
        groupKey = "stalled_24_to_48h";
      } else {
        groupKey = "stalled_over_48h";
      }
    } else {
      groupKey = `stalled_error:${errorType}`;
    }
  }
  // Default - keep everything else as is
  else {
    groupKey = `${normalizedCategory}:${normalizedType}`;
  }
  
  return {
    normalizedType,
    normalizedMessage,
    normalizedCategory,
    originalType: errorType,
    originalMessage: errorMessage,
    originalCategory: category,
    groupKey
  };
}

/**
 * Groups an array of error objects by their normalized categories
 * Only applies special grouping to webhooks and stalled errors
 * @param errors Array of error objects with status info
 * @returns Grouped and categorized errors
 */
export function groupAndCategorizeErrors(errors: any[]) {
  const errorGroups: Record<string, {
    type: string;
    message: string;
    category: string;
    count: number;
    platforms: Record<string, number>;
    originalErrors: any[];
  }> = {};

  errors.forEach(error => {
    const errorType = error.status?.value || 'Unknown';
    const errorMessage = error.status?.details || `${error.status?.category || "Unknown"} error`;
    const errorCategory = error.status?.category;
    const platform = error.platform || 'unknown';

    // Only apply categorization to webhook errors and stalled errors - simple KISS approach
    let groupKey = `${errorCategory}:${errorType}`;
    if (errorCategory === 'webhook_error' || errorCategory === 'stalled_error') {
      const categorized = categorizeError(errorType, errorMessage, errorCategory);
      groupKey = categorized.groupKey;
    }
    
    // Use the groupKey to identify similar errors
    if (!errorGroups[groupKey]) {
      errorGroups[groupKey] = {
        type: errorType,
        message: errorMessage,
        category: errorCategory || 'unknown_error',
        count: 0,
        platforms: {},
        originalErrors: []
      };
    }

    // Increment counters
    errorGroups[groupKey].count++;
    errorGroups[groupKey].platforms[platform] = 
      (errorGroups[groupKey].platforms[platform] || 0) + 1;
    
    // Store original error for reference
    errorGroups[groupKey].originalErrors.push(error);
  });

  return Object.values(errorGroups).sort((a, b) => b.count - a.count);
}
