"""
External provider integration ViewSets (Trellix ETP, Proofpoint).
"""
import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from scripts.providers.proofpoint import (
    proofpoint_add_domains,
    proofpoint_generate_access_token,
)
from scripts.providers.trellix import process_yara_rules

from ..serializers import DomainsSerializer

logger = logging.getLogger(__name__)


class TrellixETPIntegrationViewSet(viewsets.ViewSet):
    """
    Integrate domain protection with Trellix ETP via YARA rules.
    
    Actions:
    - POST /add-domains - Add domains to YARA rule
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="add-domains")
    def add_domains(self, request):
        """Add domains to Trellix ETP YARA rule"""
        try:
            serializer = DomainsSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"error": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            domains = serializer.validated_data["domains"]
            logger.info(f"Adding {len(domains)} domains to Trellix ETP")
            
            response = process_yara_rules(domains)
            
            if response.status_code == 202:
                logger.info("Domains successfully added to Trellix ETP YARA rule")
                return Response(
                    {"domains_count": len(domains), "status": "queued"},
                    status=status.HTTP_202_ACCEPTED,
                )
            else:
                logger.error(f"Failed to add domains to Trellix: {response.status_code}")
                return Response(
                    {"error": "Failed to add domains to Trellix ETP's YARA rule"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except ValueError as e:
            logger.error(f"Invalid input for Trellix integration: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in Trellix integration: {e}", exc_info=True)
            return Response(
                {"error": "Failed to process Trellix request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ProofpointIntegrationViewSet(viewsets.ViewSet):
    """
    Integrate domain protection with Proofpoint email security.
    
    Actions:
    - POST /add-domains - Add domains to blocklist
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="add-domains")
    def add_domains(self, request):
        """Add domains to Proofpoint blocklist"""
        try:
            serializer = DomainsSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"error": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            domains = serializer.validated_data["domains"]
            logger.info(f"Adding {len(domains)} domains to Proofpoint")
            
            try:
                access_token = proofpoint_generate_access_token()
                results = proofpoint_add_domains(domains, access_token=access_token)
                logger.info("Domains successfully added to Proofpoint")
                return Response(results, status=status.HTTP_200_OK)
            except ValueError as e:
                logger.error(f"Proofpoint API error: {e}")
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            logger.error(f"Invalid input for Proofpoint: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in Proofpoint integration: {e}", exc_info=True)
            return Response(
                {"error": "Failed to process Proofpoint request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
