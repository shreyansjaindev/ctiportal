import django_filters
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
            "created": ["lte", "gte", "icontains"],
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
            "created": ["lte", "gte", "icontains"],
            "value": ["icontains"],
            "company": ["exact"],
            "status": ["exact"],
        }


class WatchedResourceFilter(django_filters.FilterSet):
    company = django_filters.ModelChoiceFilter(
        queryset=Company.objects.all(), to_field_name="name", field_name="company__name"
    )

    class Meta:
        model = WatchedResource
        fields = {
            "created": ["lte", "gte", "icontains"],
            "value": ["icontains"],
            "resource_type": ["exact"],
            "company": ["exact"],
            "status": ["exact"],
        }


class MonitoredDomainAlertFilter(django_filters.FilterSet):
    company = django_filters.ModelChoiceFilter(
        queryset=Company.objects.all(), to_field_name="name", field_name="company__name"
    )

    class Meta:
        model = MonitoredDomainAlert
        fields = {
            "created": ["lte", "gte", "icontains"],
            "domain_name": ["exact", "icontains"],
            "spf_record": ["icontains"],
            "website_url": ["icontains"],
            "website_status_code": ["exact"],
            "company": ["exact"],
            "status": ["exact"],
        }


class LookalikeDomainFilter(django_filters.FilterSet):
    company = django_filters.ModelChoiceFilter(
        queryset=Company.objects.all(), to_field_name="name", field_name="company__name"
    )

    class Meta:
        model = LookalikeDomain
        fields = {
            "source_date": ["lte", "gte", "icontains"],
            "value": ["exact", "icontains"],
            "watched_resource": ["exact", "icontains"],
            "source": ["icontains"],
            "potential_risk": ["exact"],
            "company": ["exact"],
            "status": ["exact"],
        }


class MonitoredDomainFilter(django_filters.FilterSet):
    company = django_filters.ModelChoiceFilter(
        queryset=Company.objects.all(), to_field_name="name", field_name="company__name"
    )

    class Meta:
        model = MonitoredDomain
        fields = {
            "created": ["lte", "gte", "icontains"],
            "value": ["icontains"],
            "status": ["exact"],
            "last_checked": ["lt", "gt", "icontains"],
            "company": ["exact"],
        }


class SSLCertificateFilter(django_filters.FilterSet):
    class Meta:
        model = SSLCertificate
        fields = {
            "created": ["lte", "gte", "icontains"],
            "cert_index": ["exact"],
            "cert_domain": ["icontains"],
            "watched_domain": ["exact"],
        }


class NewlyRegisteredDomainFilter(django_filters.FilterSet):
    class Meta:
        model = NewlyRegisteredDomain
        fields = {
            "created": ["lte", "gte", "icontains"],
            "value": ["icontains"],
        }
