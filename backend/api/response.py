from rest_framework.response import Response


def success(data, meta=None, status_code=200):
    if meta is None:
        return Response(data, status=status_code)
    return Response({"data": data, "meta": meta}, status=status_code)


def error(message, code="bad_request", details=None, status_code=400):
    payload = {"detail": message}
    if details is not None:
        payload["errors"] = details
    return Response(payload, status=status_code)
