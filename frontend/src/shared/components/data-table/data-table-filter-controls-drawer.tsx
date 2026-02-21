import { Button } from "@/shared/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { FilterIcon } from "lucide-react"
import { DataTableFilterControls } from "./data-table-filter-controls"

export function DataTableFilterControlsDrawer() {
  return (
    <Drawer>
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <FilterIcon className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Toggle filters</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DrawerContent className="max-h-[calc(100dvh-4rem)]">
        <VisuallyHidden>
          <DrawerHeader>
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerDescription>Adjust your table filters</DrawerDescription>
          </DrawerHeader>
        </VisuallyHidden>
        <div className="flex-1 overflow-y-auto px-4">
          <DataTableFilterControls />
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
