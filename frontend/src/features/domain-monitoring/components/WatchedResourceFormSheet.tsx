import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { useAuth } from "@/shared/lib/auth"
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
import { Textarea } from "@/shared/components/ui/textarea"

import type { WatchedResource, WatchedResourcePayload } from "../types"
import { listCompanies } from "../services"

const RESOURCE_TYPES = [
  { value: "domain", label: "Domain" },
  { value: "keyword", label: "Keyword" },
]

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

const PROPERTY_OPTIONS = [
  { value: "typo_match", label: "Typo Match", description: "Detect typo-based similarities" },
  { value: "substring_typo_match", label: "Substring Typo Match", description: "Detect substring typos" },
  { value: "noise_reduction", label: "Noise Reduction", description: "Reduce false positives" },
]

type WatchedResourceFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: WatchedResource | null
  onSubmit: (payload: WatchedResourcePayload) => void
  isSubmitting?: boolean
}

function parseListInput(value: string): unknown[] {
  if (!value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export function WatchedResourceFormSheet({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: WatchedResourceFormSheetProps) {
  const { token } = useAuth()
  const [value, setValue] = useState("")
  const [resourceType, setResourceType] = useState("domain")
  const [company, setCompany] = useState("")
  const [status, setStatus] = useState("active")
  const [properties, setProperties] = useState<string[]>([])
  const [excludeKeywords, setExcludeKeywords] = useState("")

  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: () => listCompanies(token!),
    enabled: !!token && open,
  })

  useEffect(() => {
    if (open) {
      setValue(initial?.value ?? "")
      setResourceType(initial?.resource_type ?? "domain")
      setCompany(initial?.company ?? "")
      setStatus(initial?.status ?? "active")
      setProperties(
        Array.isArray(initial?.properties) ? (initial.properties as string[]) : []
      )
      setExcludeKeywords(
        initial?.exclude_keywords && initial.exclude_keywords.length
          ? JSON.stringify(initial.exclude_keywords, null, 2)
          : ""
      )
    }
  }, [open, initial])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0">
        <SheetHeader>
          <SheetTitle>{initial ? "Edit watched resource" : "Add watched resource"}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <Field>
            <FieldLabel>Value</FieldLabel>
            <FieldContent>
              <Input value={value} onChange={(event) => setValue(event.target.value)} />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>Type</FieldLabel>
            <FieldContent>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((option) => (
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
                  {companiesQuery.data?.map((comp: { id: number; name: string }) => (
                    <SelectItem key={comp.id} value={comp.name}>
                      {comp.name}
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
            <FieldLabel>Properties</FieldLabel>
            <FieldContent>
              <div className="flex flex-col gap-3">
                {PROPERTY_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-start gap-2">
                    <Checkbox
                      id={option.value}
                      checked={properties.includes(option.value)}
                      onCheckedChange={(checked) => {
                        setProperties(
                          checked
                            ? [...properties, option.value]
                            : properties.filter((p) => p !== option.value)
                        )
                      }}
                    />
                    <div className="grid gap-0.5">
                      <label
                        htmlFor={option.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option.label}
                      </label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>Exclude keywords</FieldLabel>
            <FieldContent>
              <Textarea
                value={excludeKeywords}
                onChange={(event) => setExcludeKeywords(event.target.value)}
                placeholder='JSON array or comma-separated values'
                rows={4}
              />
            </FieldContent>
          </Field>
        </div>

        <SheetFooter>
          <Button
            onClick={() =>
              onSubmit({
                value,
                resource_type: resourceType,
                company,
                status,
                properties: properties,
                exclude_keywords: parseListInput(excludeKeywords),
              })
            }
            disabled={!value || !company || isSubmitting}
          >
            {initial ? "Save changes" : "Create resource"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
