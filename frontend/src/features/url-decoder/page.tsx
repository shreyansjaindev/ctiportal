import { useMemo, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Textarea } from "@/shared/components/ui/textarea"

export default function UrlDecoderPage() {
  const [input, setInput] = useState("")

  const decoded = useMemo(() => {
    if (!input) {
      return ""
    }
    return input
      .split("\n")
      .map((line) => {
        try {
          return decodeURIComponent(line.trim())
        } catch {
          return line
        }
      })
      .join("\n")
  }, [input])

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Encoded Input</CardTitle>
            <CardDescription>Paste URLs to decode.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={10}
              placeholder="https%3A%2F%2Fevil.example%2Fpath%3Fq%3D1"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Decoded Output</CardTitle>
            <CardDescription>Results update automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea rows={10} value={decoded} readOnly />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

