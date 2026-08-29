import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

class ChatboError(Exception):
    def __init__(self, status, message, request_id=None):
        super().__init__(message); self.status = status; self.request_id = request_id

class Chatbo:
    def __init__(self, api_key, base_url="https://api.chatbo.ai"):
        if not api_key: raise ValueError("api_key is required")
        self.api_key = api_key; self.base_url = base_url.rstrip("/")

    def _request(self, path, payload=None, headers=None):
        body = json.dumps(payload).encode() if payload is not None else None
        req = Request(self.base_url + path, data=body, method="POST" if payload is not None else "GET")
        req.add_header("Authorization", f"Bearer {self.api_key}"); req.add_header("Content-Type", "application/json")
        for k, v in (headers or {}).items(): req.add_header(k, v)
        try:
            with urlopen(req, timeout=60) as response: return json.loads(response.read().decode())
        except HTTPError as exc:
            raw = exc.read().decode();
            try: data = json.loads(raw)
            except Exception: data = {}
            raise ChatboError(exc.code, data.get("error", "Chatbo API request failed"), exc.headers.get("X-Request-Id"))

    def chat(self, agent_id, message, conversation_id=None, idempotency_key=None):
        payload = {"message": message}
        if conversation_id: payload["conversationId"] = conversation_id
        headers = {"Idempotency-Key": idempotency_key} if idempotency_key else None
        return self._request(f"/api/v1/bots/{agent_id}/messages", payload, headers)

    def stream(self, agent_id, message, conversation_id=None):
        payload = {"message": message}
        if conversation_id: payload["conversationId"] = conversation_id
        req = Request(self.base_url + f"/api/v1/bots/{agent_id}/stream", data=json.dumps(payload).encode(), method="POST")
        req.add_header("Authorization", f"Bearer {self.api_key}"); req.add_header("Content-Type", "application/json"); req.add_header("Accept", "text/event-stream")
        try:
            response = urlopen(req, timeout=300)
            event, data = "message", None
            for raw in response:
                line = raw.decode().rstrip("\n")
                if line.startswith("event: "): event = line[7:]
                elif line.startswith("data: "):
                    data = json.loads(line[6:])
                elif line == "" and data is not None:
                    yield {"event": event, "data": data}; data = None; event = "message"
        except HTTPError as exc:
            raw = exc.read().decode();
            try: payload = json.loads(raw)
            except Exception: payload = {}
            raise ChatboError(exc.code, payload.get("error", "Chatbo streaming request failed"), exc.headers.get("X-Request-Id"))
