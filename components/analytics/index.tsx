"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { CompactDashboard } from "./compact-dashboard"
import { UsageDashboard } from "./usage-dashboard"

export function Analytics() {
  const [activeTab, setActiveTab] = useState("compact")

  return (
    <div className="px-6 mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="compact">Bot Dashboard</TabsTrigger>
          <TabsTrigger value="usage">Usage & Tokens</TabsTrigger>
        </TabsList>
        <TabsContent value="compact" className="mt-4">
          <CompactDashboard />
        </TabsContent>
        <TabsContent value="usage" className="mt-4">
          <UsageDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
