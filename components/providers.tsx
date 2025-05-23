"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { JwtProvider } from "@/contexts/jwt-context"
import { SelectedBotsProvider } from "@/contexts/selected-bots-context"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"

const queryClient = new QueryClient()

export default function Providers({
  children,
  jwt
}: Readonly<{
  children: React.ReactNode
  jwt: string
}>) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <JwtProvider jwt={jwt}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <SelectedBotsProvider>
              {children}
            </SelectedBotsProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </JwtProvider>
    </ThemeProvider>
  )
}
