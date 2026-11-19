import json, os, sys, urllib.request

UA = "DiscordBot (https://github.com, 1.0)"

with open(os.environ["GITHUB_EVENT_PATH"]) as f:
    event = json.load(f)

commits = event.get("commits", [])
if not commits:
    print("No commits in event, nothing to post.")
    sys.exit(0)

repo = event["repository"]["full_name"]
lines = []
for c in commits[:10]:
    first_line = c["message"].split("\n")[0][:100]
    author = c["author"].get("name", "unknown")
    lines.append(f"[`{c['id'][:7]}`]({c['url']}) {first_line} — {author}")
if len(commits) > 10:
    lines.append(f"…and {len(commits) - 10} more")

embed = {
    "title": "📢 Website updated",
    "description": "\n".join(lines),
    "url": os.environ.get("SITE_URL") or event["repository"]["html_url"],
    "color": 0x5865F2,
    "footer": {"text": repo},
    "timestamp": event["head_commit"]["timestamp"] if event.get("head_commit") else None,
}
embed = {k: v for k, v in embed.items() if v is not None}

req = urllib.request.Request(
    os.environ["DISCORD_WEBHOOK_URL"],
    data=json.dumps({"embeds": [embed]}).encode(),
    headers={"Content-Type": "application/json", "User-Agent": UA},
    method="POST",
)
with urllib.request.urlopen(req, timeout=15) as r:
    print("Discord responded:", r.status)
