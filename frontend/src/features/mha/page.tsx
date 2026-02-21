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

export default function MhaPage() {
  const { token } = useAuth()
  const [header, setHeader] = useState("")

  const analyzeMutation = useMutation({
    mutationFn: () =>
      apiPost<unknown>(
        "/tools/mail-header-analysis/",
        JSON.stringify({ header }),
        token
      ),
  })
  const responseData = analyzeMutation.data ?? null

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Header Input</CardTitle>
          <CardDescription>Paste raw email headers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={10}
            placeholder="Received: by..."
            value={header}
            onChange={(event) => setHeader(event.target.value)}
          />
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
          </Button>
        </CardContent>
      </Card>

      {responseData ? (
        <Card>
          <CardHeader>
            <CardTitle>Analysis</CardTitle>
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

