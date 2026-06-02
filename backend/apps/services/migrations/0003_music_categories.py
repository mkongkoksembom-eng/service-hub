from django.db import migrations


MUSIC_SUBS = [
    "Drummer", "Pianist", "Singer", "Saxophonist", "Guitarist",
    "Bassist", "Maestro", "Trumpetist", "Violinist", "Composer", "Producer",
]

MUSIC_TEACHER_SUBS = [
    "Piano Teacher", "Guitar Teacher", "Violin Teacher",
    "Drum Teacher", "Vocal Coach", "Saxophone Teacher",
    "Music Theory Teacher", "Music Production Coach",
    "Bass Teacher", "Trumpet Teacher",
]


def forward(apps, schema_editor):
    Category = apps.get_model("services", "Category")

    # Remove the old "Music Teacher" subcategory (has a parent).
    # on_delete=SET_NULL means any services linked to it become uncategorised.
    Category.objects.filter(name="Music Teacher", parent__isnull=False).delete()

    # Create "Music" parent + subcategories
    music, _ = Category.objects.get_or_create(name="Music", defaults={"parent": None})
    if music.parent is not None:
        music.parent = None
        music.save()
    for name in MUSIC_SUBS:
        Category.objects.get_or_create(name=name, defaults={"parent": music})

    # Create "Music Teacher" parent + subcategories
    teacher, _ = Category.objects.get_or_create(name="Music Teacher", defaults={"parent": None})
    if teacher.parent is not None:
        teacher.parent = None
        teacher.save()
    for name in MUSIC_TEACHER_SUBS:
        Category.objects.get_or_create(name=name, defaults={"parent": teacher})


def backward(apps, schema_editor):
    Category = apps.get_model("services", "Category")

    Category.objects.filter(name__in=MUSIC_SUBS + MUSIC_TEACHER_SUBS).delete()
    Category.objects.filter(name__in=["Music", "Music Teacher"], parent__isnull=True).delete()

    try:
        edu = Category.objects.get(name="Education & Training Services")
        Category.objects.get_or_create(name="Music Teacher", defaults={"parent": edu})
    except Category.DoesNotExist:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0002_category_parent_alter_category_name"),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]
