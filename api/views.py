from rest_framework.views import APIView
from rest_framework.response import Response
from urllib.parse import urljoin


class GetRoutes(APIView):
    def get(self, request):
        base_url = request.build_absolute_uri("/api/")
        route_names = ["intelligence-harvester", "domain-monitoring"]
        routes = {route: urljoin(base_url, f"{route}/") for route in route_names}
        return Response(routes)
