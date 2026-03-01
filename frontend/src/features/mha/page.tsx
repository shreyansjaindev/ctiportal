import { useMutation } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Textarea } from "@/shared/components/ui/textarea"
import { apiPost } from "@/shared/lib/api"
import { useAuth } from "@/shared/lib/auth"

type MhaHop = {
  by?: string
  date?: string
  delay?: number
  for?: string
  from?: string
  hop?: number
  id?: string
  with?: string
}

type MhaData = {
  Subject?: string
  From?: string
  To?: string
  Date?: string
  MessageID?: string
  ReturnPath?: string
  HasDefects?: boolean
  DefectCategories?: string[]
  Defects?: string[]
  "Authentication-Results"?: string
  "Authentication-Results-Original"?: string
  "Received-SPF"?: string
  "DKIM-Signature"?: string
  ReceivedParsed?: MhaHop[]
}

type MhaResponse = {
  mha: MhaData
}

export default function MhaPage() {
  const { token } = useAuth()
  const [header, setHeader] = useState("")

  const analyzeMutation = useMutation({
    mutationFn: () =>
      apiPost<MhaResponse>(
        "/tools/mail-header-analysis/",
        JSON.stringify({ header }),
        token
      ),
  })

  const analysis = analyzeMutation.data?.mha
  const hops = analysis?.ReceivedParsed ?? []

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Header Input</CardTitle>
          <CardDescription>Paste raw email headers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={12}
            value={header}
            onChange={(event) => setHeader(event.target.value)}
            placeholder="Received: by..."
          />
          <div className="flex gap-2">
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending || !header.trim()}
            >
              {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setHeader("")}
              disabled={!header}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {analyzeMutation.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>
            {analyzeMutation.error instanceof Error
              ? analyzeMutation.error.message
              : "Unable to analyze this header."}
          </AlertDescription>
        </Alert>
      ) : null}

      {!analysis && !analyzeMutation.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>What You’ll Get</CardTitle>
            <CardDescription>
              Message summary, authentication signals, delivery path, and raw parsed data.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {analysis ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Message Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Subject:</strong> {analysis.Subject || "-"}</div>
              <div><strong>From:</strong> {analysis.From || "-"}</div>
              <div><strong>To:</strong> {analysis.To || "-"}</div>
              <div><strong>Date:</strong> {analysis.Date || "-"}</div>
              <div><strong>Message ID:</strong> {analysis.MessageID || "-"}</div>
              <div><strong>Return Path:</strong> {analysis.ReturnPath || "-"}</div>
              <div><strong>Defects:</strong> {analysis.HasDefects ? "Yes" : "No"}</div>
              {analysis.DefectCategories?.length ? (
                <div><strong>Defect Categories:</strong> {analysis.DefectCategories.join(", ")}</div>
              ) : null}
              {analysis.Defects?.length ? (
                <div><strong>Defect Details:</strong> {analysis.Defects.join(", ")}</div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>Authentication-Results:</strong>
                <div>{analysis["Authentication-Results"] || "-"}</div>
              </div>
              <div>
                <strong>Authentication-Results-Original:</strong>
                <div>{analysis["Authentication-Results-Original"] || "-"}</div>
              </div>
              <div>
                <strong>Received-SPF:</strong>
                <div>{analysis["Received-SPF"] || "-"}</div>
              </div>
              <div>
                <strong>DKIM-Signature:</strong>
                <div>{analysis["DKIM-Signature"] || "-"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Path</CardTitle>
            </CardHeader>
            <CardContent>
              {hops.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hop</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Delay</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hops.map((hop, index) => (
                      <TableRow key={`${hop.hop ?? index}-${hop.id ?? "hop"}`}>
                        <TableCell>{hop.hop ?? index + 1}</TableCell>
                        <TableCell>{hop.from || "-"}</TableCell>
                        <TableCell>{hop.by || "-"}</TableCell>
                        <TableCell>{hop.with || "-"}</TableCell>
                        <TableCell>{hop.delay ?? "-"}</TableCell>
                        <TableCell>{hop.date || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-sm">No parsed delivery hops.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Raw Parsed Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded border p-4 text-xs">
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
