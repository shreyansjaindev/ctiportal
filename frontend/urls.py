from django.urls import path
from . import views

urlpatterns = [
    path("", views.HomeView.as_view(), name="frontend-home"),
    path("login/", views.login_user, name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("api-login/", views.LoginView.as_view(), name="api-login"),
    path(
        "intelligenceharvester/",
        views.IntelligenceHarvesterView.as_view(),
        name="frontend-intelligenceharvester",
    ),
    path("urldecoder/", views.URLDecoderView.as_view(), name="frontend-urldecoder"),
    path("screenshot/", views.FullpageScreenshotView.as_view(), name="frontend-screenshot"),
    path("textformatter/", views.TextFormatterView.as_view(), name="frontend-textformatter"),
    path("mha/", views.MailHeaderAnalyzerView.as_view(), name="frontend-mha"),
    path("nrd/", views.NewlyRegisteredDomainView.as_view(), name="frontend-nrd"),
    path(
        "domainmonitoring/", views.DomainMonitoringView.as_view(), name="frontend-domainmonitoring"
    ),
    path("threatstream/", views.ThreatstreamView.as_view(), name="frontend-threatstream"),
    path("activedirectory/", views.ActiveDirectoryView.as_view(), name="frontend-activedirectory"),
]
