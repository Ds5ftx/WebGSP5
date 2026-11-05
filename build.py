#!/usr/bin/env python3
"""src/ 의 파일을 하나로 묶어 index.html(완결된 단일 페이지)을 만듭니다.
사용법:  python3 build.py
"""
from pathlib import Path
ROOT = Path(__file__).parent
SRC = ROOT / "src"

def main():
    js = "\n".join(p.read_text(encoding="utf-8") for p in sorted(SRC.glob("*.js")))
    html = (SRC / "shell.html").read_text(encoding="utf-8").replace("/*JS*/", js)
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    print("index.html 생성:", len(html.encode("utf-8")) // 1024, "KB")

if __name__ == "__main__":
    main()
