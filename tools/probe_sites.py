#!/usr/bin/env python3
"""Probe every artist website in the TDPlay index and record whether it can be shown inside an
iframe (no X-Frame-Options / CSP frame-ancestors) and its final https URL.

Writes sites.json next to index.html:  { "generated": ..., "sites": { "<domain>": {"f": 0|1, "u": "<final url>"} } }
Run:  python3 tools/probe_sites.py            (re-probes only new domains, keeps old results)
      python3 tools/probe_sites.py --full     (re-probes everything)
"""
import json, sys, os, time, urllib.request, urllib.error, ssl, concurrent.futures, re
from urllib.parse import urlparse

DATA_URL = "https://mircix.github.io/tdplay-search/data.json"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sites.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 TDPlayOS-probe"
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def domain(u):
    try: return urlparse(u).hostname.lower().replace("www.", "", 1) if urlparse(u).hostname else ""
    except Exception: return ""

def probe(url):
    """Return (frameable, final_url). GET (not HEAD) because some hosts answer HEAD differently, but stop after headers."""
    u = re.sub(r"^http://", "https://", url)
    for attempt in (u, url):
        req = urllib.request.Request(attempt, headers={"User-Agent": UA, "Accept": "text/html"})
        try:
            with urllib.request.urlopen(req, timeout=10, context=ctx) as r:
                h = {k.lower(): v for k, v in r.headers.items()}
                xfo = h.get("x-frame-options", "").lower()
                csp = h.get("content-security-policy", "").lower()
                blocked = bool(xfo) or ("frame-ancestors" in csp and "frame-ancestors *" not in csp)
                # a <meta http-equiv CSP> in the first bytes also counts
                if not blocked:
                    try:
                        head = r.read(20000).decode("utf-8", "ignore").lower()
                        if "frame-ancestors" in head and "http-equiv" in head: blocked = True
                    except Exception: pass
                return (0 if blocked else 1, r.geturl())
        except urllib.error.HTTPError as e:
            h = {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
            if e.code in (403, 429, 503) and h.get("server", "").lower().startswith("cloudflare"):
                return (1, attempt)          # bot wall on the probe only; a real browser usually gets through
            if e.code < 500 and attempt == u and not url.startswith("https"): continue
            return (0, attempt)
        except Exception:
            if attempt == u and not url.startswith("https"): continue
            return (0, attempt)
    return (0, url)

def main():
    full = "--full" in sys.argv
    data = json.load(urllib.request.urlopen(DATA_URL, timeout=30))
    sites = {}
    for p in data["pages"]:
        for it in p["items"]:
            s = it.get("site")
            if s and domain(s) and domain(s) not in sites: sites[domain(s)] = s
    old = {}
    if os.path.exists(OUT) and not full:
        try: old = json.load(open(OUT)).get("sites", {})
        except Exception: old = {}
    todo = {d: u for d, u in sites.items() if full or d not in old}
    print(f"{len(sites)} sites, probing {len(todo)}", flush=True)
    out = dict(old); done = 0; t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as ex:
        futs = {ex.submit(probe, u): d for d, u in todo.items()}
        for f in concurrent.futures.as_completed(futs):
            d = futs[f]
            try: fr, final = f.result()
            except Exception: fr, final = 0, sites[d]
            out[d] = {"f": fr, "u": final}
            done += 1
            if done % 100 == 0: print(f"  {done}/{len(todo)}  {time.time()-t0:.0f}s", flush=True)
    out = {d: out[d] for d in sorted(out) if d in sites}
    json.dump({"generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "count": len(out),
               "frameable": sum(1 for v in out.values() if v["f"]), "sites": out}, open(OUT, "w"), separators=(",", ":"))
    print(f"wrote {OUT}: {sum(1 for v in out.values() if v['f'])}/{len(out)} frameable in {time.time()-t0:.0f}s")

if __name__ == "__main__": main()
