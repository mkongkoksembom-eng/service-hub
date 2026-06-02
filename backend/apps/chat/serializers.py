from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ("id", "sender", "sender_username", "is_mine", "content", "timestamp", "is_read")
        read_only_fields = ("id", "sender", "sender_username", "is_mine", "timestamp", "is_read")

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return request and obj.sender_id == request.user.id
