import dns.resolver
import dns.reversename
import sys


def get_dns_records(domain):
    results = {"a": [], "mx": [], "spf": ""}

    dns_records = ["a", "mx", "txt"]

    resolver = dns.resolver.Resolver()
    resolver.nameservers = ["1.1.1.1", "1.0.0.1"]

    for record in dns_records:
        try:
            answers = resolver.resolve(domain, record)
            if record == "mx":
                results[record] = [rdata.to_text().split(" ")[1][:-1] for rdata in answers]
            elif record == "txt":
                results["spf"] = [
                    rdata.to_text().replace('"', "").replace("  ", " ")
                    for rdata in answers
                    if "v=spf" in rdata.to_text()
                ][0]
            else:
                results[record] = [rdata.to_text() for rdata in answers]

        except Exception as e:
            print(e)

    return results


if __name__ == "__main__":
    query = sys.argv[1]
    print(get_dns_records(query))
