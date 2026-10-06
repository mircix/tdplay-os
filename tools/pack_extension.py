#!/usr/bin/env python3
"""Pack chrome-sidepanel/ into a Chrome Web Store upload zip.

    python3 tools/pack_extension.py                 # dist/tdplay-os-sidepanel-<version>.zip
    python3 tools/pack_extension.py --version 1.3.0 # bump the manifest first
    python3 tools/pack_extension.py --keep-key      # keep the fixed-id "key" (unpacked builds only)

The Web Store assigns the published extension its own id, so "key" is dropped from the zip by
default — it exists only so the unpacked build keeps the id TDPlay OS pings (js/config.js).
"""
import argparse, base64, hashlib, json, os, re, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "chrome-sidepanel")
SHIP = (".png", ".html", ".js", ".json", ".css", ".svg")        # everything else is docs or build junk
SKIP = {"README.md", "STORE.md", "_metadata", ".DS_Store"}


def unpacked_id(key_b64):
    """Chrome's extension id: sha256 of the DER public key, first 16 bytes, hex digits mapped 0-f → a-p."""
    h = hashlib.sha256(base64.b64decode(key_b64)).hexdigest()[:32]
    return "".join(chr(ord("a") + int(c, 16)) for c in h)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", help="set the manifest version before packing (e.g. 1.3.0)")
    ap.add_argument("--keep-key", action="store_true", help="keep the fixed-id key in the packed manifest")
    ap.add_argument("--out", help="zip path (default dist/tdplay-os-sidepanel-<version>.zip)")
    a = ap.parse_args()

    mpath = os.path.join(SRC, "manifest.json")
    manifest = json.load(open(mpath, encoding="utf-8"))

    if a.version:
        if not re.match(r"^\d+(\.\d+){0,3}$", a.version):
            sys.exit("--version must look like 1.3.0")
        raw = open(mpath, encoding="utf-8").read()
        new = re.sub(r'("version":\s*")[^"]+(")', r"\g<1>%s\g<2>" % a.version, raw, count=1)
        open(mpath, "w", encoding="utf-8").write(new)
        manifest["version"] = a.version
        print("manifest version → %s" % a.version)

    # every file the manifest names must exist
    named = [manifest["background"]["service_worker"], manifest["side_panel"]["default_path"]]
    named += list(manifest.get("icons", {}).values())
    for res in manifest.get("declarative_net_request", {}).get("rule_resources", []):
        named.append(res["path"])
    for cs in manifest.get("content_scripts", []):
        named += list(cs.get("js", [])) + list(cs.get("css", []))
    missing = [f for f in named if not os.path.exists(os.path.join(SRC, f))]
    if missing:
        sys.exit("manifest points at files that aren't there: %s" % ", ".join(missing))

    # … and every local script/stylesheet the panel loads
    panel = open(os.path.join(SRC, manifest["side_panel"]["default_path"]), encoding="utf-8").read()
    for ref in re.findall(r'(?:src|href)="([^"?#:]+)"', panel):
        if not os.path.exists(os.path.join(SRC, ref)):
            sys.exit("%s loads %s, which isn't there" % (manifest["side_panel"]["default_path"], ref))

    packed = dict(manifest)
    key = packed.pop("key", None) if not a.keep_key else manifest.get("key")
    if key and not a.keep_key:
        print("unpacked id (kept in chrome-sidepanel/, dropped from the zip): %s" % unpacked_id(key))

    out = a.out or os.path.join(ROOT, "dist", "tdplay-os-sidepanel-%s.zip" % manifest["version"])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    files = []
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(packed, indent=2, ensure_ascii=False) + "\n")
        files.append("manifest.json")
        for name in sorted(os.listdir(SRC)):
            if name in SKIP or name.startswith(".") or name == "manifest.json":
                continue
            if not name.endswith(SHIP) or not os.path.isfile(os.path.join(SRC, name)):
                continue
            z.write(os.path.join(SRC, name), name)
            files.append(name)

    print("\n%s  (%.1f kB)" % (os.path.relpath(out, ROOT), os.path.getsize(out) / 1024.0))
    for f in files:
        print("  %s" % f)
    print("\nUpload it at chrome.google.com/webstore/devconsole — listing copy in chrome-sidepanel/STORE.md.")


if __name__ == "__main__":
    main()
