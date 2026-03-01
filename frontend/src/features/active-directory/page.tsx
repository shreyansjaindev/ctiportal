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
import { Input } from "@/shared/components/ui/input"
import { apiPost } from "@/shared/lib/api"

export default function ActiveDirectoryPage() {
  const [query, setQuery] = useState("")

  const lookupMutation = useMutation({
    mutationFn: () =>
      apiPost<unknown>(
        "/tools/active-directory/",
        JSON.stringify({ query })
      ),
  })
  const responseData = lookupMutation.data as unknown

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Lookup</CardTitle>
          <CardDescription>Enter a username or email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="jdoe"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            onClick={() => lookupMutation.mutate()}
            disabled={lookupMutation.isPending}
          >
            {lookupMutation.isPending ? "Searching..." : "Search"}
          </Button>
        </CardContent>
      </Card>

      {responseData ? (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
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

