import sys
import os
import base64
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Mail,
    Attachment,
    FileContent,
    FileName,
    FileType,
    Disposition,
    ContentId,
)

API_KEY = os.getenv("SENDGRID").split(",")[0]


def send(recipient, content):
    attachment = Attachment()
    encoded = base64.b64encode(content.encode("utf-8"))
    attachment.file_content = FileContent(str(encoded, "utf-8"))
    attachment.file_type = FileType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    attachment.filename = "Intelligence_Report.xlsx"
    attachment.disposition = Disposition("attachment")

    message = Mail(
        from_email="intelligenceharvester@outlook.com",
        to_emails=recipient,
        subject="Intelligence Harvester Report",
        html_content="<strong>Your Intelligence Report Is Ready</strong>",
    )

    message.add_attachment(attachment)

    try:
        sg = SendGridAPIClient(API_KEY)
        response = sg.send(message)
        print(response.status_code)
        print(response.body)
        print(response.headers)
    except Exception as e:
        print(e)


if __name__ == "__main__":
    recipient = sys.argv[1]
    content = sys.argv[2]
    send(recipient, content)
