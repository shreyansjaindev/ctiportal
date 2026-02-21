"""
Lookalike domain ViewSets with CSV import and comments.
"""
import csv
import io
import logging

from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .mixins import BulkOperationsMixin, CountMixin
from ..filters import LookalikeDomainFilter
from ..models import LookalikeDomain, LookalikeDomainComment
from ..serializers import LookalikeDomainCommentSerializer, LookalikeDomainSerializer

logger = logging.getLogger(__name__)


class LookalikeDomainViewSet(viewsets.ModelViewSet, CountMixin, BulkOperationsMixin):
    """
    Monitor lookalike domains (typosquatting, homograph attacks).
    
    Supports:
    - List, retrieve, create, update, delete lookalike domains
    - Comments via nested routes at /{id}/comments/
    - Count metadata with status breakdown
    - Bulk operations
    - CSV import via /import-csv
    - Limited result sets to prevent memory issues
    """
    queryset = LookalikeDomain.objects.all()
    serializer_class = LookalikeDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = LookalikeDomainFilter
    permission_classes = [IsAuthenticated]
    ordering_fields = ["created", "value", "source", "potential_risk", "status", "company__name"]
    search_fields = ["value", "watched_resource", "source"]

    def list(self, request, *args, **kwargs):
        """List lookalike domains with count metadata (limited to prevent memory issues)"""
        return self.list_with_counts(request, *args, **kwargs, limit_queryset=True)

    def create(self, request, *args, **kwargs):
        """Create single or bulk lookalike domains"""
        return self.bulk_create(request, *args, **kwargs)

    @action(detail=True, methods=["get", "post", "patch", "delete"], url_path="comments")
    def comments(self, request, pk=None):
        """Get, create, update, or delete comments for this lookalike domain"""
        domain = self.get_object()
        
        if request.method == "GET":
            comments = domain.comments.all()
            serializer = LookalikeDomainCommentSerializer(comments, many=True)
            return Response(serializer.data)
        
        elif request.method == "POST":
            serializer = LookalikeDomainCommentSerializer(data=request.data)
            if serializer.is_valid():
                comment = serializer.save(user=request.user, lookalike_domain=domain)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == "PATCH":
            # Update a specific comment
            comment_id = request.data.get("comment_id")
            if not comment_id:
                return Response({"error": "comment_id required"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                comment = domain.comments.get(id=comment_id)
                serializer = LookalikeDomainCommentSerializer(comment, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            except LookalikeDomainComment.DoesNotExist:
                return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == "DELETE":
            # Delete a specific comment
            comment_id = request.data.get("comment_id")
            if not comment_id:
                return Response({"error": "comment_id required"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                comment = domain.comments.get(id=comment_id)
                comment.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            except LookalikeDomainComment.DoesNotExist:
                return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["post"], url_path="import-csv")
    def import_csv(self, request):
        """
        Import lookalike domains from CSV file.
        
        Expected CSV columns:
        - value (required): Domain value
        - source (required): Source of the lookalike
        - watched_resource (required): Watched resource value
        - source_date (required): Date in YYYY-MM-DD format
        - company (required): Company name
        - potential_risk (optional): unknown/low/medium/high/critical (default: unknown)
        - status (optional): open/closed/takedown/legal/not_relevant (default: open)
        
        Returns:
        - created: Number of successfully created domains
        - failed: Number of failed rows
        - errors: List of errors with row numbers
        """
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response(
                {"error": "No CSV file provided. Use 'file' key for upload."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not csv_file.name.endswith('.csv'):
            return Response(
                {"error": "File must be a CSV file."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decode the file
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            created = []
            errors = []
            
            for row_num, row in enumerate(reader, start=2):  # start=2 because row 1 is header
                try:
                    # Validate required fields
                    required_fields = ['value', 'source', 'watched_resource', 'source_date', 'company']
                    missing_fields = [field for field in required_fields if not row.get(field, '').strip()]
                    
                    if missing_fields:
                        errors.append({
                            "row": row_num,
                            "error": f"Missing required fields: {', '.join(missing_fields)}"
                        })
                        continue
                    
                    # Build payload
                    payload = {
                        'value': row['value'].strip(),
                        'source': row['source'].strip(),
                        'watched_resource': row['watched_resource'].strip(),
                        'source_date': row['source_date'].strip(),
                        'company': row['company'].strip(),
                        'potential_risk': row.get('potential_risk', 'unknown').strip() or 'unknown',
                        'status': row.get('status', 'open').strip() or 'open',
                    }
                    
                    # Create lookalike domain
                    serializer = self.get_serializer(data=payload)
                    serializer.is_valid(raise_exception=True)
                    self.perform_create(serializer)
                    created.append(serializer.data)
                    
                except Exception as e:
                    logger.warning(f"Failed to import row {row_num}: {e}")
                    errors.append({
                        "row": row_num,
                        "error": str(e),
                        "data": row
                    })
            
            logger.info(f"CSV import: {len(created)} created, {len(errors)} failed")
            
            response_status = (
                status.HTTP_201_CREATED if created and not errors 
                else status.HTTP_207_MULTI_STATUS if created 
                else status.HTTP_400_BAD_REQUEST
            )
            
            return Response(
                {
                    "created": len(created),
                    "failed": len(errors),
                    "errors": errors if errors else []
                },
                status=response_status
            )
            
        except Exception as e:
            logger.error(f"CSV import error: {e}", exc_info=True)
            return Response(
                {"error": f"Failed to process CSV file: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
