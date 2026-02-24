import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Textarea } from "@/shared/components/ui/textarea"
import { cn } from "@/shared/lib/utils"

interface IndicatorInputProps {
  quickInput: string
  setQuickInput: (value: string) => void
  onAdd: (input: string) => void
  indicatorCount: number
  placeholder: string
  className?: string
}

export function IndicatorInput({
  quickInput,
  setQuickInput,
  onAdd,
  placeholder,
  className,
}: IndicatorInputProps) {
  return (
    <Card className={cn("rounded-tl-lg rounded-tr-none rounded-b-none", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Lookup Indicators</CardTitle>
            <CardDescription className="text-xs">
              Enter IPs, domains, or URLs you want to investigate (one per line or comma-separated)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          id="input"
          placeholder={placeholder}
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              if (quickInput.trim()) {
                onAdd(quickInput)
                setQuickInput("")
              }
            }
          }}
          rows={4}
          className="h-30 resize-none field-sizing-fixed overflow-y-auto font-mono text-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              onAdd(quickInput)
              setQuickInput("")
            }}
            disabled={!quickInput.trim()}
          >
            Add to List
          </Button>
          <span className="text-xs text-muted-foreground">or press Ctrl+Enter</span>
        </div>
      </CardContent>
    </Card>
  )
}

