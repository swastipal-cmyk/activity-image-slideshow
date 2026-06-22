#!/usr/bin/env python3
"""
Export the "All Activities" sheet from flagship-activities_hero_images_all.xlsx
to data/all-activities-web.csv (text + URLs only, ~1–2 MB) for the web tools.

The full .xlsx is often too large for browsers (embedded images).

Usage:
  python3 scripts/export-all-activities-web-csv.py /path/to/flagship-activities_hero_images_all.xlsx
"""

from __future__ import annotations

import csv
import os
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
NS_REL_DOC = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def worksheet_path_for_sheet_name(z: zipfile.ZipFile, want: str) -> str:
    rels_root = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    id_to_target: dict[str, str] = {}
    for rel in rels_root.findall(f"{{{NS_REL}}}Relationship"):
        rid = rel.get("Id")
        tgt = rel.get("Target")
        if rid and tgt:
            id_to_target[rid] = tgt.replace("\\", "/")

    wb = ET.fromstring(z.read("xl/workbook.xml"))
    ns_w = {"m": NS.strip("{}"), "r": NS_REL_DOC}
    for sh in wb.findall(".//m:sheets/m:sheet", ns_w):
        name = (sh.get("name") or "").strip()
        if name.lower() != want.lower():
            continue
        rid = sh.get(f"{{{NS_REL_DOC}}}id")
        if not rid or rid not in id_to_target:
            raise SystemExit(f"Sheet {want!r}: missing relationship id")
        target = id_to_target[rid]
        if not target.startswith("worksheets/"):
            target = "worksheets/" + target.lstrip("/")
        return "xl/" + target if not target.startswith("xl/") else target
    raise SystemExit(f"Sheet named {want!r} not found in workbook")


def read_shared_strings(z: zipfile.ZipFile) -> list[str]:
    data = z.read("xl/sharedStrings.xml")
    root = ET.fromstring(data)
    out: list[str] = []
    for si in root.findall(f"{NS}si"):
        parts: list[str] = []
        for t in si.iter(f"{NS}t"):
            if t.text:
                parts.append(t.text)
            if t.tail:
                parts.append(t.tail)
        out.append("".join(parts))
    return out


def col_letters(ref: str) -> str:
    return "".join(c for c in ref if c.isalpha())


def cell_text(c: ET.Element, strings: list[str]) -> str:
    v = c.find(f"{NS}v")
    if v is None or v.text is None:
        return ""
    t = c.get("t")
    if t == "s":
        return strings[int(v.text)]
    return str(v.text)


def main() -> None:
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(repo_root, "data", "all-activities-web.csv")

    if len(sys.argv) < 2:
        print("Usage: python3 scripts/export-all-activities-web-csv.py <path-to-flagship-activities_hero_images_all.xlsx>")
        sys.exit(1)

    xlsx_path = os.path.expanduser(sys.argv[1])
    if not os.path.isfile(xlsx_path):
        print("Not a file:", xlsx_path)
        sys.exit(1)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    with zipfile.ZipFile(xlsx_path) as z:
        sheet_xml = worksheet_path_for_sheet_name(z, "All Activities")
        if sheet_xml not in z.namelist():
            print("Resolved path not in zip:", sheet_xml)
            sys.exit(1)
        strings = read_shared_strings(z)
        sheet = ET.fromstring(z.read(sheet_xml))
        sd = sheet.find(f"{NS}sheetData")
        if sd is None:
            print("No sheetData in", sheet_xml)
            sys.exit(1)
        xml_rows = sd.findall(f"{NS}row")

    hdr = [
        "activity_id",
        "master_code",
        "activity_title",
        "city_name",
        "country_name",
        "image_number",
        "quality_score",
        "pix_url",
        "rank",
    ]
    n = 0
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(hdr)
        for row in xml_rows[1:]:
            d: dict[str, str] = {}
            for c in row.findall(f"{NS}c"):
                ref = c.get("r")
                if not ref:
                    continue
                d[col_letters(ref)] = cell_text(c, strings)
            imgnum = d.get("F", "").strip()
            w.writerow(
                [
                    d.get("A", "").strip(),
                    d.get("B", "").strip(),
                    d.get("C", ""),
                    d.get("D", ""),
                    d.get("E", ""),
                    imgnum,
                    d.get("G", "").strip(),
                    d.get("H", "").strip(),
                    imgnum,
                ]
            )
            n += 1

    mb = os.path.getsize(out_path) / 1024 / 1024
    print(f"Wrote {out_path} ({n} data rows, {mb:.2f} MB)")


if __name__ == "__main__":
    main()
