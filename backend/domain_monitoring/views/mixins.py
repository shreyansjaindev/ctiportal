"""
Mixins for domain monitoring ViewSets.
"""
import logging

from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class CountMixin:
    """Mixin for viewsets that return count metadata"""
    
    def get_counts(self, queryset):
        """Get total count and status breakdown"""
        total_count = queryset.count()
        status_counts = queryset.values("status").annotate(count=Count("status")).order_by("status")
        return total_count, status_counts

    def get_limited_queryset(self, queryset, limit=5000):
        """Limit queryset to prevent excessive memory usage"""
        return queryset[:limit] if queryset.count() > limit else queryset

    def get_queryset_with_counts(self, request, limit=False):
        """Get filtered queryset with count metadata"""
        queryset = self.filter_queryset(self.get_queryset())
        total_count, status_counts = self.get_counts(queryset)
        if limit:
            queryset = self.get_limited_queryset(queryset)
        return queryset, total_count, status_counts

    def list_with_counts(self, request, *args, **kwargs):
        """List items with count metadata"""
        queryset, total_count, status_counts = self.get_queryset_with_counts(
            request, limit=kwargs.get("limit_queryset", False)
        )
        serializer = self.get_serializer(queryset, many=True)
        # Return pagination-friendly response
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class BulkOperationsMixin:
    """Mixin for bulk create, update, and delete operations"""
    
    def bulk_create(self, request, *args, **kwargs):
        """Handle both single and bulk creation of items"""
        if not isinstance(request.data, list):
            # For single item, use the standard ModelViewSet create method
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        created = []
        errors = []
        for idx, item in enumerate(request.data):
            serializer = self.get_serializer(data=item)
            try:
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                created.append(serializer.data)
            except Exception as e:
                logger.warning(f"Failed to create item {idx}: {e}")
                errors.append({"index": idx, "error": str(e)})

        logger.info(f"Bulk create: {len(created)} added, {len(errors)} failed")
        response_status = status.HTTP_201_CREATED if created and not errors else status.HTTP_207_MULTI_STATUS if created else status.HTTP_400_BAD_REQUEST
        return Response(
            {"created": len(created), "failed": len(errors), "errors": errors if errors else []},
            status=response_status,
        )

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request, *args, **kwargs):
        """Bulk delete items by ID"""
        ids = request.data.get("ids", [])
        if not ids:
            return Response(
                {"error": "No IDs provided for deletion."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        model_class = self.queryset.model
        deleted_count, _ = model_class.objects.filter(id__in=ids).delete()
        logger.info(f"Bulk deleted {deleted_count} items")

        return Response(
            {"deleted": deleted_count},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["patch"], url_path="bulk-patch")
    def bulk_patch(self, request, *args, **kwargs):
        """Bulk update status for multiple items"""
        request_data = request.data
        ids = request_data.get("ids", {})
        instance_status = request_data.get("status")
        updated_count = 0
        error_count = 0
        errors = []

        model_class = self.queryset.model

        for instance_id in ids:
            try:
                instance = model_class.objects.get(id=instance_id)
                serializer = self.get_serializer(
                    instance, data={"status": instance_status}, partial=True
                )
                serializer.is_valid(raise_exception=True)
                serializer.save()
                updated_count += 1
            except Exception as e:
                logger.error(f"Error updating status for id {instance_id}: {e}")
                error_count += 1
                errors.append(str(e))

        logger.info(f"Bulk patch: {updated_count} updated, {error_count} failed")
        return Response(
            {"updated": updated_count, "failed": error_count, "errors": errors},
            status=status.HTTP_200_OK,
        )
