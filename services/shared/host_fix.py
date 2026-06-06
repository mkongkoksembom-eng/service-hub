class NormalizeDockerHostMiddleware:
    """Docker Compose service names contain underscores (e.g. catalog_service),
    which Django's Host-header validator rejects per RFC 1034/1035 regardless
    of ALLOWED_HOSTS — split_domain_port() returns an empty domain for any
    host containing '_', so DisallowedHost is raised before ALLOWED_HOSTS is
    even consulted. Internal service-to-service calls use these names as the
    Host header (requests sets it from the URL), so every internal HTTP call
    was failing with 400 Bad Request. Rewriting '_' to '-' here produces a
    host that passes validation; ALLOWED_HOSTS = "*" then allows it through.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.META.get("HTTP_HOST")
        if host and "_" in host:
            request.META["HTTP_HOST"] = host.replace("_", "-")
        return self.get_response(request)
