from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="frontend-home"),
    path("urldecoder/", views.urldecoder, name="frontend-urldecoder"),
    path(
        "screenshot/",
        views.fullpage_screenshot,
        name="frontend-screenshot",
    ),
    path(
        "textformatter/",
        views.textformatter,
        name="frontend-textformatter",
    ),
    path("mha/", views.mha, name="frontend-mha"),
    path(
        "intelligenceharvester/",
        views.intelligenceharvester,
        name="frontend-intelligenceharvester",
    ),
    path("login/", views.login_user, name="login"),
    path("logout/", views.logout_user, name="logout"),
    path("api_login/", views.api_login, name="api_login"),
    path("nrd/", views.nrd, name="frontend-nrd"),
    path(
        "domainmonitoring/",
        views.domainmonitoring,
        name="frontend-domainmonitoring",
    ),
    path("threatstream/", views.threatstream, name="frontend-threatstream"),
    path(
        "githubmonitoring/",
        views.githubmonitoring,
        name="frontend-githubmonitoring",
    ),
    path(
        "activedirectory/",
        views.activedirectory,
        name="frontend-activedirectory",
    ),
]
