import { useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { apiPost } from "@/shared/lib/api"

const OPERATIONS = [
  { id: "domain", label: "Keep registered domain", description: "Reduce URLs and emails to their registered domain." },
  { id: "defang", label: "Defang", description: "Make indicators safer to share." },
  { id: "fang", label: "Refang", description: "Restore defanged indicators to usable form." },
  { id: "lowercase", label: "Lowercase", description: "Normalize text to lowercase." },
  { id: "uppercase", label: "Uppercase", description: "Normalize text to uppercase." },
  { id: "duplicates", label: "Remove duplicates", description: "Deduplicate repeated values." },
] as const

type OperationId = (typeof OPERATIONS)[number]["id"]

const MUTUALLY_EXCLUSIVE_OPERATIONS: Partial<Record<OperationId, OperationId[]>> = {
  defang: ["fang"],
  fang: ["defang"],
  lowercase: ["uppercase"],
  uppercase: ["lowercase"],
}

export default function TextFormatterPage() {
  const [query, setQuery] = useState("")
  const [selectedOperations, setSelectedOperations] = useState<OperationId[]>(["defang"])
  const [copied, setCopied] = useState(false)

  const transformMutation = useMutation({
    mutationFn: () =>
      apiPost<{ data: unknown; checklist: string[] }>(
        "/tools/text-formatting/",
        JSON.stringify({ query, checklist: selectedOperations })
      ),
  })

  const outputText = useMemo(() => {
    const response = transformMutation.data?.data
    if (!response) return ""

    if (Array.isArray(response)) {
      return response.join("\n")
    }

    if (typeof response === "object" && response !== null) {
      const record = response as Record<string, unknown>

      if (Array.isArray(record.formatted_text)) {
        return record.formatted_text.join("\n")
      }

      return ""
    }

    return String(response)
  }, [transformMutation.data?.data])

  const inputLineCount = useMemo(() => {
    if (!query) return 0
    return query.split(/\r?\n/).length
  }, [query])

  const outputLineCount = useMemo(() => {
    if (!outputText) return 0
    return outputText.split(/\r?\n/).length
  }, [outputText])

  async function copyOutput() {
    if (!outputText) return
    await navigator.clipboard.writeText(outputText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  function toggleOperation(operationId: OperationId) {
    setSelectedOperations((previous) => {
      if (previous.includes(operationId)) {
        return previous.filter((value) => value !== operationId)
      }

      const blocked = new Set(MUTUALLY_EXCLUSIVE_OPERATIONS[operationId] ?? [])
      return [
        ...previous.filter((value) => !blocked.has(value)),
        operationId,
      ]
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Text Utilities</CardTitle>
          <CardDescription>
            Clean pasted values, normalize casing, fang or defang indicators, simplify domains, and deduplicate lists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Defang / refang</Badge>
            <Badge variant="secondary">Case normalization</Badge>
            <Badge variant="secondary">Domain cleanup</Badge>
            <Badge variant="secondary">List cleanup</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {OPERATIONS.map((operation) => {
              const checked = selectedOperations.includes(operation.id)

              return (
                <label
                  key={operation.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleOperation(operation.id)}
                  />
                  <div className="space-y-1">
                    <Label className="cursor-pointer">{operation.label}</Label>
                    <p className="text-xs text-muted-foreground">{operation.description}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
        <Card className="flex min-h-0 flex-col">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Source Text</CardTitle>
              <div className="text-sm text-muted-foreground">{inputLineCount} line{inputLineCount === 1 ? "" : "s"}</div>
            </div>
            <CardDescription>Paste indicators, URLs, emails, or mixed line-separated values.</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <Textarea
              rows={12}
              placeholder={[
                "example.com",
                "1.2.3.4",
                "hxxps://evil.example/login",
                "user@example.org",
              ].join("\n")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-0 flex-1"
            />
            <Button
              onClick={() => transformMutation.mutate()}
              disabled={transformMutation.isPending || !query.trim() || selectedOperations.length === 0}
            >
              {transformMutation.isPending ? "Processing..." : "Transform Text"}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Result</CardTitle>
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">{outputLineCount} line{outputLineCount === 1 ? "" : "s"}</div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyOutput()}
                  disabled={!outputText}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <CardDescription>Transformed output for the operations you selected.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <Textarea
              rows={12}
              value={outputText}
              readOnly
              className="min-h-0 h-full"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
