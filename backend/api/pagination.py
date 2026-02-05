from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response


class ItemsLimitOffsetPagination(LimitOffsetPagination):
    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "items": data,
            }
        )