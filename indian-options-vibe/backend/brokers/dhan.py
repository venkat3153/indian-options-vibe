import os
from typing import Any

import httpx

DHAN_BASE_URL = "https://api.dhan.co/v2"


class DhanConfigError(RuntimeError):
    pass


class DhanApiError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None, response: Any | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class DhanReadOnlyAdapter:
    """Read-only DhanHQ adapter.

    This adapter intentionally does not expose any place/modify/cancel order method.
    It is only for profile, funds, positions, order book, historical data, and market-data checks.
    """

    def __init__(self) -> None:
        self.client_id = os.getenv("DHAN_CLIENT_ID")
        self.access_token = os.getenv("DHAN_ACCESS_TOKEN")

        if not self.client_id or not self.access_token:
            raise DhanConfigError("DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN are required")

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "access-token": self.access_token or "",
            "dhanClientId": self.client_id or "",
        }

    @property
    def marketfeed_headers(self) -> dict[str, str]:
        # Dhan marketfeed endpoints use client-id header instead of dhanClientId.
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "access-token": self.access_token or "",
            "client-id": self.client_id or "",
        }

    async def _get(self, path: str) -> Any:
        url = f"{DHAN_BASE_URL}{path}"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers=self.headers)
        except httpx.HTTPError as exc:
            raise DhanApiError(f"Could not reach Dhan API: {exc}") from exc

        return self._parse_response(response)

    async def _post(self, path: str, payload: dict[str, Any], *, marketfeed: bool = False) -> Any:
        url = f"{DHAN_BASE_URL}{path}"
        headers = self.marketfeed_headers if marketfeed else self.headers
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
        except httpx.HTTPError as exc:
            raise DhanApiError(f"Could not reach Dhan API: {exc}") from exc

        return self._parse_response(response)

    def _parse_response(self, response: httpx.Response) -> Any:
        try:
            payload = response.json()
        except ValueError:
            payload = response.text

        if response.status_code >= 400:
            raise DhanApiError(
                message=f"Dhan API returned HTTP {response.status_code}",
                status_code=response.status_code,
                response=payload,
            )

        return payload

    async def profile(self) -> Any:
        return await self._get("/profile")

    async def funds(self) -> Any:
        return await self._get("/fundlimit")

    async def positions(self) -> Any:
        return await self._get("/positions")

    async def orders(self) -> Any:
        return await self._get("/orders")

    async def historical_daily(
        self,
        security_id: str,
        from_date: str,
        to_date: str,
        exchange_segment: str = "NSE_EQ",
        instrument: str = "EQUITY",
    ) -> Any:
        return await self._post(
            "/charts/historical",
            {
                "securityId": str(security_id),
                "exchangeSegment": exchange_segment,
                "instrument": instrument,
                "expiryCode": 0,
                "oi": False,
                "fromDate": from_date,
                "toDate": to_date,
            },
        )

    async def market_ltp(self, security_ids: list[str], exchange_segment: str = "NSE_EQ") -> Any:
        cleaned_ids = [int(str(item)) for item in security_ids if str(item).strip()]
        if not cleaned_ids:
            return {"data": {exchange_segment: {}}, "status": "empty"}

        return await self._post(
            "/marketfeed/ltp",
            {exchange_segment: cleaned_ids},
            marketfeed=True,
        )


def dhan_not_configured_response(action: str) -> dict[str, Any]:
    return {
        "broker": "Dhan",
        "configured": False,
        "mode": "read_only_blocked",
        "action": action,
        "message": "Add DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN in backend/.env before this check.",
        "live_orders_enabled": False,
    }


def dhan_error_response(action: str, error: Exception) -> dict[str, Any]:
    if isinstance(error, DhanApiError):
        return {
            "broker": "Dhan",
            "configured": True,
            "mode": "dhan_api_error",
            "action": action,
            "status_code": error.status_code,
            "error": str(error),
            "response": error.response,
            "live_orders_enabled": False,
        }

    return {
        "broker": "Dhan",
        "configured": True,
        "mode": "adapter_error",
        "action": action,
        "error": str(error),
        "live_orders_enabled": False,
    }
