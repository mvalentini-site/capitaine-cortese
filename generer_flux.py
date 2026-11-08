"""Génère feed.xml (flux RSS du podcast) à partir de episodes.json.

Usage :  python generer_flux.py
À relancer après chaque ajout d'épisode, avant de pousser sur GitHub.
"""
import json
import os
from datetime import datetime
from email.utils import format_datetime
from xml.sax.saxutils import escape

ICI = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(ICI, "episodes.json"), encoding="utf-8") as f:
    d = json.load(f)

base = d["urlSite"].rstrip("/") + "/"
TYPES = {".mp3": "audio/mpeg", ".m4a": "audio/x-m4a", ".ogg": "audio/ogg", ".wav": "audio/wav"}


def rfc822(date):
    return format_datetime(datetime.strptime(date, "%Y-%m-%d").replace(hour=8).astimezone())


items = []
for ep in sorted(d["episodes"], key=lambda e: e.get("numero", 0)):
    if not ep.get("audio"):
        continue  # pas encore enregistré : pas dans le flux
    chemin = os.path.join(ICI, ep["audio"])
    taille = os.path.getsize(chemin) if os.path.exists(chemin) else 0
    if not taille:
        print(f"⚠  Fichier audio introuvable : {ep['audio']}")
    ext = os.path.splitext(ep["audio"])[1].lower()
    description = ep.get("resume", "")
    if ep.get("texte"):
        description += "\n\n" + ep["texte"]
    if ep.get("credits"):
        description += "\n\nSons : " + ep["credits"]
    items.append(f"""    <item>
      <title>{escape(ep['titre'])}</title>
      <description>{escape(description)}</description>
      <link>{base}#{escape(ep['id'])}</link>
      <guid isPermaLink="false">{escape(ep['id'])}</guid>
      <pubDate>{rfc822(ep['date'])}</pubDate>
      <enclosure url="{escape(base + ep['audio'])}" length="{taille}" type="{TYPES.get(ext, 'audio/mpeg')}"/>
      <itunes:episode>{ep.get('numero', '')}</itunes:episode>
      <itunes:duration>{escape(ep.get('duree', ''))}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
    </item>""")

flux = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{escape(d['titre'])}</title>
    <link>{base}</link>
    <atom:link href="{base}feed.xml" rel="self" type="application/rss+xml"/>
    <language>{d.get('langue', 'fr')}</language>
    <description>{escape(d['description'])}</description>
    <itunes:author>{escape(d['auteur'])}</itunes:author>
    <itunes:owner>
      <itunes:name>{escape(d['auteur'])}</itunes:name>
      <itunes:email>{escape(d.get('email', ''))}</itunes:email>
    </itunes:owner>
    <itunes:image href="{base}{escape(d['image'])}"/>
    <itunes:category text="Arts"><itunes:category text="Books"/></itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>serial</itunes:type>
{chr(10).join(items)}
  </channel>
</rss>
"""

with open(os.path.join(ICI, "feed.xml"), "w", encoding="utf-8") as f:
    f.write(flux)
print(f"feed.xml généré : {len(items)} épisode(s) avec audio.")
