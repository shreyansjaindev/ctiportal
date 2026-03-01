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
import { Textarea } from "@/shared/components/ui/textarea"
import { API_BASE } from "@/shared/lib"

export default function ThreatstreamPage() {
  const [filters, setFilters] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const exportMutation = useMutation({
    mutationFn: async () => {
      // Validate file size (max 10MB)
      if (file && file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit")
      }
      
      // Validate file type if file is provided
      if (file && !["application/json", "text/plain"].includes(file.type)) {
        throw new Error("Only JSON and text files are allowed")
      }

      const formData = new FormData()
      if (file) {
        formData.append("file", file)
      } else {
        formData.append("filters", filters)
      }
      const response = await fetch(`${API_BASE}/tools/threatstream-exports/`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      if (!response.ok) {
        throw new Error("Threatstream export failed")
      }
      return response.json()
    },
  })
  const responseData = exportMutation.data

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Filters</CardTitle>
          <CardDescription>
            Paste JSON filters or upload a feed file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={6}
            placeholder='{"types": ["domain"], "limit": 100}'
            value={filters}
            onChange={(event) => setFilters(event.target.value)}
          />
          <Input
            type="file"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null
              setFile(nextFile)
            }}
          />
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? "Exporting..." : "Run Export"}
          </Button>
        </CardContent>
      </Card>

      {responseData ? (
        <Card>
          <CardHeader>
            <CardTitle>Export Results</CardTitle>
            <CardDescription>Raw response preview.</CardDescription>
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

