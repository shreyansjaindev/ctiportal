from django.shortcuts import render
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.mixins import LoginRequiredMixin
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework import serializers

from scripts.constants import (
    SOURCES,
    ADDITIONAL_SOURCES,
    DOMAIN_MONITORING_TABS,
    SUMMARY_HEADERS,
    SECURITY_HEADERS,
)
from scripts.textformatter import collector as text_formatter
from scripts.screenshotmachine import bulk_screenshot
from scripts.mha import mha as mha_analyzer
from scripts.ad_users import get_aduser
from scripts.threatstream import (
    threatstream_export,
    threatstream_export_feeds,
)


def login_user(request):
    return render(request, "frontend/auth-login.html", {})


class AuthSerializer(serializers.Serializer):
    user = serializers.CharField()
    password = serializers.CharField()


class LoginView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = AuthSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(
                request,
                username=serializer.validated_data["user"],
                password=serializer.validated_data["password"],
            )
            if user is not None:
                login(request, user)
                return Response(
                    {"message": "Login successful"}, status=status.HTTP_200_OK
                )
            return Response(
                {"message": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            logout(request)
            return Response(
                {"message": "Logged out successfully"}, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": "Logout failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"username": request.user.username})


class ThreatstreamView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]

    def get(self, request, *args, **kwargs):
        return render(request, "frontend/threatstream.html", {})

    def post(self, request, *args, **kwargs):
        if "file" in request.data:
            input_data = request.data["file"].read().decode("utf-8").rstrip()
            context = threatstream_export_feeds(input_data)
        else:
            filters = request.data.get("filters")
            context = threatstream_export(filters)
        return Response(context)


class TextFormatterView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return render(request, "frontend/textformatter.html", {})

    def post(self, request, *args, **kwargs):
        checklist = request.data.get("checklist")
        query = request.data.get("query")
        context = {
            "data": text_formatter(query, checklist),
            "checklist": checklist,
        }
        return Response(context)


class MailHeaderAnalyzerView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return render(request, "frontend/mha.html", {})

    def post(self, request):
        header = request.data.get("header").strip()

        context = {
            "mha": mha_analyzer(header),
            "summary_headers": SUMMARY_HEADERS,
            "security_headers": SECURITY_HEADERS,
        }
        return Response(context)


class FullpageScreenshotView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return render(request, "frontend/screenshot.html", {})

    def post(self, request, *args, **kwargs):
        query_list = request.data.get("query").rstrip().split("\n")
        data = bulk_screenshot(query_list)
        return Response({"data": data})


class ActiveDirectoryView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return render(request, "frontend/activedirectory.html", {})

    def post(self, request, *args, **kwargs):
        query = request.data.get("query").strip()
        data = get_aduser(query)
        return Response({"data": data})


class NewlyRegisteredDomainView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return render(request, "frontend/nrd.html", {})


class DomainMonitoringView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return render(
            request, "frontend/domainmonitoring.html", {"tabs": DOMAIN_MONITORING_TABS}
        )


class IntelligenceHarvesterView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        context = {
            "sources": SOURCES,
            "additional_sources": ADDITIONAL_SOURCES,
        }
        return render(request, "frontend/intelligenceharvester.html", context)


class HomeView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return render(request, "frontend/home.html", {})


class URLDecoderView(LoginRequiredMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return render(request, "frontend/urldecoder.html", {})
