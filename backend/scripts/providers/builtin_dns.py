"""
Built-in DNS lookup using the system resolver (dnspython).
No API key required.
"""
import dns.resolver
import dns.reversename
import dns.exception
import logging

logger = logging.getLogger(__name__)

DNS_RECORDS = ["A", "NS", "CNAME", "SOA", "MX", "TXT"]


def dns_records(domain: str) -> dict:
    """Resolve common DNS record types for a domain using the system resolver."""
    dns_data = {}

    for record in DNS_RECORDS:
        try:
            answers = dns.resolver.resolve(domain, record)
            for rdata in answers:
                if record in dns_data:
                    dns_data[record] = dns_data[record].replace('"', "") + "," + rdata.to_text().replace('"', "")
                else:
                    dns_data[record] = rdata.to_text()
            if "," in dns_data[record]:
                dns_data[record] = dns_data[record].split(",")
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout, dns.resolver.NoNameservers):
            dns_data[record] = "Not Found"

    # DMARC record
    try:
        answers = dns.resolver.resolve("_dmarc." + domain, "TXT")
        for rdata in answers:
            dns_data["DMARC"] = rdata.to_text().replace('"', "")
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout, dns.resolver.NoNameservers):
        dns_data["DMARC"] = "Not Found"

    # Strip trailing dot from NS records
    try:
        if isinstance(dns_data["NS"], list):
            dns_data["NS"] = [ns[:-1] for ns in dns_data["NS"]]
        elif dns_data["NS"] != "Not Found":
            dns_data["NS"] = [dns_data["NS"][:-1]]
        else:
            dns_data["NS"] = ["Not Found"]
    except (IndexError, KeyError, AttributeError):
        pass

    # Strip trailing dot from MX records
    try:
        if isinstance(dns_data["MX"], list):
            dns_data["MX"] = [mx[:-1] for mx in dns_data["MX"]]
        elif dns_data["MX"] != "Not Found":
            dns_data["MX"] = [dns_data["MX"][:-1]]
        else:
            dns_data["MX"] = ["Not Found"]
    except (IndexError, KeyError, AttributeError):
        pass

    # Promote SPF from TXT, remove TXT
    try:
        if isinstance(dns_data["TXT"], list):
            for txt_record in dns_data["TXT"]:
                if "v=spf" in txt_record:
                    dns_data["SPF"] = txt_record
                    break
            else:
                dns_data["SPF"] = "Not Found"
            dns_data.pop("TXT")
        elif "v=spf" in dns_data.get("TXT", ""):
            dns_data["SPF"] = dns_data["TXT"].replace('"', "")
            dns_data.pop("TXT")
    except (KeyError, AttributeError, TypeError):
        pass

    # Remove SOA
    dns_data.pop("SOA", None)

    return dns_data


def ip_to_hostname(ip: str) -> dict:
    """Resolve a PTR record for an IP using the system resolver."""
    query = dns.reversename.from_address(ip)
    try:
        answers = dns.resolver.resolve(query, "PTR")
        return {"hostname": answers.rrset[0].to_text()[:-1]}
    except (
        dns.resolver.NXDOMAIN,
        dns.resolver.NoAnswer,
        dns.exception.Timeout,
        dns.resolver.NoNameservers,
        AttributeError,
        IndexError,
    ):
        return {"hostname": ""}
