from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view
import json

from scripts.constants import (
    SOURCES,
    ADDITIONAL_SOURCES,
    DOMAIN_MONITORING_TABS,
    SUMMARY_HEADERS,
    SECURITY_HEADERS,
)
from scripts.textformatter import collector as text_formatter
from scripts.fullpage_screenshot import bulk_screenshot
from scripts.mha import mha as mha_analyzer
from scripts.ad_users import get_aduser
from scripts.threatstream import (
    threatstream_export,
    threatstream_export_feeds,
)


def login_user(request):
    return render(request, "frontend/auth-login.html", {})


@api_view(["POST"])
def api_login(request):
    username = request.data.get("user")
    password = request.data.get("password")
    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        return Response({"status": "success"})
    else:
        return Response({"status": "invalid credentials"})


@api_view(["POST"])
def logout_user(request):
    logout(request)
    response = Response({"success": True, "message": "Logged out"})
    return response


@login_required
def githubmonitoring(request):
    context = {}
    # if request.POST:
    #     request_type = request.POST.get("type")
    #     if request_type == 'query-keywords':
    #         context = github_keywords(request_type)
    #     elif request_type == 'scrape-keywords':
    #         context = github_keywords(request_type)
    #     else:
    #         filters = json.loads(request.POST.get("filters"))
    #         timeframe = json.loads(request.POST.get("timeframe"))
    #         context = github_query(filters, timeframe)
    #     return JsonResponse(context)
    # else:
    return render(request, "frontend/githubmonitoring.html", context)


@login_required
def threatstream(request):
    context = {}
    if request.method == "POST":
        if "file" in request.FILES:
            input_data = request.FILES["file"].read().decode("utf-8").rstrip()
            context = threatstream_export_feeds(input_data)
            return JsonResponse(context)
        else:
            request_data = json.loads(request.body.decode("utf-8").strip())
            filters = request_data.get("filters")
            context = threatstream_export(filters)
            return JsonResponse(context)
    else:
        return render(request, "frontend/threatstream.html", context)


@login_required
def nrd(request):
    context = {}
    # if request.method == 'POST':
    #     filters = json.loads(request.POST.get("filters"))
    #     timeframe = json.loads(request.POST.get("timeframe"))
    #     context = nrd_query(filters, timeframe)
    #     return JsonResponse(context)
    # else:
    return render(request, "frontend/nrd.html", context)


@login_required
def domainmonitoring(request):
    return render(
        request, "frontend/domainmonitoring.html", {"tabs": DOMAIN_MONITORING_TABS}
    )


@login_required
def intelligenceharvester(request):
    context = {
        "sources": SOURCES,
        "additional_sources": ADDITIONAL_SOURCES,
    }

    return render(request, "frontend/intelligenceharvester.html", context)


@login_required
def home(request):
    return render(request, "frontend/home.html", {})


@login_required
def urldecoder(request):
    return render(request, "frontend/urldecoder.html", {})


@login_required
def textformatter(request):
    context = {}

    # Search Query
    if request.method == "POST":
        request_data = json.loads(request.body.decode("utf-8").strip())
        checklist = request_data.get("checklist")
        query = request_data.get("query")
        context = {
            "data": text_formatter(query, checklist),
            "checklist": checklist,
        }
        return JsonResponse(context)
    return render(request, "frontend/textformatter.html", context)


@login_required
def mha(request):
    context = {}

    # Email Header
    if request.method == "POST":
        header = request.POST.get("header").strip()

        context = {
            "mha": mha_analyzer(header),
            "summary_headers": SUMMARY_HEADERS,
            "security_headers": SECURITY_HEADERS,
        }
    return render(request, "frontend/mha.html", context)


@login_required
def fullpage_screenshot(request):
    context = {}
    query_list = []
    if request.method == "POST":
        request_data = json.loads(request.body.decode("utf-8").strip())
        query_list = request_data.get("query").rstrip().split("\n")
        context = {"data": bulk_screenshot(query_list)}
        return JsonResponse(context)
    return render(request, "frontend/screenshot.html", context)


@login_required
def activedirectory(request):
    context = {}
    if request.method == "POST":
        query = request.POST.get("query").strip()
        context = {
            "data": get_aduser(query),
        }
        return JsonResponse(context)
    return render(request, "frontend/activedirectory.html", context)
