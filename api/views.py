from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework.decorators import api_view


def error404(request, exception=None):
    return JsonResponse({"status_code": 404, "error": "The resource was not found"})


@api_view(["GET"])
def get_routes(request):
    routes = [
        "api/domain-monitoring/",
        "api/frontend/",
        "api/reverse-whois-monitoring/",
        "api/intelligence-harvester/",
    ]
    return Response(routes)
