import { useMemo, useState } from "react"

import { Badge } from "@/shared/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Textarea } from "@/shared/components/ui/textarea"

import { decodeWrappedUrl, getProviderLabel } from "./decoder"

export default function UrlDecoderPage() {
  const [input, setInput] = useState("")

  const results = useMemo(
    () =>
      input
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => decodeWrappedUrl(line)),
    [input]
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Link Unwrapper</CardTitle>
            <CardDescription>
              Reveal the final destination behind wrapped security links and common redirect URLs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Microsoft Safe Links</Badge>
              <Badge variant="secondary">Proofpoint URL Defense</Badge>
              <Badge variant="secondary">Mimecast</Badge>
              <Badge variant="secondary">Barracuda</Badge>
              <Badge variant="secondary">Cisco Secure Email</Badge>
              <Badge variant="secondary">Trend Micro</Badge>
              <Badge variant="secondary">Symantec / Broadcom</Badge>
              <Badge variant="secondary">Google / Facebook / LinkedIn</Badge>
            </div>
            <Textarea
              rows={3}
              className="resize-none field-sizing-fixed"
              placeholder={[
                "https://nam01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fevil.example%2Fpayload",
                "https://urldefense.com/v3/__https://example.com/login__;!!...",
                "https://www.google.com/url?q=https%3A%2F%2Fexample.org",
              ].join("\n")}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Resolved destinations and the wrapper family identified for each link.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden">
            {results.length === 0 ? (
              <div className="flex h-full min-h-[16rem] items-center justify-center text-sm text-muted-foreground">
                Add one or more wrapped links above to reveal their destination.
              </div>
            ) : (
              <div className="h-full min-h-0 overflow-y-auto">
                <table className="w-full table-auto text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Destination</th>
                      <th className="px-3 py-2 whitespace-nowrap">Wrapper Type</th>
                      <th className="px-3 py-2">Wrapped Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={`${result.input}-${index}`} className="border-t">
                        <td className="px-3 py-2">
                          <p className="truncate" title={result.output || result.input}>
                            {result.output || result.input}
                          </p>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Badge variant="outline">
                            {getProviderLabel(result.provider)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <p className="truncate" title={result.input}>
                            {result.input}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
