#!/usr/bin/env python3
"""
用 POS「交易紀錄報表」校正某家店的壓力窗（stores.js 的 stressWindow）。

營業資料不進 repo（repo 是公開的）：報表放在 sales/（已 gitignore）或任何本機路徑。

    pip install openpyxl
    python3 scripts/calibrate-store.py --gates 5-18 sales/*.xlsx

航班與每日 T2 預報從 Firestore 公開讀取，只看已有 D5–D18 完整資料的日子（2026-09-08 起）。
輸出只有相關係數與建議的窗，不會改任何檔案。
"""
import argparse
import collections
import datetime as dt
import json
import re
import statistics as st
import urllib.request

import openpyxl

DOC_URL = "https://firestore.googleapis.com/v1/projects/brainless-schedule/databases/(default)/documents/flightData/{}"
FIRST_FULL_DAY = dt.date(2026, 9, 8)  # 之前爬蟲只存 D11–D18
OPEN_BIN, CLOSE_BIN = 5 * 4, 22 * 4  # 營業 05:00–22:00，15 分一格


def firestore_doc(doc_id):
    try:
        return json.load(urllib.request.urlopen(DOC_URL.format(doc_id), timeout=15)).get("fields", {})
    except Exception:
        return None


def unwrap(value):
    kind, inner = next(iter(value.items()))
    if kind == "mapValue":
        return {k: unwrap(v) for k, v in inner.get("fields", {}).items()}
    if kind == "arrayValue":
        return [unwrap(v) for v in inner.get("values", [])]
    return int(inner) if kind == "integerValue" else inner


def load_transactions(paths):
    """單號去重（報表區間會重疊），只留「銷售已結」。"""
    tx = {}
    for path in paths:
        sheet = openpyxl.load_workbook(path, read_only=True, data_only=True)["交易紀錄"]
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if row[0] and row[4] and row[8] == "銷售已結":
                tx[row[4]] = dt.datetime.strptime(row[0], "%Y-%m-%d %H:%M")
    return tx.values()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", help="交易紀錄報表 .xlsx")
    ap.add_argument("--gates", default="5-18", help="店涵蓋的 D 區門，例：5-18、11-18")
    args = ap.parse_args()
    lo, hi = map(int, args.gates.split("-"))

    times = list(load_transactions(args.files))
    bins = collections.Counter((t.date(), (t.hour * 60 + t.minute) // 15) for t in times)
    daily = collections.Counter(t.date() for t in times)
    days = sorted(d for d in daily if d >= FIRST_FULL_DAY)

    dep = collections.Counter()
    for d in days:
        fields = firestore_doc(d.isoformat())
        for f in unwrap(fields["flights"]) if fields else []:
            status = str(f.get("status", ""))
            m = re.fullmatch(r"D(\d+)[LR]?", str(f.get("gate", "")))
            if "CANCEL" in status.upper() or "取消" in status or not m or not lo <= int(m.group(1)) <= hi:
                continue
            hh, mm = map(int, f["time"].split(":"))
            dep[(d, (hh * 60 + mm) // 15)] += 1

    pax = unwrap(firestore_doc("_pax_t2_daily")["days"]) if firestore_doc("_pax_t2_daily") else {}
    paired = [(daily[d], pax[d.isoformat()]) for d in sorted(daily) if d.isoformat() in pax]
    print(f"交易 {len(times)} 筆，{min(daily)}～{max(daily)}；壓力窗分析用 {len(days)} 天")
    if len(paired) >= 3:
        r = st.correlation([c for c, _ in paired], [p for _, p in paired])
        print(f"每日來客 vs T2 預報人數：r={r:.2f}（{len(paired)} 天）")

    def slot_corr(to_min, from_min):
        # 60 分槽 [s, s+4) 格；壓力窗 [起飛-from, 起飛-to] 與槽重疊 ≈ 起飛落在 [s+to, s+4+from)
        a, b = [], []
        for d in days:
            for s in range(OPEN_BIN, CLOSE_BIN - 3):
                a.append(sum(bins[(d, s + k)] for k in range(4)))
                b.append(sum(dep[(d, x)] for x in range(s + to_min // 15, s + 4 + from_min // 15)))
        return st.correlation(a, b)

    results = sorted(
        ((slot_corr(to, fr), fr, to) for to in range(0, 121, 15) for fr in range(to + 15, 181, 15)),
        reverse=True,
    )
    print("\n壓力窗（起飛前 from–to 分）與 60 分槽來客的相關，前 5 名：")
    for r, fr, to in results[:5]:
        print(f"  {fr}–{to}：r={r:.3f}")
    print(f"  對照 預設 60–30：r={slot_corr(30, 60):.3f}")
    # 30 分寬的窗最接近現行規則，差距不到 0.01 時優先選它，避免過度貼合少量資料
    best30 = max((x for x in results if x[1] - x[2] == 30), key=lambda x: x[0])
    print(f"\n建議 stressWindow: {{ fromMin: {best30[1]}, toMin: {best30[2]} }}（r={best30[0]:.3f}）")


if __name__ == "__main__":
    main()
