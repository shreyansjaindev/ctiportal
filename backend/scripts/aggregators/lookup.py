import requests
import sys
import os
import tldextract
import dns.resolver
import dns.reversename
import dns.exception
from ipwhois.net import Net
from ipwhois.asn import IPASN
from ..providers.securitytrails import get_dns_records
from ..utils.api_helpers import check_api_key
import logging

logger = logging.getLogger(__name__)

_raw_ipapi = os.getenv("IPAPI")
if _raw_ipapi:
    API_KEY = _raw_ipapi.split(",")[0].strip()
else:
    API_KEY = None
DNS_RECORDS = ["A", "NS", "CNAME", "SOA", "MX", "TXT"]


def dns_records(domain, value_type="domain"):
    dns_data = {}

    for record in DNS_RECORDS:
        try:
            answers = dns.resolver.resolve(domain, record)
            for rdata in answers:
                if record in dns_data.keys():
                    dns_data[record] = (
                        dns_data[record].replace('"', "") + "," + rdata.to_text().replace('"', "")
                    )
                else:
                    dns_data[record] = rdata.to_text()

            if "," in dns_data[record]:
                dns_data[record] = dns_data[record].split(",")
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout, dns.resolver.NoNameservers):
            dns_data[record] = "Not Found"

    # DMARC Record
    try:
        answers = dns.resolver.resolve("_dmarc." + domain, "TXT")
        for rdata in answers:
            dns_data["DMARC"] = rdata.to_text().replace('"', "")
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout, dns.resolver.NoNameservers):
        dns_data["DMARC"] = "Not Found"

    # Remove dot(.) at the end of string from NS Record
    try:
        if isinstance(dns_data["NS"], list):
            temp_list = []
            for ns in dns_data["NS"]:
                temp_list.append(ns[:-1])

            dns_data["NS"] = temp_list
        else:
            if dns_data["NS"] != "Not Found":
                dns_data["NS"] = [dns_data["NS"][:-1]]
            else:
                dns_data["NS"] = ["Not Found"]
    except (IndexError, KeyError, AttributeError):
        pass

    # MX Record
    try:
        if isinstance(dns_data["MX"], list):
            temp_list = []
            for mx in dns_data["MX"]:
                temp_list.append(mx[:-1])

            dns_data["MX"] = temp_list
        else:
            if dns_data["MX"] != "Not Found":
                dns_data["MX"] = [dns_data["MX"][:-1]]
            else:
                dns_data["MX"] = ["Not Found"]
    except (IndexError, KeyError, AttributeError):
        pass

    # Filter out SPF record from TXT Record
    try:
        if isinstance(dns_data["TXT"], list):
            for txt_record in dns_data["TXT"]:
                if "v=spf" in txt_record:
                    dns_data["SPF"] = txt_record
                    break
                else:
                    dns_data["SPF"] = "Not Found"
            dns_data.pop("TXT")

        elif "v=spf" in dns_data["TXT"]:
            dns_data["SPF"] = dns_data["TXT"].replace('"', "")
            dns_data.pop("TXT")
    except (KeyError, AttributeError, TypeError):
        pass

    # Remove SOA Record
    try:
        dns_data.pop("SOA")
    except KeyError:
        pass

    return dns_data


def ip_to_hostname(ip):
    data = {}
    query = dns.reversename.from_address(ip)
    try:
        answers = dns.resolver.resolve(query, "PTR")
        data["hostname"] = answers.rrset[0].to_text()[:-1]
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout, dns.resolver.NoNameservers, AttributeError, IndexError):
        data["hostname"] = ""
    return data


def ip_to_asn(ip):
    results = {}
    net = Net(ip)
    obj = IPASN(net)
    results = obj.lookup()
    return results


# https://ipapi.com
def iplocation(ip):
    error = check_api_key(API_KEY, "IPAPI")
    if error:
        return error

    url = f"http://api.ipapi.com/api/{ip}?access_key={API_KEY}"
    data = {}

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        data.pop("location", None)
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        data = {}

    return data


def ip_lookup(ip):
    data = ip_to_hostname(ip)
    data.update(ip_to_asn(ip))
    data.update(iplocation(ip))
    return data


def lookup(query, input_type):
    lookup_dict = {
        "domain": get_dns_records,
        "url": lambda query: get_dns_records(tldextract.extract(query).registered_domain),
        "ipv4": ip_lookup,
        "ipv6": ip_lookup,
    }

    if input_type in lookup_dict:
        return lookup_dict[input_type](query)
    else:
        return ""


if __name__ == "__main__":
    query = sys.argv[1]
    input_type = sys.argv[2]
    print(lookup(query, input_type))
