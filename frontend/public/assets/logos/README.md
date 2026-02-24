# Provider Logos

This directory contains logo files for intelligence provider integrations.

## File Naming Convention

Logo files should be named using the provider ID in lowercase:
- `{provider_id}.svg` (preferred)
- `{provider_id}.png` (fallback)

## Examples

- `virustotal.svg`
- `abuseipdb.svg`
- `ibm_xforce.svg`
- `urlscan.svg`
- `hybrid_analysis.svg`
- `whoisxml.svg`
- `securitytrails.svg`
- `free_whois.svg`

## Fallback Behavior

If a logo file is not found, the UI will automatically display a fallback icon showing the first letter of the provider name in a styled box.

## Recommended Format

- **Format**: SVG (scalable, lightweight)
- **Size**: 32x32px or larger (will be scaled down as needed)
- **Background**: Transparent
- **Colors**: Provider's brand colors

## Where Logos Appear

Provider logos are displayed in:
- Intelligence Harvester lookup result tabs (when multiple providers are used)
- Provider configuration/selection interface
- Overview sections showing provider attribution
