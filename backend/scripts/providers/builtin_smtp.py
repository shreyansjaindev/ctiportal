"""
Built-in SMTP email validation
Steps:
  1. Regex format check
  2. DNS MX record lookup
  3. SMTP RCPT TO handshake (no message sent)
"""
import re
import dns.resolver
import smtplib
import socket
import logging

logger = logging.getLogger(__name__)

# Sender used in SMTP envelope (doesn't need to be real)
SMTP_FROM = "verify@check.local"
SMTP_TIMEOUT = 10


def smtp_validate(email: str) -> dict:
    """
    Validate an email address using regex, MX lookup, and SMTP handshake.
    Returns a dict with: valid, format_valid, mx_valid, smtp_valid, mx_host, error (if any)
    """
    result = {
        "email": email,
        "format_valid": False,
        "mx_valid": False,
        "smtp_valid": False,
        "valid": False,
    }

    # --- Step 1: Regex format check ---
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        result["error"] = "Invalid email format"
        return result
    result["format_valid"] = True

    domain = email.split("@", 1)[1]

    # --- Step 2: MX lookup ---
    try:
        mx_records = dns.resolver.resolve(domain, "MX")
        mx_hosts = sorted(mx_records, key=lambda r: r.preference)
        mx_host = str(mx_hosts[0].exchange).rstrip(".")
        result["mx_valid"] = True
        result["mx_host"] = mx_host
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers):
        result["error"] = f"No MX records found for domain '{domain}'"
        return result
    except Exception as e:
        result["error"] = f"MX lookup failed: {e}"
        return result

    # --- Step 3: SMTP RCPT TO handshake ---
    try:
        with smtplib.SMTP(timeout=SMTP_TIMEOUT) as smtp:
            smtp.connect(mx_host, 25)
            smtp.helo(socket.getfqdn())
            smtp.mail(SMTP_FROM)
            code, message = smtp.rcpt(email)
            # 250 = accepted, 251 = forwarded (both count as valid)
            if code in (250, 251):
                result["smtp_valid"] = True
                result["valid"] = True
            else:
                result["smtp_valid"] = False
                result["smtp_response"] = f"{code} {message.decode(errors='replace')}"
    except smtplib.SMTPRecipientsRefused:
        result["smtp_valid"] = False
        result["valid"] = False
    except smtplib.SMTPConnectError as e:
        # MX exists but connection refused — treat conservatively as unknown
        logger.warning("SMTP connect error for %s: %s", mx_host, e)
        result["smtp_valid"] = None
        result["valid"] = None
        result["error"] = f"SMTP connect error: {e}"
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        logger.warning("SMTP unreachable for %s: %s", mx_host, e)
        result["smtp_valid"] = None
        result["valid"] = None
        result["error"] = f"SMTP unreachable: {e}"
    except Exception as e:
        logger.warning("SMTP handshake error for %s: %s", mx_host, e)
        result["smtp_valid"] = None
        result["valid"] = None
        result["error"] = f"SMTP error: {e}"

    return result
