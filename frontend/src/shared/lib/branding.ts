export const branding = {
  appName: import.meta.env.VITE_BRAND_APP_NAME?.trim() || "CTI Portal",
  appTagline: import.meta.env.VITE_BRAND_APP_TAGLINE?.trim() || "Intelligence Hub",
  logoUrl: import.meta.env.VITE_BRAND_LOGO_URL?.trim() || "",
  logoAlt: import.meta.env.VITE_BRAND_LOGO_ALT?.trim() || "CTI Portal logo",
}

