from django.core.management.base import BaseCommand
from apps.services.models import Category

CATEGORIES = {
    "Construction & Building Services": [
        "Mason / Bricklayer", "Carpenter", "Plumber", "Electrician",
        "Welder", "Painter", "Tiler", "Plasterer", "Roofer",
        "Steel Fixer", "Concrete Worker", "Construction Laborer",
        "Civil Works Technician",
    ],
    "Home & Property Services": [
        "House Cleaner", "Office Cleaner", "Laundry Service Provider",
        "Ironing Service Provider", "Gardener / Landscaper",
        "Pest Control Technician", "Pool Maintenance Technician",
        "Waste Disposal Service", "Home Organizer",
    ],
    "Repair & Maintenance Services": [
        "Appliance Repair Technician", "Generator Repair Technician",
        "Air-Condition Technician", "Refrigerator Technician",
        "TV / Electronics Repairer", "Phone Repair Technician",
        "Computer Repair Technician", "Solar System Technician",
    ],
    "Automotive & Transport Services": [
        "Auto Mechanic", "Auto Electrician", "Car Wash Service Provider",
        "Tyre Repair Technician", "Vehicle Towing Service",
        "Driving Instructor", "Taxi Driver", "Ride-Hailing Driver",
        "Delivery Rider / Courier",
    ],
    "ICT & Digital Services": [
        "Software Developer", "Web Developer", "Mobile App Developer",
        "UI/UX Designer", "Graphic Designer", "IT Support Technician",
        "Network Technician", "Cybersecurity Technician",
        "Data Analyst", "Digital Marketer", "Social Media Manager",
        "Content Writer", "SEO Specialist",
    ],
    "Education & Training Services": [
        "Private Tutor", "Mathematics Teacher", "Science Teacher",
        "Language Instructor", "Computer Instructor",
        "Driving Instructor (Education)", "Exam Preparation Coach",
    ],
    "Music": [
        "Drummer", "Pianist", "Singer", "Saxophonist", "Guitarist",
        "Bassist", "Maestro", "Trumpetist", "Violinist", "Composer", "Producer",
    ],
    "Music Teacher": [
        "Piano Teacher", "Guitar Teacher", "Violin Teacher",
        "Drum Teacher", "Vocal Coach", "Saxophone Teacher",
        "Music Theory Teacher", "Music Production Coach",
        "Bass Teacher", "Trumpet Teacher",
    ],
    "Health & Wellness Services": [
        "Nurse (Home Care)", "Caregiver", "Physiotherapist",
        "Massage Therapist", "Fitness Trainer", "Yoga Instructor",
        "Nutrition Coach", "Mental Health Counselor",
    ],
    "Beauty & Personal Care Services": [
        "Barber", "Hair Stylist", "Makeup Artist", "Nail Technician",
        "Spa Therapist", "Tattoo Artist", "Fashion Stylist",
    ],
    "Event & Creative Services": [
        "Event Planner", "MC / Host", "DJ", "Sound Technician",
        "Photographer", "Videographer", "Video Editor",
        "Decorator", "Caterer",
    ],
    "Business & Professional Services": [
        "Accountant", "Bookkeeper", "Auditor", "Tax Consultant",
        "Business Consultant", "Legal Assistant", "Lawyer",
        "Human Resource Consultant",
    ],
    "Security & Safety Services": [
        "Security Guard", "CCTV Installer", "Alarm System Technician",
        "Fire Safety Technician", "Personal Bodyguard",
    ],
    "Logistics & Support Services": [
        "Warehouse Assistant", "Inventory Manager",
        "Packing Service Provider", "Movers / Relocation Service",
        "Truck Loader",
    ],
    "Agriculture & Environmental Services": [
        "Farm Laborer", "Agricultural Technician", "Irrigation Technician",
        "Livestock Caretaker", "Poultry Farm Worker", "Fish Pond Technician",
    ],
    "Miscellaneous Services": [
        "Errand Runner", "Personal Assistant", "Translator",
        "Interpreter", "Tour Guide",
    ],
}


class Command(BaseCommand):
    help = "Seed all marketplace categories and subcategories"

    def handle(self, *args, **options):
        created_parents = 0
        created_children = 0
        skipped = 0

        for parent_name, children in CATEGORIES.items():
            parent, created = Category.objects.get_or_create(
                name=parent_name,
                defaults={"parent": None},
            )
            if created:
                created_parents += 1
                self.stdout.write(f"  + {parent_name}")
            else:
                skipped += 1

            for child_name in children:
                _, child_created = Category.objects.get_or_create(
                    name=child_name,
                    defaults={"parent": parent},
                )
                if child_created:
                    created_children += 1
                else:
                    skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {created_parents} parent categories, "
            f"{created_children} subcategories created. "
            f"{skipped} already existed."
        ))
