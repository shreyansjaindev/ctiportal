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
import { useAuth } from "@/shared/lib/auth"

export default function ScreenshotPage() {
  const { token } = useAuth()
  const [query, setQuery] = useState("")

  const screenshotMutation = useMutation({
    mutationFn: () =>
      apiPost<unknown>(
        "/tools/screenshots/",
        JSON.stringify({ query }),
        token
      ),
  })
  const responseData = screenshotMutation.data ?? null

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Targets</CardTitle>
          <CardDescription>One URL per line.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={8}
            placeholder="https://example.com"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            onClick={() => screenshotMutation.mutate()}
            disabled={screenshotMutation.isPending}
          >
            {screenshotMutation.isPending ? "Capturing..." : "Capture"}
          </Button>
        </CardContent>
      </Card>

      {responseData ? (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
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

