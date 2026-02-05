/**
 * Navigation configuration and menu structure
 * @module components/navigation
 */

import {
  ActivityIcon,
  BellIcon,
  DatabaseIcon,
  FolderIcon,
  GaugeIcon,
  GlobeIcon,
  LayoutGridIcon,
  SettingsIcon,
  ShieldAlertIcon,
  UsersIcon,
} from "lucide-react"

/**
 * Main navigation items for the application
 */
export const navItems = [
  { title: "Home", path: "/", icon: LayoutGridIcon },
  {
    title: "Intelligence Harvester",
    path: "/intelligence-harvester",
    icon: GlobeIcon,
  },
  { title: "Domain Monitoring", path: "/domain-monitoring", icon: ShieldAlertIcon },
  { title: "Threatstream", path: "/threatstream", icon: ActivityIcon },
  { title: "Active Directory", path: "/active-directory", icon: UsersIcon },
  { title: "Text Formatter", path: "/text-formatter", icon: FolderIcon },
  { title: "URL Decoder", path: "/url-decoder", icon: DatabaseIcon },
  { title: "Screenshot", path: "/screenshot", icon: GaugeIcon },
  { title: "Mail Header Analyzer", path: "/mail-header-analyzer", icon: BellIcon },
]

export const navGroups = [
  {
    title: "Overview",
    icon: LayoutGridIcon,
    items: navItems.slice(0, 1),
  },
  {
    title: "Operations",
    icon: GlobeIcon,
    items: navItems.slice(1, 5),
  },
  {
    title: "Tools",
    icon: SettingsIcon,
    items: navItems.slice(5),
  },
]
