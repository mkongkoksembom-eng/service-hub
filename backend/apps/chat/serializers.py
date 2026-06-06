from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_id       = serializers.IntegerField(source="sender.id", read_only=True)
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    is_mine         = serializers.SerializerMethodField()
    file_url        = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = (
            "id", "msg_type",
            "sender_id", "sender_username", "is_mine",
            "content",
            "file_url", "file_name", "file_size",
            "timestamp", "is_read",
        )

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return bool(request and obj.sender_id == request.user.id)

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url
