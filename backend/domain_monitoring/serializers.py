from rest_framework import serializers
from .models import (
    Company,
    CompanyDomain,
    WatchedResource,
    MonitoredDomain,
    MonitoredDomainAlert,
    MonitoredDomainScreenshotPattern,
    NewlyRegisteredDomain,
    LookalikeDomain,
    SSLCertificate,
    MonitoredDomainAlertComment,
    LookalikeDomainComment,
)


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = "__all__"


class CompanyDomainSerializer(serializers.ModelSerializer):
    company = serializers.SlugRelatedField(slug_field="name", queryset=Company.objects.all())

    class Meta:
        model = CompanyDomain
        fields = "__all__"


class WatchedResourceSerializer(serializers.ModelSerializer):
    company = serializers.SlugRelatedField(slug_field="name", queryset=Company.objects.all())

    class Meta:
        model = WatchedResource
        fields = "__all__"


class MonitoredDomainSerializer(serializers.ModelSerializer):
    company = serializers.SlugRelatedField(slug_field="name", queryset=Company.objects.all())

    class Meta:
        model = MonitoredDomain
        fields = "__all__"


class MonitoredDomainAlertCommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = MonitoredDomainAlertComment
        fields = "__all__"


class MonitoredDomainAlertSerializer(serializers.ModelSerializer):
    company = serializers.SlugRelatedField(slug_field="name", queryset=Company.objects.all())
    comments = MonitoredDomainAlertCommentSerializer(many=True, read_only=True)

    class Meta:
        model = MonitoredDomainAlert
        fields = "__all__"


class MonitoredDomainScreenshotPatternSerializer(serializers.ModelSerializer):
    monitored_domain = serializers.PrimaryKeyRelatedField(queryset=MonitoredDomain.objects.all())
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = MonitoredDomainScreenshotPattern
        fields = "__all__"


class SponsoredListingPatternCreateSerializer(serializers.Serializer):
    pattern_type = serializers.ChoiceField(
        choices=MonitoredDomainScreenshotPattern._meta.get_field("pattern_type").choices,
        default="sponsored_listing",
        required=False,
    )


class NewlyRegisteredDomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewlyRegisteredDomain
        fields = "__all__"


class LookalikeDomainCommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = LookalikeDomainComment
        fields = "__all__"


class LookalikeDomainSerializer(serializers.ModelSerializer):
    company = serializers.SlugRelatedField(slug_field="name", queryset=Company.objects.all())
    comments = LookalikeDomainCommentSerializer(many=True, read_only=True)
    is_monitored = serializers.ReadOnlyField()

    class Meta:
        model = LookalikeDomain
        fields = "__all__"


class SSLCertificateSerializer(serializers.ModelSerializer):
    company = serializers.SlugRelatedField(slug_field="name", queryset=Company.objects.all())

    class Meta:
        model = SSLCertificate
        fields = "__all__"


class DomainsSerializer(serializers.Serializer):
    domains = serializers.ListField(child=serializers.CharField(max_length=255))


class AnomaliThreatstreamDomainsSerializer(serializers.Serializer):
    domains = serializers.ListField(child=serializers.CharField(max_length=255))
    tags = serializers.ListField(child=serializers.CharField(max_length=255), required=False)
