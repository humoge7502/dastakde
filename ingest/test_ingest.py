import json
import unittest
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

from ingest import ingest as engine


UTC = timezone.utc


def recent_days(days: int) -> datetime:
    return datetime.now(UTC) - timedelta(days=days)


class DateTests(unittest.TestCase):
    def test_common_formats(self):
        self.assertEqual(engine._parse_date("15/11/2026"), "2026-11-15")
        self.assertEqual(engine._parse_date("15.11.2026"), "2026-11-15")
        self.assertEqual(engine._parse_date("November 15, 2026"), "2026-11-15")
        self.assertEqual(engine._parse_date("15 November 2026"), "2026-11-15")

    def test_invalid_date(self):
        self.assertIsNone(engine._parse_date("31/02/2026"))
        self.assertIsNone(engine._parse_date("not a date"))

    def test_deadline_requires_a_hint(self):
        self.assertEqual(
            engine._deadline_from_text("Last date to apply: 15/11/2026"),
            "2026-11-15")
        self.assertIsNone(
            engine._deadline_from_text("Published on 15/11/2026"))


class SecurityTests(unittest.TestCase):
    def test_rejects_non_https(self):
        with self.assertRaises(ValueError):
            engine._validate_url("http://devpost.com/")

    def test_rejects_unlisted_host(self):
        with self.assertRaises(ValueError):
            engine._validate_url("https://example.com/opportunity")

    def test_accepts_official_subdomains(self):
        engine._validate_url("https://devnexus2.devfolio.co/")
        engine._validate_url("https://downloads.nta.ac.in/")

    def test_scam_fee_is_flagged(self):
        self.assertTrue(engine._scam_flags("Pay INR 499 registration fee to apply"))


class FeedShapeTests(unittest.TestCase):
    def test_item_has_deadline_status(self):
        item = engine._item(
            title="Example", org="Org", category="hackathons",
            url="https://devpost.com/example", deadline="2026-12-01",
            deadline_status="fixed", description="A real listing.",
            source="devpost", source_label="Devpost", tags=["online"])
        self.assertEqual(item["deadline_status"], "fixed")
        self.assertTrue(item["verification"]["source_verified"])
        self.assertIn("deadline_status", item["verification"])

    def test_description_strips_source_markup(self):
        item = engine._item(
            title="Prize <b>Hack</b>", org="Org &amp; Co", category="hackathons",
            url="https://hack.devpost.com/", deadline="2026-12-01",
            deadline_status="fixed",
            description="Prize pool: $<span data-currency-value>50,000</span>.",
            source="devpost", source_label="Devpost", tags=["<i>Web</i>"])
        self.assertEqual(item["title"], "Prize Hack")
        self.assertEqual(item["org"], "Org & Co")
        self.assertEqual(item["description"], "Prize pool: $ 50,000.")
        self.assertNotIn("<", item["description"])
        self.assertEqual(item["tags"], ["Web"])

    def test_duplicate_urls_are_removed(self):
        base = dict(
            org="Org", category="exams", url="https://nta.ac.in/n.pdf?x=1",
            deadline=None, deadline_status="notice", description="Official notice.",
            source="nta", source_label="NTA", tags=[])
        first = engine._item(title="First", **base)
        second = engine._item(title="Second", **base)
        kept = engine._dedupe_and_filter([first, second])
        self.assertEqual(len(kept), 1)

    def test_curated_programmes_are_valid(self):
        data = json.loads(engine.PROGRAMS_FILE.read_text(encoding="utf-8"))
        self.assertTrue(data["programs"])
        for entry in data["programs"]:
            self.assertIn(entry["category"], engine.CATEGORIES)
            engine._validate_url(entry["url"])
            self.assertTrue(entry["title"].strip())
            self.assertTrue(entry["description"].strip())


class SourceParserTests(unittest.TestCase):
    def test_nta_parser_extracts_relative_pdf_and_published_date(self):
        d = recent_days(5)
        stamp = d.strftime("%Y%m%d")
        fixture = f"""
        <table><tr>
          <td class="align_centre">1</td>
          <td><content style="color:#012B55">Online registration for JEE (Main) 2027 Session 1</content></td>
          <td><a href="/Download/Notice/Notice_{stamp}120000.pdf">Read More</a></td>
        </tr></table>
        """
        items = engine._parse_nta(fixture)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["source"], "nta")
        self.assertEqual(items[0]["deadline_status"], "notice")
        self.assertTrue(items[0]["url"].startswith("https://nta.ac.in/Download/"))
        self.assertEqual(items[0]["published_at"], d.strftime("%Y-%m-%d"))
        self.assertEqual(items[0]["category"], "exams")

    def test_cbse_parser_filters_teacher_circulars(self):
        d = recent_days(4)
        stamp = d.strftime("%d/%m/%Y")
        fixture = f"""
        <ul>
          <li class="list-new"><a href="documents/CTET_PUBLIC_NOTICE.pdf">
            Public Notice: CTET registration window (409 KB)</a> {stamp} </li>
          <li class="list-new"><a href="documents/NISHTHA.pdf">
            NISHTHA teacher training circular (1.2 MB)</a> {stamp} </li>
        </ul>
        """
        items = engine._parse_cbse(fixture)
        self.assertEqual(len(items), 1)
        self.assertIn("CTET", items[0]["title"])
        self.assertNotIn("(409 KB)", items[0]["title"])
        self.assertEqual(items[0]["published_at"], d.strftime("%Y-%m-%d"))
        self.assertTrue(items[0]["url"].startswith("https://www.cbse.gov.in/"))

    def test_devfolio_deadline_uses_registration_end(self):
        tomorrow = (datetime.now(UTC) + timedelta(days=2)).strftime("%Y-%m-%d")
        ist_next_day = (datetime.strptime(tomorrow, "%Y-%m-%d")
                        + timedelta(days=1)).strftime("%Y-%m-%d")
        payload = {
            "props": {"pageProps": {"dehydratedState": {"queries": [{
                "state": {"data": {"open_hackathons": [{
                    "slug": "test-hack",
                    "name": "Test Hack",
                    "starts_at": "2026-12-10T00:00:00+00:00",
                    "ends_at": "2026-12-11T00:00:00+00:00",
                    "is_online": True,
                    "participants_count": 42,
                    "settings": {"reg_ends_at": tomorrow + "T18:30:00+00:00"},
                    "themes": [{"theme": {"name": "AI"}}],
                }]}}
            }]}}}
        }
        raw = ('<script id="__NEXT_DATA__" type="application/json">'
               + json.dumps(payload) + "</script>")
        original = engine._get
        engine._get = lambda *a, **k: raw.encode()
        try:
            items = engine.fetch_devfolio()
        finally:
            engine._get = original
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["deadline"], ist_next_day)
        self.assertEqual(items[0]["url"], "https://test-hack.devfolio.co/")
        self.assertEqual(items[0]["deadline_status"], "fixed")


if __name__ == "__main__":
    unittest.main()
