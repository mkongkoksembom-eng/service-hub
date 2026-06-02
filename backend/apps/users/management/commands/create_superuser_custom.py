from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create a superuser with admin role for the Service Hub platform"

    def add_arguments(self, parser):
        parser.add_argument("--email", default="admin@servicehub.com")
        parser.add_argument("--username", default="admin")
        parser.add_argument("--password", default="Admin1234!")

    def handle(self, *args, **options):
        email = options["email"]
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f"Superuser '{email}' already exists."))
            return

        User.objects.create_superuser(
            email=email,
            username=options["username"],
            password=options["password"],
            role=User.Role.ADMIN,
        )
        self.stdout.write(self.style.SUCCESS(
            f"Superuser created: {email} / {options['password']}"
        ))
