import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"
import { LayoutGrid, Rows3 } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { ScrollBar } from "@/shared/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { ProviderLogo } from "@/shared/components/ProviderLogo"
import type { LookupType } from "@/shared/types/intelligence-harvester"

import { formatFieldKey } from "../displays/display-utils"

import type { CategoryProvider } from "./types"

function HorizontalTabsScrollArea({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ScrollAreaPrimitive.Root className="relative w-full">
      <ScrollAreaPrimitive.Viewport className="size-full no-scrollbar rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

type CategoryResultsToolbarProps = {
  availableCategoryTypes: LookupType[]
  resolvedCategory: LookupType | null
  onCategoryChange?: (type: LookupType) => void
  categoryLayout: "grid" | "table"
  onCategoryLayoutChange: (layout: "grid" | "table") => void
  categoryProviders: CategoryProvider[]
  activeCategoryProviderId: string | null
  onProviderChange: (providerId: string) => void
}

export function CategoryResultsToolbar({
  availableCategoryTypes,
  resolvedCategory,
  onCategoryChange,
  categoryLayout,
  onCategoryLayoutChange,
  categoryProviders,
  activeCategoryProviderId,
  onProviderChange,
}: CategoryResultsToolbarProps) {
  return (
    <div className="space-y-3 border-b border-border pb-4">
      <div className="flex items-start justify-between gap-3">
        {availableCategoryTypes.length > 0 ? (
          <Tabs
            value={resolvedCategory ?? "__none__"}
            onValueChange={(value) => {
              if (value === "__none__") return
              onCategoryChange?.(value as LookupType)
            }}
            className="min-w-0 flex-1 h-auto gap-1"
          >
            <HorizontalTabsScrollArea>
              <TabsList variant="line" className="h-auto w-max flex-nowrap gap-1 rounded-none px-0">
                {availableCategoryTypes.map((type) => (
                  <TabsTrigger key={type} value={type} className="flex-none px-3 text-xs data-[state=active]:shadow-none">
                    {formatFieldKey(type)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </HorizontalTabsScrollArea>
            {availableCategoryTypes.map((type) => (
              <TabsContent key={type} value={type} className="m-0" />
            ))}
            <TabsContent value="__none__" className="m-0" />
          </Tabs>
        ) : null}

        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant={categoryLayout === "grid" ? "secondary" : "ghost"} size="sm" className="gap-2" onClick={() => onCategoryLayoutChange("grid")}>
            <LayoutGrid className="h-4 w-4" />
            Grid
          </Button>
          <Button type="button" variant={categoryLayout === "table" ? "secondary" : "ghost"} size="sm" className="gap-2" onClick={() => onCategoryLayoutChange("table")}>
            <Rows3 className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>

      {resolvedCategory && categoryProviders.length > 0 ? (
        <Tabs
          value={activeCategoryProviderId ?? "__none__"}
          onValueChange={(value) => {
            if (value === "__none__") return
            onProviderChange(value)
          }}
          className="h-auto gap-1"
        >
          <HorizontalTabsScrollArea>
            <TabsList variant="line" className="h-auto w-max flex-nowrap gap-1 rounded-none px-0">
              {categoryProviders.map((provider) => (
                <TabsTrigger key={provider.id} value={provider.id} className="flex-none gap-2 px-3 text-xs data-[state=active]:shadow-none">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white p-1 text-black shadow-sm dark:bg-white dark:text-black">
                    <ProviderLogo
                      providerId={provider.id}
                      providerName={provider.name}
                      size="sm"
                      className="h-full w-full max-h-4 max-w-4"
                    />
                  </span>
                  <span>{provider.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </HorizontalTabsScrollArea>
          {categoryProviders.map((provider) => (
            <TabsContent key={provider.id} value={provider.id} className="m-0" />
          ))}
          <TabsContent value="__none__" className="m-0" />
        </Tabs>
      ) : null}
    </div>
  )
}
