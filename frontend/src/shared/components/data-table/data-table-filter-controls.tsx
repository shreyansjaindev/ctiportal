"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { useDataTable } from "@/shared/components/data-table/data-table-provider";
import { DataTableFilterTimerange } from "@/shared/components/data-table/data-table-filter-timerange";

import { DataTableFilterCheckbox } from "./data-table-filter-checkbox";
import { DataTableFilterResetButton } from "./data-table-filter-reset-button";

export function DataTableFilterControls() {
  const { filterFields } = useDataTable();
  return (
    <Accordion
      type="multiple"
      defaultValue={filterFields
        ?.filter(({ defaultOpen }) => defaultOpen)
        ?.map(({ value }) => value as string)}
    >
      {filterFields?.map((field) => {
        const value = field.value as string;
        return (
          <AccordionItem key={value} value={value} className="border-none">
            <AccordionTrigger className="w-full px-2 py-0 hover:no-underline data-[state=closed]:text-muted-foreground data-[state=open]:text-foreground focus-within:data-[state=closed]:text-foreground hover:data-[state=closed]:text-foreground">
              <div className="flex min-w-0 items-center gap-2 py-2 pr-2">
                <p className="truncate text-sm font-medium">{field.label}</p>
                <DataTableFilterResetButton {...field} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-1">
                {field.type === "checkbox" && (
                  <DataTableFilterCheckbox {...field} />
                )}
                {field.type === "timerange" && (
                  <DataTableFilterTimerange {...field} />
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
