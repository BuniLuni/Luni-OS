import json, os, time, urllib.request, urllib.error

SITE_URL = os.environ["SITE_URL"]
TOKEN = os.environ["DISCORD_BOT_TOKEN"]
STATUS_VC_ID = os.environ["STATUS_VC_ID"]
PING_VC_ID = os.environ["PING_VC_ID"]

UA = "DiscordBot (https://github.com, 1.0)"
API = "https://discord.com/api/v10"


def ping_site():
    """Returns (is_up, milliseconds). Retries once so one blip isn't 'down'."""
    for attempt in range(2):
        start = time.perf_counter()
        try:
            req = urllib.request.Request(SITE_URL, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=10) as r:
                ms = int((time.perf_counter() - start) * 1000)
                if r.status < 400:
                    return True, ms
        except urllib.error.HTTPError as e:
            if e.code < 400:
                return True, int((time.perf_counter() - start) * 1000)
        except Exception as e:
            print("ping attempt failed:", e)
        time.sleep(3)
    return False, None


def discord(method, path, body=None):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "Authorization": f"Bot {TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": UA,
        },
        method=method,
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read() or b"{}")


def rename(channel_id, new_name):
    try:
        current = discord("GET", f"/channels/{channel_id}").get("name")
        if current == new_name:
            print(f"{channel_id}: already '{new_name}', skipping")
            return
        discord("PATCH", f"/channels/{channel_id}", {"name": new_name})
        print(f"{channel_id}: renamed to '{new_name}'")
    except urllib.error.HTTPError as e:
        # 429 = Discord's rename rate limit (2 per 10 min per channel); just try next run
        print(f"{channel_id}: Discord error {e.code}: {e.read().decode()[:200]}")


up, ms = ping_site()
print("up" if up else "down", ms)

rename(STATUS_VC_ID, "🟢 Up" if up else "🔴 Down")
# rounded to nearest 10ms so the name doesn't change (and hit the rate limit) every run
rename(PING_VC_ID, f"Ping: {round(ms / 10) * 10}ms" if up else "Ping: --")
