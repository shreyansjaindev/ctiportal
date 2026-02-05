# ctiportal

A preview version is hosted on https://ctiportal.onrender.com/ (It might take a few minutes to start the server)

## Overview

The `ctiportal` web application serves as a comprehensive toolset for Cybersecurity Analysts, offering a range of features to streamline threat intelligence analysis. By consolidating multiple essential tools into a single platform, it aims to enhance efficiency and provide a more comprehensive view of indicators.

### Key Features

1. **Intelligence Harvester:**

   - Collects and displays information on indicators (domains, URLs, IPs, hashes, emails, CVEs, etc) from 16+ intelligence sources.
   - Supports bulk queries and the functionality to export the results to an Excel file.

2. **URL Decoder:**

   - Decodes URLs encoded with O365 Safelinks/Proofpoint TAP.

3. **Text Formatter:**

   - Supports fang/defang of IoCs, domain and subdomain extraction, duplicate removal, and case conversion.

4. **Website Screenshot:**

   - Allows bulk querying for website screenshots, essential for analyzing malicious websites.

5. **Mail Header Analyzer:**

   - Facilitates the analysis of email headers for deeper insights.

6. **Domain Monitoring:**

   - Provides a list of newly registered domains matching specific keywords and monitors for domain changes.

7. **Anomali ThreatStream Search:**
   - Enables the export of bulk IoCs information from Anomali Threatstream.

### Purpose

The `ctiportal` addresses the limitations of existing Threat Intelligence Platforms (TIPs) by centralizing information on indicators. Analysts often rely on various external websites, leading to fragmented analysis. This platform aims to be a one-stop solution, preventing the need for multiple external sources and supporting bulk lookups.

### Intelligence Harvester Sources

| Source                                | Domain | IP  | Email | Hash | URL | CVE |
| ------------------------------------- | ------ | --- | ----- | ---- | --- | --- |
| Standard Lookup                       | ✓      | ✓   | ✘     | ✘    | ✓   | ✘   |
| IBM X-Force Exchange                  | ✓      | ✓   | ✘     | ✘    | ✓   | ✓   |
| Website Screenshot                    | ✓      | ✓   | ✘     | ✘    | ✓   | ✘   |
| VirusTotal                            | ✓      | ✓   | ✘     | ✓    | ✓   | ✘   |
| Hybrid Analysis                       | ✘      | ✓   | ✘     | ✓    | ✘   | ✘   |
| WHOIS                                 | ✓      | ✓   | ✘     | ✘    | ✓   | ✘   |
| Blacklists                            | ✓      | ✓   | ✘     | ✘    | ✓   | ✘   |
| urlscan.io                            | ✓      | ✓   | ✘     | ✘    | ✓   | ✘   |
| host.io                               | ✓      | ✘   | ✘     | ✘    | ✘   | ✘   |
| PhishTank                             | ✓      | ✓   | ✘     | ✘    | ✓   | ✘   |
| HTTP Status                           | ✓      | ✓   | ✘     | ✘    | ✓   | ✘   |
| AbuseIPDB                             | ✘      | ✓   | ✘     | ✘    | ✘   | ✘   |
| Email Validator                       | ✘      | ✘   | ✓     | ✘    | ✘   | ✘   |
| Pulsedive                             | ✓      | ✓   | ✘     | ✘    | ✓   | ✘   |
| National Vulnerability Database (NVD) | ✘      | ✘   | ✘     | ✘    | ✘   | ✓   |

### Additional Features

- Defanged IOCs Supported
- Multiple Input Formats (Comma, Space, Line Separated)
- CSV Export Capability

### Website Screenshot

Analysis of malicious websites often requires an isolated environment, and `ctiportal` provides bulk website screenshot queries to address this need. This feature distinguishes it from other tools, as it allows for real-time analysis in an isolated environment.

### Pending Updates

1. **Infographics for Intelligence Harvester:**

   - Data will be displayed using infographics for enhanced visualization.

2. **Historical Database:**

   - Plans to maintain a historical database for analysis and extracting valuable information.

3. **Integration with Intel Feeds:**
   - Collection of Intel Feeds, maintaining a database, and integration with applications like Anomali.

### Notes

- Premium API keys are required for heavy usage.

Feel free to explore the `ctiportal` and contribute to its evolution!

_Note: This README is subject to updates as the project progresses._
