// Chart color palette based on the marine/teal theme
export const chartColors = {
  // Primary teal variations - using CSS variables
  chart1: "var(--color-chart-1, #78FFF0)", // Primary 500
  chart2: "var(--color-chart-2, #6AEDDF)", 
  chart3: "var(--color-chart-3, #5CDBCF)",
  chart4: "var(--color-chart-4, #4EC9BF)",
  chart5: "var(--color-chart-5, #40B7AF)",
  chart6: "var(--color-chart-6, #32A59F)",
  chart7: "var(--color-chart-7, #24938F)",
  chart8: "var(--color-chart-8, #16817F)",
  chart9: "var(--color-chart-9, #086F6F)",
  chart10: "var(--color-chart-10, #447671)", // Primary 700
  
  // Error shades for critical items
  error: "var(--color-error, #FE1B4E)", // Error 500
  errorLight: "var(--color-error-light, #FFE6EB)", // Error 50
  errorMid: "var(--color-error-mid, #FE809C)", // Error 300
  errorDark: "var(--color-error-dark, #980123)", // Error 900
  
  // Warning for medium importance
  warning: "var(--color-warning, #FFFF93)", // Warning 500
  warningDark: "#E6E684", // Darker variation
  
  // Success color
  success: "var(--color-success, #78FFF0)",
  
  // Neutral shades for background and less important items
  neutral50: "#F4F9F8", // Neutral 50
  neutral200: "#B9B5B5", // Neutral 200
  neutral400: "#5A5A5A", // Neutral 400
  neutral500: "#343D3C", // Neutral 500
  neutral700: "#2B2B2B", // Neutral 700
  neutral900: "#232323"  // Neutral 900
} 