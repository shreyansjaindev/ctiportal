/**
 * Navigation configuration and menu structure
 * @module components/navigation
 */

import {
  GlobeIcon,
  FileTextIcon,
  LayoutGridIcon,
  Link2Icon,
  MailIcon,
  SearchIcon,
  SettingsIcon,
  ShieldAlertIcon,
  TextIcon,
  UsersIcon,
} from "lucide-react"
import { AnomaliIcon } from "@/shared/components/icons/AnomaliIcon"

/**
 * Main navigation items for the application
 */
export const navItems = [
  { title: "Home", path: "/", icon: LayoutGridIcon },
  {
    title: "Intelligence Harvester",
    path: "/intelligence-harvester",
    icon: SearchIcon,
  },
  { title: "Domain Monitoring", path: "/domain-monitoring", icon: ShieldAlertIcon },
  { title: "Anomali ThreatStream", path: "/threatstream", icon: AnomaliIcon },
  { title: "Active Directory", path: "/active-directory", icon: UsersIcon },
  { title: "Threat Report Extractor (Experimental)", path: "/threat-report-extractor", icon: FileTextIcon },
  { title: "Text Utilities", path: "/text-utilities", icon: TextIcon },
  { title: "Link Unwrapper", path: "/link-unwrapper", icon: Link2Icon },
  { title: "Mail Header Analyzer", path: "/mail-header-analyzer", icon: MailIcon },
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
