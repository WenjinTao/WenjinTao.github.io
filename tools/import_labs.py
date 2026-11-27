"""Copy labs that are built elsewhere into public/labs/ (static, ready to deploy with the site).

    python tools/import_labs.py            (from the repo root)

- simready-leaves: the SimReady leaf assets viewer + the Isaac Sim falling-leaves replay, from the Small worlds
  site (usd2three/out/leafsnap). Their Small worlds back-link block (<!--site-nav-->...<!--/site-nav-->) is removed
  and links that pointed at the Small worlds landing page go to this site's home instead. Scans: LeafSnap30
  (Zenodo 10.5281/zenodo.5061353, CC BY 4.0) - credited on both pages.
- simready-forklift: 'assets as code', usd2three/out/forklift (one HTML file), same nav stripping.
Banana Boolean has its own publisher: personal-projects/banana-web/publish.py taowenjin.
"""
import os
import re
import shutil

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_LEAVES = r"D:\Wenjin\content\linkedin\usd2three\out\leafsnap"
SRC_THUMB = r"D:\Wenjin\content\linkedin\usd2three\out\thumbs\wb_leafsnap.jpg"
SRC_THUMB_FALL = r"D:\Wenjin\content\linkedin\usd2three\out\thumbs\wb_leafsnap_fall.jpg"
SRC_FORKLIFT = r"D:\Wenjin\content\linkedin\usd2three\out\forklift"
SRC_THUMB_FORKLIFT = r"D:\Wenjin\content\linkedin\usd2three\out\thumbs\wb_forklift.jpg"


def strip_nav(s):
    return re.sub(r"<!--site-nav-->.*?<!--/site-nav-->\n?", "", s, flags=re.S)


def thumb(src, name):
    Image.open(src).convert("RGB").resize((960, 540), Image.LANCZOS).save(
        os.path.join(ROOT, "public", "labs", "thumbs", name + ".jpg"), quality=84, optimize=True, progressive=True)


def forklift():
    """Assets as code: the SimReady forklift (a 25 MB USD asset) rebuilt as one ~0.5 MB HTML page."""
    dst = os.path.join(ROOT, "public", "labs", "simready-forklift")
    os.makedirs(dst, exist_ok=True)
    s = strip_nav(open(os.path.join(SRC_FORKLIFT, "index.html"), encoding="utf-8").read())
    assert "site-nav" not in s
    s = s.replace('href="../index.html"', 'href="/"')
    open(os.path.join(dst, "index.html"), "w", encoding="utf-8", newline="\n").write(s)
    thumb(SRC_THUMB_FORKLIFT, "simready-forklift")
    print(f"simready-forklift: {os.path.getsize(os.path.join(dst, 'index.html')) / 1e6:.2f} MB -> {dst}")


def leaves():
    dst = os.path.join(ROOT, "public", "labs", "simready-leaves")
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(os.path.join(SRC_LEAVES, "viewer_data"), os.path.join(dst, "viewer_data"))
    os.makedirs(os.path.join(dst, "fall"))
    for rel, home in (("index.html", "../index.html"), (os.path.join("fall", "index.html"), "../../index.html")):
        s = strip_nav(open(os.path.join(SRC_LEAVES, rel), encoding="utf-8").read())
        assert "site-nav" not in s, rel
        s = s.replace(f'href="{home}"', 'href="/"')                 # Small worlds landing -> this site's home
        open(os.path.join(dst, rel), "w", encoding="utf-8", newline="\n").write(s)
    thumb(SRC_THUMB, "simready-leaves")
    thumb(SRC_THUMB_FALL, "falling-leaves")
    size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(dst) for f in fs)
    print(f"simready-leaves: {size / 1e6:.1f} MB -> {dst}")


if __name__ == "__main__":
    leaves()
    forklift()
