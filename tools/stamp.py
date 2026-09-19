#!/usr/bin/env python3
"""Cache-bust: rewrite every local script/stylesheet URL in index.html to ?v=<UTC stamp>.
Run before committing (`python3 tools/stamp.py`) so browsers fetch fresh files after each deploy."""
import re, time, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(root, "index.html")
stamp = time.strftime("%Y%m%d%H%M", time.gmtime())
s = open(p).read()
s2 = re.sub(r'((?:src|href)="(?:js/[^"?]+\.js|css/[^"?]+\.css))(?:\?v=[^"]*)?"', r'\1?v=' + stamp + '"', s)
open(p, "w").write(s2)
print("stamped", len(re.findall(r'\?v=' + stamp, s2)), "urls with v=" + stamp)
