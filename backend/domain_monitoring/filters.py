import django_filters
from django_filters import MultipleChoiceFilter
from .choices import LookalikeStatus, RiskLevel, ResourceType, ActiveStatus
from .models import (
    Company,
    CompanyDomain,
    WatchedResource,
    MonitoredDomain,
    MonitoredDomainAlert,
    NewlyRegisteredDomain,
    LookalikeDomain,
    SSLCertificate,
)


class CompanyFilter(django_filters.FilterSet):
    class Meta:
        model = Company
        fields = {
            "created": ["lte", "gte"],
            "name": ["icontains"],
            "status": ["exact"],
        }


class CompanyDomainFilter(django_filters.FilterSet):
    company = django_filters.ModelChoiceFilter(
        queryset=Company.objects.all(), to_field_name="name", field_name="company__name"
    )

    class Meta:
        model = CompanyDomain
        fields = {
            "created": ["lte", "gte"],
            "value": ["icontains"],
            "status": ["exact"],
        }


class WatchedResourceFilter(django_filters.FilterSet):
    company = django_filters.ModelChoiceFilter(
        queryset=Company.objects.all(), to_field_name="name", field_name="company__name"
    )
    resource_type = MultipleChoiceFilter(
        choices=[(v, v) for v in ResourceType.values]
    )
    status = MultipleChoiceFilter(
        choices=[(v, v) for v in ActiveStatus.values]
    )

    class Meta:
        model = WatchedResource
        fields = {
            "created": ["lte", "gte"],
            "value": ["icontains"],
        }


class MonitoredDomainAlertFilter(django_filters.FilterSet):
    company = django_filters.ModelChoiceFilter(
        queryset=Company.objects.all(), to_field_name="name", field_name="company__name"
    )

    class Meta:
        model = MonitoredDomainAlert
        fields = {
            "created": ["lte", "gte"],
            "domain_name": ["exact", "icontains"],
            "spf_record": ["icontains"],
            "website_url": ["icontains"],
            "website_status_code": ["exact"],
            "status": ["exact"],
        }


class LookalikeDomainFilter(django_filters.FilterSet):
    company = django_filters.ModelChoiceFilter(
        queryset=Company.objects.all(), to_field_name="name", field_name="company__name"
    )
    potential_risk = MultipleChoiceFilter(
        choices=[(v, v) for v in RiskLevel.values]
    )
    status = MultipleChoiceFilter(
        choices=[(v, v) for v in LookalikeStatus.values]
    )

    class Meta:
        model = LookalikeDomain
        fields = {
            "created": ["lte", "gte"],
            "source_date": ["lte", "gte"],
            "value": ["exact", "icontains"],
            "watched_resource": ["exact", "icontains"],
            "source": ["icontains"],
        }


class MonitoredDomainFilter(django_filters.FilterSet):
    company = django_filters.ModelChoiceFilter(
        queryset=Company.objects.all(), to_field_name="name", field_name="company__name"
    )

    class Meta:
        model = MonitoredDomain
        fields = {
            "created": ["lte", "gte"],
            "value": ["icontains"],
            "status": ["exact"],
            "last_checked": ["lt", "gt"],
        }


class SSLCertificateFilter(django_filters.FilterSet):
    class Meta:
        model = SSLCertificate
        fields = {
            "created": ["lte", "gte"],
            "cert_index": ["exact"],
            "cert_domain": ["icontains"],
            "watched_domain": ["exact"],
        }


class NewlyRegisteredDomainFilter(django_filters.FilterSet):
    class Meta:
        model = NewlyRegisteredDomain
        fields = {
            "created": ["lte", "gte"],
            "source_date": ["lte", "gte"],
            "value": ["icontains"],
        }
