from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from django.conf import settings
from apps.users.permissions import IsClient, IsProvider

from .models import FeaturedPayment, Payment
from .momo import request_to_pay, check_payment_status
from .serializers import (
    FeaturedPaymentSerializer,
    PaymentCreateSerializer,
    PaymentSerializer,
    RefundSerializer,
)


def _notify(recipient, notification_type, title, message):
    Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
    )


class PaymentCreateView(generics.CreateAPIView):
    """Client initiates a payment record for a confirmed/completed booking."""
    serializer_class = PaymentCreateSerializer
    permission_classes = (IsClient,)


class PaymentDetailView(generics.RetrieveAPIView):
    """Client or provider retrieves payment details."""
    serializer_class = PaymentSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        return (
            Payment.objects.filter(client=user)
            | Payment.objects.filter(booking__service__provider__user=user)
        )


class ClientPaymentListView(generics.ListAPIView):
    """Client sees all their payments."""
    serializer_class = PaymentSerializer
    permission_classes = (IsClient,)
    filterset_fields = ("status", "method")

    def get_queryset(self):
        return Payment.objects.filter(client=self.request.user).select_related("booking")


class ProviderPaymentListView(generics.ListAPIView):
    """Provider sees payments for their bookings."""
    serializer_class = PaymentSerializer
    permission_classes = (IsProvider,)
    filterset_fields = ("status",)

    def get_queryset(self):
        return Payment.objects.filter(
            booking__service__provider__user=self.request.user
        ).select_related("booking", "client")


class MoMoRequestPayView(APIView):
    """
    Step 1 — Send a USSD push payment request to the client's MTN MoMo number.
    Creates/updates the payment record and stores the MoMo reference.
    """
    permission_classes = (IsClient,)

    def post(self, request, pk):
        try:
            payment = Payment.objects.get(pk=pk, client=request.user)
        except Payment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == Payment.Status.PAID:
            return Response({"detail": "This payment is already confirmed."}, status=status.HTTP_400_BAD_REQUEST)

        phone_number = request.data.get("phone_number", "").strip()
        if not phone_number:
            return Response({"detail": "phone_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reference_id = request_to_pay(
                amount=payment.amount,
                currency="XAF",
                phone_number=phone_number,
                payer_message=f"Payment for {payment.booking.service.title}",
                payee_note=f"Service Hub booking #{payment.booking.id}",
            )
        except Exception as e:
            return Response(
                {"detail": f"MTN MoMo request failed: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment.momo_reference = reference_id
        payment.phone_number = phone_number
        payment.method = Payment.Method.MOBILE_MONEY
        payment.save(update_fields=["momo_reference", "phone_number", "method", "updated_at"])

        return Response({
            "momo_reference": reference_id,
            "message": "Payment request sent. Please approve the prompt on your phone.",
            "payment": PaymentSerializer(payment).data,
        })


class MoMoStatusView(APIView):
    """
    Step 2 — Poll MTN MoMo API to check payment status.
    Frontend polls this every few seconds until SUCCESSFUL or FAILED.
    """
    permission_classes = (IsClient,)

    def get(self, request, pk):
        try:
            payment = Payment.objects.get(pk=pk, client=request.user)
        except Payment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == Payment.Status.PAID:
            return Response({"status": "SUCCESSFUL", "payment": PaymentSerializer(payment).data})

        if not payment.momo_reference:
            return Response({"detail": "No MoMo request initiated yet."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            momo_status, raw = check_payment_status(payment.momo_reference)
        except Exception as e:
            return Response(
                {"detail": f"Status check failed: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if momo_status == "SUCCESSFUL" and payment.status != Payment.Status.PAID:
            payment.mark_paid()
            provider = payment.booking.service.provider.user
            _notify(
                recipient=provider,
                notification_type=Notification.Type.PAYMENT_RECEIVED,
                title="Payment Received",
                message=(
                    f"{request.user.username} paid {payment.amount} FCFA for "
                    f"'{payment.booking.service.title}' via MTN MoMo."
                ),
            )

        elif momo_status == "FAILED":
            payment.status = Payment.Status.FAILED
            payment.save(update_fields=["status", "updated_at"])

        return Response({
            "status": momo_status,
            "payment": PaymentSerializer(payment).data,
        })


class FeaturedPaymentCreateView(APIView):
    """Provider initiates a featured listing payment for one of their services."""
    permission_classes = (IsProvider,)

    def post(self, request):
        from apps.services.models import Service
        service_id = request.data.get("service_id")
        try:
            service = Service.objects.get(pk=service_id, provider__user=request.user)
        except Service.DoesNotExist:
            return Response({"detail": "Service not found."}, status=status.HTTP_404_NOT_FOUND)

        amount = getattr(settings, "FEATURED_LISTING_PRICE", 2000)
        fp = FeaturedPayment.objects.create(
            service=service,
            provider=request.user,
            amount=amount,
        )
        return Response(FeaturedPaymentSerializer(fp).data, status=status.HTTP_201_CREATED)


class FeaturedMoMoRequestView(APIView):
    """Send MTN MoMo payment request for a featured listing."""
    permission_classes = (IsProvider,)

    def post(self, request, pk):
        try:
            fp = FeaturedPayment.objects.get(pk=pk, provider=request.user)
        except FeaturedPayment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if fp.status == FeaturedPayment.Status.PAID:
            return Response({"detail": "Already paid."}, status=status.HTTP_400_BAD_REQUEST)

        phone_number = request.data.get("phone_number", "").strip()
        if not phone_number:
            return Response({"detail": "phone_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reference_id = request_to_pay(
                amount=fp.amount,
                currency="XAF",
                phone_number=phone_number,
                payer_message=f"Featured listing — {fp.service.title}",
                payee_note=f"Service Hub featured listing #{fp.pk}",
            )
        except Exception as e:
            return Response({"detail": f"MTN MoMo request failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

        fp.momo_reference = reference_id
        fp.phone_number = phone_number
        fp.save(update_fields=["momo_reference", "phone_number"])
        return Response({
            "momo_reference": reference_id,
            "message": "Payment request sent. Please approve on your phone.",
            "featured_payment": FeaturedPaymentSerializer(fp).data,
        })


class FeaturedMoMoStatusView(APIView):
    """Poll MoMo status for a featured listing payment."""
    permission_classes = (IsProvider,)

    def get(self, request, pk):
        try:
            fp = FeaturedPayment.objects.get(pk=pk, provider=request.user)
        except FeaturedPayment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if fp.status == FeaturedPayment.Status.PAID:
            return Response({"status": "SUCCESSFUL", "featured_payment": FeaturedPaymentSerializer(fp).data})

        if not fp.momo_reference:
            return Response({"detail": "No MoMo request initiated yet."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            momo_status, _ = check_payment_status(fp.momo_reference)
        except Exception as e:
            return Response({"detail": f"Status check failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

        if momo_status == "SUCCESSFUL" and fp.status != FeaturedPayment.Status.PAID:
            fp.activate()
        elif momo_status == "FAILED":
            fp.status = FeaturedPayment.Status.FAILED
            fp.save(update_fields=["status"])

        return Response({"status": momo_status, "featured_payment": FeaturedPaymentSerializer(fp).data})


class PaymentRefundView(APIView):
    """Admin or provider issues a refund."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        user = request.user
        is_admin = user.role == "admin" or user.is_staff
        is_provider = hasattr(user, "provider_profile")

        if not (is_admin or is_provider):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        try:
            if is_admin:
                payment = Payment.objects.get(pk=pk)
            else:
                payment = Payment.objects.get(pk=pk, booking__service__provider__user=user)
        except Payment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = RefundSerializer(data=request.data, context={"payment": payment})
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        _notify(
            recipient=payment.client,
            notification_type=Notification.Type.PAYMENT_REFUNDED,
            title="Payment Refunded",
            message=(
                f"Your payment of {payment.amount} FCFA for "
                f"'{payment.booking.service.title}' has been refunded."
            ),
        )
        return Response(PaymentSerializer(updated).data)
