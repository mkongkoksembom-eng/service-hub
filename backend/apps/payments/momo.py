import base64
import uuid
import requests
from django.conf import settings


SANDBOX_BASE = "https://sandbox.momodeveloper.mtn.com"
LIVE_BASE = "https://momodeveloper.mtn.com"


def _base_url():
    if getattr(settings, "MOMO_ENVIRONMENT", "sandbox") == "production":
        return LIVE_BASE
    return SANDBOX_BASE


def _environment():
    return getattr(settings, "MOMO_ENVIRONMENT", "sandbox")


def _subscription_key():
    return settings.MOMO_SUBSCRIPTION_KEY


def get_access_token():
    """Obtain a Bearer token using API User + API Key via Basic Auth."""
    api_user = settings.MOMO_API_USER
    api_key = settings.MOMO_API_KEY
    credentials = base64.b64encode(f"{api_user}:{api_key}".encode()).decode()

    response = requests.post(
        f"{_base_url()}/collection/token/",
        headers={
            "Authorization": f"Basic {credentials}",
            "Ocp-Apim-Subscription-Key": _subscription_key(),
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def request_to_pay(amount, currency, phone_number, payer_message, payee_note):
    """
    Send a USSD push payment request to the client's phone.
    Returns the X-Reference-Id (UUID) used to track the transaction.
    """
    token = get_access_token()
    reference_id = str(uuid.uuid4())

    # Sandbox: bare local number (e.g. 650000001)
    # Production: full MSISDN with country code (e.g. 237650000001)
    phone = phone_number.strip().lstrip("+").lstrip("00")
    if _environment() == "sandbox":
        if phone.startswith("237"):
            phone = phone[3:]
    else:
        if not phone.startswith("237"):
            phone = "237" + phone

    payload = {
        "amount": str(int(float(amount))),
        "currency": currency,
        "externalId": reference_id,
        "payer": {
            "partyIdType": "MSISDN",
            "partyId": phone,
        },
        "payerMessage": payer_message[:160],
        "payeeNote": payee_note[:160],
    }

    response = requests.post(
        f"{_base_url()}/collection/v1_0/requesttopay",
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Reference-Id": reference_id,
            "X-Target-Environment": _environment(),
            "Ocp-Apim-Subscription-Key": _subscription_key(),
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    response.raise_for_status()
    return reference_id


def check_payment_status(reference_id):
    """
    Poll the status of a payment request.
    Returns one of: PENDING, SUCCESSFUL, FAILED
    """
    token = get_access_token()

    response = requests.get(
        f"{_base_url()}/collection/v1_0/requesttopay/{reference_id}",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Target-Environment": _environment(),
            "Ocp-Apim-Subscription-Key": _subscription_key(),
        },
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    return data.get("status", "PENDING"), data
