import { Badge } from "@/shared/components/ui/badge"

interface HttpStatusDisplayProps {
  code: number | string
  showText?: boolean
}

const HTTP_STATUS_TEXT: Record<number, string> = {
  // 1xx Informational
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  103: "Early Hints",

  // 2xx Success
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",

  // 3xx Redirection
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  307: "Temporary Redirect",
  308: "Permanent Redirect",

  // 4xx Client Error
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",

  // 5xx Server Error
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
  599: "Network Connect Timeout Error",
}

function getStatusBackground(code: number): string {
  if (code >= 200 && code < 300) return "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100 border-green-300 dark:border-green-700"
  if (code >= 300 && code < 400) return "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100 border-blue-300 dark:border-blue-700"
  if (code >= 400 && code < 500) return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100 border-amber-300 dark:border-amber-700"
  if (code >= 500) return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100 border-red-300 dark:border-red-700"
  return "bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100 border-gray-300 dark:border-gray-700"
}

export function HttpStatusDisplay({
  code,
  showText = true,
}: HttpStatusDisplayProps) {
  const statusCode = typeof code === "string" ? parseInt(code, 10) : code

  // Handle invalid codes
  if (isNaN(statusCode)) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">Invalid</Badge>
        {showText && <span className="text-sm text-muted-foreground">Unknown status</span>}
      </div>
    )
  }

  const statusText = HTTP_STATUS_TEXT[statusCode] || "Unknown Status"
  const backgroundClasses = getStatusBackground(statusCode)

  if (!showText) {
    // Just the badge, no text
    return (
      <Badge variant="outline" className={backgroundClasses}>
        {statusCode}
      </Badge>
    )
  }

  // Badge with text description
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={backgroundClasses}>
        {statusCode}
      </Badge>
      <span className="text-sm text-muted-foreground">{statusText}</span>
    </div>
  )
}

export default HttpStatusDisplay
