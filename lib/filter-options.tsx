export type Option = {
  label: string
  value: string
  searchParam: string
}

export const allPlatforms: Option[] = [
  { label: "Zoom", value: "zoom.us", searchParam: "zoom" },
  { label: "Google Meet", value: "meet.google.com", searchParam: "meet" },
  { label: "Teams", value: "teams.microsoft.com,teams.live.com", searchParam: "teams" }
]

export const allStatuses: Option[] = [
  { label: "Success", value: "success", searchParam: "success" },
  { label: "Error", value: "error", searchParam: "error" },
  { label: "Pending", value: "pending", searchParam: "pending" },
  { label: "Warning", value: "warning", searchParam: "warning" }
]

export const allUserReportedErrorStatuses: Option[] = [
  { label: "Open", value: JSON.stringify({ status: "open" }), searchParam: "open" },
  { label: "Closed", value: JSON.stringify({ status: "closed" }), searchParam: "closed" },
  {
    label: "In Progress",
    value: JSON.stringify({ status: "in_progress" }),
    searchParam: "in_progress"
  }
]

// Static error categories - keep for compatibility but prefer dynamic ones
export const allErrorCategories: Option[] = [
  { label: "System Errors", value: "system_error", searchParam: "system_error" },
  { label: "Authentication", value: "auth_error", searchParam: "auth_error" },
  { label: "Capacity Issues", value: "capacity_error", searchParam: "capacity_error" },
  { label: "Connection Issues", value: "connection_error", searchParam: "connection_error" },
  { label: "Permission Issues", value: "permission_error", searchParam: "permission_error" },
  { label: "Input Validation", value: "input_error", searchParam: "input_error" },
  { label: "Duplicates", value: "duplicate_error", searchParam: "duplicate_error" },
  { label: "Webhook Issues", value: "webhook_error", searchParam: "webhook_error" },
  { label: "API Issues", value: "api_error", searchParam: "api_error" },
  { label: "Unclassified", value: "unknown_error", searchParam: "unknown_error" },
  { label: "Stalled Bots", value: "stalled_error", searchParam: "stalled_error" }
]

export const allErrorPriorities: Option[] = [
  { label: "Critical", value: "critical", searchParam: "critical" },
  { label: "High", value: "high", searchParam: "high" },
  { label: "Medium", value: "medium", searchParam: "medium" },
  { label: "Low", value: "low", searchParam: "low" }
]

// Default error categories to be selected (ticked) by default
export const defaultSelectedErrorCategories = ["unknown_error"];

/**
 * Generate dynamic error category options based on actual error data
 * This replaces static categories with real data from the system
 */
export function generateDynamicErrorCategoryOptions(errorBots: any[]): Option[] {
  const categories = new Map<string, {
    label: string;
    value: string;
    count: number;
    searchParam: string;
  }>();

  // Process all error bots to extract categories
  errorBots.forEach(bot => {
    const errorType = bot.status?.value || 'Unknown';
    const errorMessage = bot.status?.details || bot.status?.message || `${bot.status?.category || "Unknown"} error`;
    const errorCategory = bot.status?.category || 'unknown_error';

    // Group similar errors together
    let categoryKey: string;
    let categoryLabel: string;

    if (errorCategory === 'webhook_error') {
      // For webhook errors, group by HTTP status codes
      const statusMatch = errorMessage.match(/(\d{3})/);
      if (statusMatch) {
        categoryKey = `webhook_error:${statusMatch[1]}`;
        categoryLabel = `Webhook ${statusMatch[1]} Errors`;
      } else if (errorMessage.includes('builder error')) {
        categoryKey = 'webhook_error:builder';
        categoryLabel = 'Webhook Builder Errors';
      } else if (errorMessage.includes('retries')) {
        categoryKey = 'webhook_error:timeout';
        categoryLabel = 'Webhook Timeout Errors';
      } else {
        categoryKey = 'webhook_error:other';
        categoryLabel = 'Other Webhook Errors';
      }
    } else if (errorCategory === 'stalled_error') {
      // For stalled errors, group by duration
      if (errorMessage.includes('24') && errorMessage.includes('hours')) {
        categoryKey = 'stalled_error:24h_plus';
        categoryLabel = 'Stalled 24+ Hours';
      } else if (errorMessage.includes('hour')) {
        categoryKey = 'stalled_error:under_24h';
        categoryLabel = 'Stalled Under 24h';
      } else {
        categoryKey = 'stalled_error:other';
        categoryLabel = 'Stalled: Other';
      }
    } else if (errorCategory === 'unknown_error') {
      // For unknown errors, use the actual error type/message to categorize
      if (errorType && errorType !== 'Unknown' && errorType !== 'unknown_error') {
        categoryKey = `unknown_error:${errorType.toLowerCase()}`;
        categoryLabel = `Unknown: ${errorType}`;
      } else if (errorMessage.includes('insufficient token')) {
        categoryKey = 'auth_error:insufficient_tokens';
        categoryLabel = 'Insufficient Tokens';
      } else if (errorMessage.includes('meeting already started') || errorMessage.includes('AlreadyStarted')) {
        categoryKey = 'duplicate_error:already_started';
        categoryLabel = 'Meeting Already Started';
      } else if (errorMessage.includes('BotNotAccepted')) {
        categoryKey = 'permission_error:not_accepted';
        categoryLabel = 'Bot Not Accepted';
      } else if (errorMessage.includes('TimeoutWaitingToStart')) {
        categoryKey = 'connection_error:start_timeout';
        categoryLabel = 'Meeting Start Timeout';
      } else if (errorMessage.includes('MeetingOver')) {
        categoryKey = 'connection_error:meeting_over';
        categoryLabel = 'Cannot Join Meeting';
      } else if (errorMessage.includes('Recording rights')) {
        if (errorMessage.includes('Denied')) {
          categoryKey = 'permission_error:recording_denied';
          categoryLabel = 'Recording Rights Issue';
        } else {
          categoryKey = 'connection_error:recording_timeout';
          categoryLabel = 'Connection Timeout';
        }
      } else if (errorMessage.includes('Cannot parse meeting URL')) {
        categoryKey = 'input_error:invalid_url';
        categoryLabel = 'Invalid Meeting URL';
      } else if (errorMessage.includes('Unauthorized')) {
        categoryKey = 'auth_error:unauthorized';
        categoryLabel = 'Unauthorized';
      } else {
        // Last resort - use a cleaned up version of the message
        const cleanedMessage = errorMessage.replace(/^(Cannot start meeting bot, err: |Error: )/i, '').trim();
        categoryKey = `unknown_error:${cleanedMessage.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)}`;
        categoryLabel = `Unknown: ${cleanedMessage.substring(0, 30)}`;
      }
    } else {
      // For other categories, use the category name directly
      categoryKey = errorCategory;
      categoryLabel = errorCategory.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }

    // Create or update the category count
    if (!categories.has(categoryKey)) {
      categories.set(categoryKey, {
        label: categoryLabel,
        value: categoryKey,
        count: 1,
        searchParam: categoryKey
      });
    } else {
      const category = categories.get(categoryKey)!;
      category.count += 1;
    }
  });

  // Convert to array and sort by count (descending)
  return Array.from(categories.values())
    .sort((a, b) => b.count - a.count)
    .map(category => ({
      label: `${category.label} (${category.count})`,
      value: category.value,
      searchParam: category.searchParam,
      count: category.count
    }));
}
