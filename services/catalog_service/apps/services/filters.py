import django_filters
from .models import Service


class ServiceFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    category = django_filters.NumberFilter(field_name="category__id")
    location = django_filters.CharFilter(field_name="location", lookup_expr="icontains")
    price_type = django_filters.ChoiceFilter(choices=Service.PriceType.choices)
    is_active = django_filters.BooleanFilter()
    provider = django_filters.NumberFilter(field_name="provider__id")

    class Meta:
        model = Service
        fields = ["min_price", "max_price", "category", "location", "price_type", "is_active", "provider"]
