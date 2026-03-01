import { useMutation } from "@tanstack/react-query"
import { useState } from "react"

import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Textarea } from "@/shared/components/ui/textarea"
import { apiPost } from "@/shared/lib/api"

export default function TextFormatterPage() {
  const [query, setQuery] = useState("")

  const formatMutation = useMutation({
    mutationFn: () =>
      apiPost<unknown>(
        "/tools/text-formatting/",
        JSON.stringify({ query, checklist: [] })
      ),
  })
  const responseData = formatMutation.data ?? null

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Input</CardTitle>
          <CardDescription>Paste raw indicators below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={8}
            placeholder="example.com\n1.2.3.4\nhttp://evil.example"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            onClick={() => formatMutation.mutate()}
            disabled={formatMutation.isPending}
          >
            {formatMutation.isPending ? "Formatting..." : "Format"}
          </Button>
        </CardContent>
      </Card>

      {responseData ? (
        <Card>
          <CardHeader>
            <CardTitle>Formatted Output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto rounded-md border bg-muted p-4 text-xs text-foreground">
              {JSON.stringify(responseData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

