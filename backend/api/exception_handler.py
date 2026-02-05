from rest_framework.views import exception_handler
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response


def fastapi_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    if isinstance(exc, ValidationError):
        return Response(
            {
                "detail": "Validation error",
                "errors": response.data,
            },
            status=response.status_code,
        )

    if isinstance(response.data, dict) and "detail" in response.data:
        return Response(
            {"detail": response.data.get("detail")},
            status=response.status_code,
        )

    return Response(
        {"detail": "Request failed"},
        status=response.status_code,
    )