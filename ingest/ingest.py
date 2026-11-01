#!/usr/bin/env python3
"""DastakDe ingestion engine — only real, attributable opportunities.

Live sources this run:
  - Devpost public API (hackathons)
  - Devfolio open-hackathon page data (hackathons)
  - NTA Notice Board Archive (exam notices)
  - CBSE official circulars (exams / scholarships)
  - PIB education RSS (government schemes and notices)
  - ingest/programs.json (curated official programme pages, link-checked)

Each item records where it came from, the official URL, and whether the
deadline came from a live source, a notice, or must be checked on the portal.
A source failure contributes zero items; no placeholder or demo rows exist.

Outputs in docs/feed/:
  index.json, all.json and one JSON per category.
"""
from __future__ import annotations

import gzip
import hashlib
import html as html_mod
import ipaddress
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zlib
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

UTC = timezone.utc
IST = timezone(timedelta(hours=5, minutes=30))
ROOT = Path(__file__).resolve().parents[1]
FEED_DIR = ROOT / "docs" / "feed"
PROGRAMS_FILE = ROOT / "ingest" / "programs.json"
MAX_XML_BYTES = 2_000_000
MAX_HTML_BYTES = 5_000_000
CATEGORIES = ("hackathons", "scholarships", "exams", "schemes",
              "internships", "fellowships")

SOURCE_META = {
    "devpost": {"label": "Devpost", "domain": "devpost.com"},
    "devfolio": {"label": "Devfolio", "domain": "devfolio.co"},
    "nta": {"label": "National Testing Agency", "domain": "nta.ac.in"},
    "cbse": {"label": "CBSE", "domain": "cbse.gov.in"},
    "pib": {"label": "PIB, Government of India", "domain": "pib.gov.in"},
    "programs": {"label": "Verified official programme pages", "domain": ""},
    "aicte": {"label": "AICTE", "domain": "aicte-india.org"},
    "socialjustice": {"label": "Department of Social Justice & Empowerment",
                      "domain": "socialjustice.gov.in"},
    "barc": {"label": "Bhabha Atomic Research Centre", "domain": "barc.gov.in"},
}

# Hosts we may fetch or link to. Everything is https and public.
ALLOWED_DOMAINS = {
    "devpost.com": "Devpost",
    "devfolio.co": "Devfolio",
    "nta.ac.in": "National Testing Agency",
    "cbse.gov.in": "CBSE",
    "cbseacademic.nic.in": "CBSE Academic",
    "pib.gov.in": "Press Information Bureau, Govt. of India",
    "aicte-india.org": "AICTE",
    "socialjustice.gov.in": "Department of Social Justice & Empowerment",
    "barc.gov.in": "Bhabha Atomic Research Centre",
    "mca.gov.in": "Ministry of Corporate Affairs",
    "apprenticeshipindia.gov.in": "Apprenticeship India, Govt. of India",
    "sih.gov.in": "Smart India Hackathon",
    "withgoogle.com": "Google",
}

UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DastakDeIngest/2.0",
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}

SCAM_PATTERNS = [
    (r"registration\s+fee|apply.{0,20}fee\s+(of|is)|pay.{0,20}(rs\.?|inr|₹)",
     "fee-to-apply-flag"),
]

DEADLINE_HINT = re.compile(
    r"(last\s+date|last\s+day|closing\s+date|deadline|apply\s+(?:online\s+)?"
    r"(?:by|before|till|upto|up\s+to)|registration\s+(?:ends|closes|till)|"
    r"applications?\s+(?:close|end)|extended\s+(?:to|till)|"
    r"अंतिम\s+(?:तिथि|दिन)|आवेदन.{0,20}(?:तक|तिथि)|"
    r"पंजीकरण.{0,20}(?:तक|तिथि)|नियत\s+तिथि)",
    re.I)
DATE_NEAR_HINT = re.compile(
    r"(?:last\s+date|last\s+day|closing\s+date|deadline|apply\s+(?:online\s+)?"
    r"(?:by|before|till|upto|up\s+to)|registration\s+(?:ends|closes|till)|"
    r"applications?\s+(?:close|end)|extended\s+(?:to|till)|"
    r"अंतिम\s+(?:तिथि|दिन)|आवेदन.{0,20}(?:तक|तिथि)|"
    r"पंजीकरण.{0,20}(?:तक|तिथि)|नियत\s+तिथि)"
    r".{0,90}?(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+"
    r"[A-Za-z]{3,9},?\s+\d{4}|[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})",
    re.I | re.S)

PIB_RELEVANT = re.compile(
    r"scholarship|fellowship|internship|apprentice|admission|entrance|"
    r"registration|apply|application|last\s+date|admit\s+card|counselling|"
    r"seat\s+allocation|छात्रवृत्ति|फेलोशिप|इंटर्नशिप|प्रशिक्षु|प्रवेश|"
    r"परीक्षा|आवेदन|पंजीकरण|अंतिम\s+तिथि|प्रवेश\s+परीक्षा", re.I)

CATEGORY_RULES = [
    ("fellowships", r"fellowship|research\s+associate|doctoral|ph\.?d|post[- ]?doc|"
                    r"फेलोशिप|डॉक्टरेट"),
    ("scholarships", r"scholarship|financial\s+assistance|fee\s+waiver|stipend|"
                     r"छात्रवृत्ति|वृत्ति|आर्थिक\s+सहायता"),
    ("internships", r"internship|apprentice|apprenticeship|trainee|"
                    r"इंटर्नशिप|प्रशिक्षु"),
    ("exams", r"exam|examination|entrance\s+test|neet|jee|gate|ugc[- ]?net|"
              r"csir[- ]?net|cbse|nta|admit\s+card|result|counselling|"
              r"परीक्षा|परिणाम|प्रवेश|एडमिट\s+कार्ड"),
    ("schemes", r"scheme|yojana|initiative|programme|program|coaching|"
                r"योजना|कार्यक्रम|अभियान"),
]

CBSE_RELEVANT = re.compile(
    r"scholarship|\bnsp\b|financial assistance|fellowship|examination form|"
    r"exam form|private candidate|admit card|date sheet|ctet|jee|neet|cuet|"
    r"ugc|result|verification|re-?evaluation|improvement|supplementary|"
    r"compartment|migration|admission|entrance|eligibility|"
    r"registration.{0,40}(?:exam|ctet|jee|neet|cuet)", re.I)
CBSE_EXCLUDE = re.compile(
    r"nishtha|teacher|faculty|webinar|digital payment|curriculum|syllabus|"
    r"experience centre|translation|recruitment|principal|mentor|"
    r"training programme|screening of sensitization|school staff|"
    r"storytelling|bagless|olympiad|list of candidates|\bloc\b|"
    r"affiliation|inspection|national teachers|conference", re.I)
NTA_EXCLUDE = re.compile(
    r"recruitment|vacancy|various\s+posts|eoi|expression\s+of\s+interest|"
    r"quotation|empanelment|hotel|librarian|typist|operation\s+assistant|"
    r"subject\s+matter\s+expert|translation\s+reviewer|relocation|affidavit|"
    r"supreme\s+court|tender|consultant|hiring|career|teachers?\s+training|"
    r"nitTT|office\s+assistant|walk-?in|engagement\s+of|appointment|"
    r"answer\s+key|\bresults?\b|score\s*card|cut\s*-?\s*off|certificate|"
    r"duplicate|\brank\b|re-?evaluation|challenge\s+of\s+provisional", re.I)


def _now_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _today() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d")


def _clean(text: str) -> str:
    text = html_mod.unescape(text or "")
    text = text.replace("\xa0", " ").replace("\ufffd", " ").replace("\u200b", "")
    return re.sub(r"\s+", " ", text).strip()


def _plain_text(text: str) -> str:
    """Strip markup so source HTML never reaches the app or the website."""
    unescaped = html_mod.unescape(text or "")
    plain = _clean(re.sub(r"<[^>]+>", " ", unescaped))
    return re.sub(r"\s+([.,;:!?])", r"\1", plain)


def _validate_url(url: str) -> None:
    """SSRF guard: https-only, allowlisted public host, no IP literal."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"only https fetches are allowed: {parsed.scheme!r}")
    host = (parsed.hostname or "").lower().rstrip(".")
    if not host:
        raise ValueError(f"URL has no host: {url!r}")
    if host not in ALLOWED_DOMAINS and not any(
            host.endswith("." + d) for d in ALLOWED_DOMAINS):
        raise ValueError(f"host not in source allowlist: {host!r}")
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        ip = None
    if ip is not None and (ip.is_private or ip.is_loopback or ip.is_reserved
                           or ip.is_link_local or ip.is_multicast
                           or ip.is_unspecified):
        raise ValueError(f"IP-literal host is not a public source: {host!r}")


def _get(url: str, timeout: int = 30, max_bytes: int = MAX_HTML_BYTES) -> bytes:
    _validate_url(url)

    class _ValidatedRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            _validate_url(newurl)
            return urllib.request.HTTPRedirectHandler.redirect_request(
                self, req, fp, code, msg, headers, newurl)

    opener = urllib.request.build_opener(_ValidatedRedirect)
    req = urllib.request.Request(url, headers=UA)
    with opener.open(req, timeout=timeout) as resp:
        data = resp.read(max_bytes + 1)
        encoding = (resp.headers.get("Content-Encoding") or "").lower()
    if encoding == "gzip":
        data = gzip.decompress(data)
    elif encoding == "deflate":
        data = zlib.decompress(data)
    if len(data) > max_bytes:
        raise ValueError(f"response larger than {max_bytes} bytes: {url}")
    return data


def _make_id(url: str, title: str) -> str:
    raw = f"{url}\x00{title}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def _domain_ok(url: str) -> bool:
    try:
        host = (urllib.parse.urlparse(url).hostname or "").lower()
        return any(host == d or host.endswith("." + d) for d in ALLOWED_DOMAINS)
    except Exception:
        return False


def _scam_flags(text: str) -> list[str]:
    low = text.lower()
    return [name for pat, name in SCAM_PATTERNS if re.search(pat, low)]


def _categorize(text: str) -> str:
    low = text.lower()
    for cat, pat in CATEGORY_RULES:
        if re.search(pat, low):
            return cat
    return "schemes"


MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep",
     "oct", "nov", "dec"], 1)}


def _parse_date(text: str, year_hint: int | None = None) -> str | None:
    if not text:
        return None
    t = _clean(text)
    m = re.search(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b", t)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            return datetime(y, mo, d, tzinfo=UTC).strftime("%Y-%m-%d")
        except ValueError:
            return None
    m = re.search(r"\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b", t)
    if m and m.group(1).lower()[:3] in MONTHS:
        try:
            return datetime(int(m.group(3)), MONTHS[m.group(1).lower()[:3]],
                            int(m.group(2)), tzinfo=UTC).strftime("%Y-%m-%d")
        except ValueError:
            return None
    m = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9}),?\s+(\d{4})\b", t)
    if m and m.group(2).lower()[:3] in MONTHS:
        try:
            return datetime(int(m.group(3)), MONTHS[m.group(2).lower()[:3]],
                            int(m.group(1)), tzinfo=UTC).strftime("%Y-%m-%d")
        except ValueError:
            return None
    m = re.search(r"\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b", t)
    if m and m.group(1).lower()[:3] in MONTHS:
        mo = MONTHS[m.group(1).lower()[:3]]
        now = datetime.now(UTC)
        for y in ((year_hint,) if year_hint else (now.year, now.year + 1)):
            try:
                cand = datetime(y, mo, int(m.group(2)), tzinfo=UTC)
                if cand >= now - timedelta(days=1):
                    return cand.strftime("%Y-%m-%d")
            except ValueError:
                pass
    return None


def _deadline_from_text(text: str) -> str | None:
    m = DATE_NEAR_HINT.search(text or "")
    return _parse_date(m.group(1)) if m else None


def _iso_day(value: str | None) -> str | None:
    m = re.match(r"(\d{4}-\d{2}-\d{2})", value or "")
    return m.group(1) if m else None


def _ist_day(value: str | None) -> str | None:
    try:
        parsed = datetime.fromisoformat((value or "").replace("Z", "+00:00"))
        return parsed.astimezone(IST).strftime("%Y-%m-%d")
    except ValueError:
        return _iso_day(value)


def _item(*, title: str, org: str, category: str, url: str, deadline: str | None,
          deadline_status: str, description: str, source: str,
          source_label: str, tags: list[str], published_at: str | None = None,
          extra_verification: dict | None = None) -> dict:
    if category not in CATEGORIES:
        raise ValueError(f"unknown category: {category}")
    title = _plain_text(title)
    org = _plain_text(org)
    description = _plain_text(description)
    tags = [_plain_text(tag) for tag in tags]
    verification = {
        "domain": (urllib.parse.urlparse(url).hostname or "").lower(),
        "source_verified": _domain_ok(url),
        "deadline_future": (deadline >= _today()) if deadline else None,
        "flags": _scam_flags(title + " " + description),
        "deadline_status": deadline_status,
    }
    if extra_verification:
        verification.update(extra_verification)
    return {
        "id": _make_id(url, title),
        "title": title,
        "org": org,
        "category": category,
        "url": url,
        "deadline": deadline,
        "deadline_status": deadline_status,
        "description": description,
        "source": source,
        "source_label": source_label,
        "fetched_at": _now_iso(),
        "published_at": published_at,
        "tags": [t for t in dict.fromkeys(tags) if t][:5],
        "verification": verification,
    }


# ---------------------------------------------------------------------------
# Source adapters
# ---------------------------------------------------------------------------

def fetch_devpost(limit_pages: int = 3) -> list[dict]:
    items: list[dict] = []
    seen: set[str] = set()
    for page in range(1, limit_pages + 1):
        url = f"https://devpost.com/api/hackathons?page={page}"
        try:
            data = json.loads(_get(url))
        except Exception:
            break
        hacks = data.get("hackathons") or []
        if not hacks:
            break
        for h in hacks:
            if (h.get("open_state") or "").lower() != "open":
                continue
            link = h.get("url") or ""
            title = _clean(h.get("title") or "")
            if not link or not title or link in seen:
                continue
            seen.add(link)
            dates = h.get("submission_period_dates") or ""
            deadline = None
            if "-" in dates:
                deadline = _parse_date(dates.split("-", 1)[1])
            deadline = deadline or _parse_date(dates)
            if deadline and deadline < _today():
                continue
            org = _clean(h.get("organization_name") or "Devpost")
            prize = _plain_text(str(h.get("prize_amount") or ""))
            prize_digits = re.sub(r"[^\d]", "", prize)
            themes = [t.get("name", "") for t in (h.get("themes") or [])
                      if isinstance(t, dict) and t.get("name")] or \
                     [str(t) for t in (h.get("themes") or []) if isinstance(t, str)]
            desc = f"{org} hackathon listed on Devpost."
            if prize and prize_digits and int(prize_digits) > 0:
                desc += f" Prize pool: {prize}."
            if themes:
                desc += " Themes: " + ", ".join(_plain_text(t) for t in themes[:4]) + "."
            items.append(_item(
                title=title, org=org, category="hackathons", url=link,
                deadline=deadline, deadline_status="fixed" if deadline else "rolling",
                description=desc[:600], source="devpost",
                source_label="Devpost API — open hackathons",
                tags=[_clean(t).title() for t in themes][:4]))
    return items


def fetch_devfolio() -> list[dict]:
    url = "https://devfolio.co/hackathons"
    raw = _get(url, max_bytes=MAX_HTML_BYTES).decode("utf-8", "ignore")
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        raw, re.S)
    if not m:
        raise ValueError("Devfolio page did not include its page data")
    data = json.loads(m.group(1))
    try:
        hacks = data["props"]["pageProps"]["dehydratedState"]["queries"][0][
            "state"]["data"]["open_hackathons"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Devfolio page-data shape changed") from exc

    items: list[dict] = []
    for h in hacks:
        slug = (h.get("slug") or "").strip()
        title = _clean(h.get("name") or "")
        settings = h.get("settings") or {}
        reg_end_raw = settings.get("reg_ends_at")
        deadline = _ist_day(str(reg_end_raw)) if reg_end_raw else None
        if not slug or not title or not deadline or deadline < _today():
            continue
        link = f"https://{slug}.devfolio.co/"
        themes = []
        for t in h.get("themes") or []:
            if isinstance(t, dict) and isinstance(t.get("theme"), dict):
                name = t["theme"].get("name")
                if name:
                    themes.append(_clean(name))
        start = _ist_day(str(h.get("starts_at") or ""))
        end = _ist_day(str(h.get("ends_at") or ""))
        mode = "online" if h.get("is_online") else "in person"
        desc = f"Hackathon with open registration on Devfolio ({mode})."
        if start and end:
            desc += f" Event dates: {start} to {end}."
        participants = h.get("participants_count")
        if isinstance(participants, int) and participants > 0:
            desc += f" {participants} participants registered."
        if themes:
            desc += " Themes: " + ", ".join(themes[:4]) + "."
        items.append(_item(
            title=title, org="Devfolio community", category="hackathons",
            url=link, deadline=deadline, deadline_status="fixed",
            description=desc[:600], source="devfolio",
            source_label="Devfolio — registration open",
            tags=themes[:4] + [mode.title()]))
    return items


def _parse_nta(raw: str) -> list[dict]:
    items: list[dict] = []
    cutoff = (datetime.now(UTC) - timedelta(days=60)).strftime("%Y-%m-%d")
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", raw, re.S | re.I):
        content_m = re.search(r"<content[^>]*>(.*?)</content>", row, re.S | re.I)
        if not content_m:
            continue
        title = _clean(re.sub(r"<[^>]+>", " ", content_m.group(1)))
        if not title or NTA_EXCLUDE.search(title):
            continue
        href_m = re.search(r'href="([^"]+)"', row, re.I)
        if not href_m:
            continue
        href = html_mod.unescape(href_m.group(1))
        if href.startswith("/"):
            link = urllib.parse.urljoin("https://nta.ac.in", href)
        elif href.startswith("https://nta.ac.in/"):
            link = href
        else:
            continue
        date_m = re.search(r"Notice_(\d{8})", href)
        published = None
        if date_m:
            try:
                published = datetime.strptime(date_m.group(1), "%Y%m%d").strftime("%Y-%m-%d")
            except ValueError:
                published = None
        if not published or published < cutoff:
            continue
        deadline = _deadline_from_text(title)
        if deadline and deadline < _today():
            continue
        category = "scholarships" if re.search(
            r"scholarship|वृत्ति", title, re.I) else "exams"
        items.append(_item(
            title=title, org="National Testing Agency", category=category,
            url=link, deadline=deadline,
            deadline_status="fixed" if deadline else "notice",
            description=("Official NTA notice. Open the official notice for "
                         "dates, eligibility and the application route."),
            source="nta", source_label="NTA — official notice board",
            tags=["NTA", "official notice", "exam"],
            published_at=published))
    return items[:80]


def fetch_nta() -> list[dict]:
    raw = _get("https://nta.ac.in/NoticeBoardArchive",
               max_bytes=MAX_HTML_BYTES).decode("utf-8", "ignore")
    return _parse_nta(raw)


def _parse_cbse(raw: str) -> list[dict]:
    items: list[dict] = []
    cutoff = (datetime.now(UTC) - timedelta(days=60)).strftime("%Y-%m-%d")
    for row in re.findall(r'<li class="list-new">(.*?)</li>', raw, re.S | re.I):
        anchor = re.search(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', row, re.S | re.I)
        if not anchor:
            continue
        href = html_mod.unescape(anchor.group(1))
        raw_title = re.sub(r"<[^>]+>", " ", anchor.group(2))
        title = _clean(raw_title)
        title = re.sub(
            r"\s*\(\s*[\d.]+\s*[KMG]B\s*\)\s*\d{2}/\d{2}/\d{4}\s*$", "",
            title, flags=re.I).strip()
        title = re.sub(r"\s*\d{2}/\d{2}/\d{4}\s*$", "", title).strip()
        title = re.sub(r"\s*\(\s*[\d.]+\s*[KMG]B\s*\)\s*$", "",
                       title, flags=re.I).strip()
        if not title or not CBSE_RELEVANT.search(title) or CBSE_EXCLUDE.search(title):
            continue
        if href.startswith("http"):
            link = href
        else:
            link = urllib.parse.urljoin("https://www.cbse.gov.in/cbsenew/", href)
        if not _domain_ok(link):
            continue
        date_m = re.search(r"\b(\d{2})/(\d{2})/(\d{4})\b", row)
        published = None
        if date_m:
            d, mo, y = (int(date_m.group(1)), int(date_m.group(2)),
                        int(date_m.group(3)))
            try:
                published = datetime(y, mo, d, tzinfo=UTC).strftime("%Y-%m-%d")
            except ValueError:
                published = None
        if not published or published < cutoff:
            continue
        deadline = _deadline_from_text(title)
        if deadline and deadline < _today():
            continue
        category = "scholarships" if re.search(
            r"scholarship|nsp|financial assistance|fee waiver", title, re.I) else "exams"
        items.append(_item(
            title=title, org="Central Board of Secondary Education",
            category=category, url=link, deadline=deadline,
            deadline_status="fixed" if deadline else "notice",
            description=("Official CBSE circular. Open the circular for complete "
                         "dates, eligibility and instructions."),
            source="cbse", source_label="CBSE — official circulars",
            tags=["CBSE", "official notice"], published_at=published))
    return items[:60]


def fetch_cbse() -> list[dict]:
    raw = _get("https://www.cbse.gov.in/cbsenew/cbse.html",
               max_bytes=MAX_HTML_BYTES).decode("utf-8", "ignore")
    return _parse_cbse(raw)


def _safe_parse_rss(raw: bytes) -> ET.Element | None:
    head = raw[:65536].lower()
    if b"<!doctype" in head or b"<!entity" in head:
        raise ValueError("RSS contains DTD/entities — refusing to parse")
    if len(raw) > MAX_XML_BYTES:
        raise ValueError("RSS larger than the size cap")
    return ET.fromstring(raw)


def fetch_pib() -> list[dict]:
    url = "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3"
    try:
        raw = _get(url, max_bytes=MAX_XML_BYTES)
    except Exception:
        return []
    try:
        channel = _safe_parse_rss(raw).find("channel")
    except Exception:
        return []
    if channel is None:
        return []
    items: list[dict] = []
    cutoff = (datetime.now(UTC) - timedelta(days=21)).strftime("%Y-%m-%d")
    for entry in channel.findall("item"):
        title = _clean(entry.findtext("title") or "")
        link = (entry.findtext("link") or "").strip()
        desc = _clean(re.sub(r"<[^>]+>", " ", entry.findtext("description") or ""))
        if not title or not link:
            continue
        text = title + " " + desc
        if not PIB_RELEVANT.search(text):
            continue
        pub_date = None
        try:
            pub_date = parsedate_to_datetime(
                entry.findtext("pubDate") or "").astimezone(UTC).strftime("%Y-%m-%d")
        except Exception:
            pass
        if pub_date and pub_date < cutoff:
            continue
        category = _categorize(title + " " + desc)
        deadline = _deadline_from_text(title + ". " + desc)
        if deadline and deadline < _today():
            deadline = None
        org = "Press Information Bureau"
        org_m = re.search(r"\b(Ministry of [A-Za-z &]+)\b", title)
        if org_m:
            org = org_m.group(1).strip()
        items.append(_item(
            title=title, org=org, category=category, url=link,
            deadline=deadline, deadline_status="fixed" if deadline else "notice",
            description=desc[:500], source="pib",
            source_label="PIB, Government of India — official RSS",
            tags=["Government of India", "official"], published_at=pub_date))
    return items


def fetch_programs() -> list[dict]:
    data = json.loads(PROGRAMS_FILE.read_text(encoding="utf-8"))
    checked_at = _clean(data.get("checked_at") or _today())
    entries = data.get("programs") or []
    if not isinstance(entries, list):
        raise ValueError("programs.json must contain a list at programs")
    items: list[dict] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        title = _clean(entry.get("title") or "")
        url = (entry.get("url") or "").strip()
        category = (entry.get("category") or "").strip()
        org = _clean(entry.get("org") or "")
        desc = _clean(entry.get("description") or "")
        if not title or not url or not org or not desc or category not in CATEGORIES:
            continue
        _validate_url(url)
        status = entry.get("deadline_status") or "check_official"
        if status not in {"check_official", "seasonal"}:
            status = "check_official"
        tags = [_clean(t) for t in (entry.get("tags") or []) if isinstance(t, str)]
        items.append(_item(
            title=title, org=org, category=category, url=url, deadline=None,
            deadline_status=status, description=desc, source="programs",
            source_label="Official programme page — " + org, tags=tags,
            published_at=None,
            extra_verification={"checked_at": checked_at,
                                "official_program": True}))
    return items


SOURCES = {
    "devpost": fetch_devpost,
    "devfolio": fetch_devfolio,
    "nta": fetch_nta,
    "cbse": fetch_cbse,
    "pib": fetch_pib,
    "programs": fetch_programs,
}


# ---------------------------------------------------------------------------
# Assemble + write
# ---------------------------------------------------------------------------

def _dedupe_and_filter(items: list[dict]) -> list[dict]:
    grace = (datetime.now(UTC) - timedelta(days=2)).strftime("%Y-%m-%d")
    seen_ids: set[str] = set()
    seen_urls: set[str] = set()
    kept: list[dict] = []
    for it in items:
        clean_url = urllib.parse.urlsplit(it["url"])._replace(query="", fragment="").geturl()
        if (it["id"] in seen_ids or clean_url in seen_urls
                or it["verification"]["flags"]):
            continue
        if it.get("deadline") and it["deadline"] < grace:
            continue
        seen_ids.add(it["id"])
        seen_urls.add(clean_url)
        kept.append(it)
    return kept


def _sort_key(it: dict):
    if it.get("deadline"):
        return (0, it["deadline"], it["title"].lower())
    if it.get("published_at"):
        try:
            ordinal = datetime.strptime(it["published_at"], "%Y-%m-%d").toordinal()
        except ValueError:
            ordinal = 0
        return (1, -ordinal, it["title"].lower())
    return (2, 0, it["title"].lower())


def main() -> int:
    all_items: list[dict] = []
    manifest: dict[str, dict] = {}
    for name, fetch in SOURCES.items():
        meta = SOURCE_META[name]
        try:
            got = fetch()
            manifest[name] = {"status": "ok", "items": len(got),
                              "label": meta["label"]}
        except Exception as exc:
            manifest[name] = {"status": "error", "items": 0,
                              "label": meta["label"],
                              "error": str(exc)[:160]}
            got = []
        all_items.extend(got)

    kept = _dedupe_and_filter(all_items)
    kept.sort(key=_sort_key)

    FEED_DIR.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}
    generated = _now_iso()
    for cat in CATEGORIES:
        subset = [i for i in kept if i["category"] == cat][:250]
        counts[cat] = len(subset)
        (FEED_DIR / f"{cat}.json").write_text(
            json.dumps({"generated_at": generated, "items": subset},
                       ensure_ascii=False, indent=1), encoding="utf-8")

    (FEED_DIR / "all.json").write_text(
        json.dumps({"generated_at": generated, "schema_version": 2, "items": kept},
                   ensure_ascii=False, indent=1), encoding="utf-8")
    (FEED_DIR / "index.json").write_text(
        json.dumps({
            "generated_at": generated,
            "schema_version": 2,
            "total": len(kept),
            "counts": counts,
            "sources": manifest,
            "honesty_note": "Only items parsed from the listed official "
                            "sources this run, plus the curated official "
                            "programme registry whose pages are link-checked. "
                            "A failing source contributes nothing rather than "
                            "fake data. 'Dates on portal' items have no "
                            "machine-readable deadline; verify on the official "
                            "page.",
        }, ensure_ascii=False, indent=1), encoding="utf-8")

    print(json.dumps({"total": len(kept), "counts": counts,
                      "sources": {k: v["status"] for k, v in manifest.items()}}))
    return 0 if len(kept) > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
