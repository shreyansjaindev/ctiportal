export const LIMIT_OPTIONS = [25, 50, 100]

export const WATCHED_TYPES = ["domain", "keyword"]

export const WATCHED_STATUS = ["active", "inactive"]

export const watchedResourcesFilterFields = [
  {
    label: "Type",
    value: "resource_type",
    type: "checkbox",
    defaultOpen: true,
    options: WATCHED_TYPES.map((type) => ({ label: type, value: type })),
  },
  {
    label: "Status",
    value: "status",
    type: "checkbox",
    defaultOpen: true,
    options: WATCHED_STATUS.map((status) => ({ label: status, value: status })),
  },
]

export const getTypeVariant = (type: string): "default" | "secondary" => {
  return type === "domain" ? "default" : "secondary"
}

export const getWatchedStatusVariant = (status: string): "default" | "secondary" => {
  return status === "active" ? "default" : "secondary"
}
