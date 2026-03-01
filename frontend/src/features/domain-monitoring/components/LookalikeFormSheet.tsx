import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/shared/components/ui/button"
import { Field, FieldContent, FieldLabel } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"

import type { LookalikeDomain, LookalikeDomainPayload } from "../types"
import { listCompanies, listWatchedResourcesSimple } from "../services"

const RISK_OPTIONS = [
  { value: "unknown", label: "Unknown" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "takedown", label: "Takedown" },
  { value: "legal", label: "Legal" },
  { value: "not_relevant", label: "Not Relevant" },
]

type LookalikeFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: LookalikeDomain | null
  onSubmit: (payload: LookalikeDomainPayload) => void
  isSubmitting?: boolean
}

export function LookalikeFormSheet({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: LookalikeFormSheetProps) {
  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: () => listCompanies(),
    enabled: open,
  })

  const watchedResourcesQuery = useQuery({
    queryKey: ["watched-resources-simple"],
    queryFn: () => listWatchedResourcesSimple(),
    enabled: open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0">
        <SheetHeader>
          <SheetTitle>{initial ? "Edit lookalike" : "Add lookalike"}</SheetTitle>
        </SheetHeader>

        {open ? (
          <LookalikeFormContent
            key={initial?.id ?? "new"}
            initial={initial}
            companies={companiesQuery.data}
            watchedResources={watchedResourcesQuery.data}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

type LookalikeFormContentProps = {
  initial?: LookalikeDomain | null
  companies?: Array<{ id: number; name: string }>
  watchedResources?: Array<{ id: number; value: string }>
  onSubmit: (payload: LookalikeDomainPayload) => void
  isSubmitting?: boolean
}

function LookalikeFormContent({
  initial,
  companies,
  watchedResources,
  onSubmit,
  isSubmitting,
}: LookalikeFormContentProps) {
  const [value, setValue] = useState(initial?.value ?? "")
  const [source, setSource] = useState(initial?.source ?? "")
  const [watchedResource, setWatchedResource] = useState(initial?.watched_resource ?? "")
  const [sourceDate, setSourceDate] = useState(initial?.source_date ?? "")
  const [risk, setRisk] = useState(initial?.potential_risk ?? "unknown")
  const [status, setStatus] = useState(initial?.status ?? "open")
  const [company, setCompany] = useState(initial?.company ?? "")

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        <Field>
          <FieldLabel>Domain</FieldLabel>
          <FieldContent>
            <Input value={value} onChange={(event) => setValue(event.target.value)} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>Source</FieldLabel>
          <FieldContent>
            <Input value={source} onChange={(event) => setSource(event.target.value)} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>Watched resource</FieldLabel>
          <FieldContent>
            <Select value={watchedResource} onValueChange={setWatchedResource}>
              <SelectTrigger>
                <SelectValue placeholder="Select watched resource" />
              </SelectTrigger>
              <SelectContent>
                {watchedResources?.map((resource) => (
                  <SelectItem key={resource.id} value={resource.value}>
                    {resource.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>Source date</FieldLabel>
          <FieldContent>
            <Input
              type="date"
              value={sourceDate}
              onChange={(event) => setSourceDate(event.target.value)}
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>Potential risk</FieldLabel>
          <FieldContent>
            <Select value={risk} onValueChange={setRisk}>
              <SelectTrigger>
                <SelectValue placeholder="Select risk" />
              </SelectTrigger>
              <SelectContent>
                {RISK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>Status</FieldLabel>
          <FieldContent>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>Company</FieldLabel>
          <FieldContent>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((comp) => (
                  <SelectItem key={comp.id} value={comp.name}>
                    {comp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
      </div>

      <SheetFooter>
        <Button
          onClick={() =>
            onSubmit({
              value,
              source,
              watched_resource: watchedResource,
              source_date: sourceDate,
              potential_risk: risk,
              status,
              company,
            })
          }
          disabled={!value || !source || !watchedResource || !sourceDate || !company || isSubmitting}
        >
          {initial ? "Save changes" : "Create lookalike"}
        </Button>
      </SheetFooter>
    </>
  )
}
