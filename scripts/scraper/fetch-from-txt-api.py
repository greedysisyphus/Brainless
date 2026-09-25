#!/usr/bin/env python3
"""
從桃園機場官方文字檔 API 獲取航班資料
使用: https://www.taoyuan-airport.com/uploads/flightx/a_flight_v4.txt
"""

import requests
import json
import os
from datetime import datetime, timezone
from typing import List, Dict, Optional
import re
from collections import defaultdict
import urllib3

# 禁用 SSL 警告（如果使用 verify=False）
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class TaoyuanAirportTxtAPIScraper:
    """桃園機場文字檔 API 爬蟲"""
    
    TXT_API_URL = "https://www.taoyuan-airport.com/uploads/flightx/a_flight_v4.txt"
    D_GATE_PATTERN = re.compile(r'D\d{1,2}[LR]?')
    
    def __init__(self):
        """初始化爬蟲"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/plain,*/*',
        })
    
    def fetch_flight_data(self, verify_ssl: bool = True) -> str:
        """
        獲取原始文字檔資料
        
        Args:
            verify_ssl: 是否驗證 SSL 證書（預設為 True）
        
        Returns:
            文字檔內容
        """
        try:
            # 如果 SSL 驗證失敗，嘗試禁用驗證
            response = self.session.get(self.TXT_API_URL, timeout=10, verify=verify_ssl)
            response.raise_for_status()
            
            # 嘗試多種編碼方式
            encodings = ['big5', 'utf-8', 'utf-8-sig', 'latin1']
            for encoding in encodings:
                try:
                    response.encoding = encoding
                    text = response.text
                    # 檢查是否成功解碼（簡單檢查：是否包含預期的關鍵字）
                    if 'D11' in text or 'D12' in text or 'A,' in text or 'D,' in text:
                        return text
                except:
                    continue
            
            # 如果所有編碼都失敗，返回原始文字
            return response.text
        except requests.exceptions.SSLError:
            # SSL 驗證失敗，嘗試禁用驗證
            if verify_ssl:
                print('   ⚠️  SSL 證書驗證失敗，嘗試禁用驗證...')
                return self.fetch_flight_data(verify_ssl=False)
            else:
                raise Exception("無法獲取資料：SSL 證書驗證失敗")
        except Exception as e:
            raise Exception(f"無法獲取資料: {str(e)}")
    
    def parse_flight_data(self, text: str) -> List[Dict]:
        """
        解析文字檔資料（D 區全部登機門的離境航班）

        門的範圍由前端各店設定決定（src/utils/flightData/stores.js），
        這裡只負責把 D 區整段抓下來，加開分店不用再動爬蟲。

        Args:
            text: 文字檔內容

        Returns:
            解析後的航班資料列表
        """
        flights = []
        lines = text.strip().split('\n')
        
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue
            
            # 解析 CSV 格式（使用逗號分隔）
            # 格式：航廈,類型,航空公司代碼,航空公司名稱,航班號,登機門,日期,時間,實際日期,實際時間,機場代碼,城市,狀態,機型,...
            parts = [p.strip() for p in line.split(',')]
            
            if len(parts) < 13:
                continue
            
            try:
                terminal = parts[0]  # 航廈（1或2）
                flight_type = parts[1]  # A=抵達, D=出發
                airline_code = parts[2]  # 航空公司代碼
                airline_name = parts[3].strip()  # 航空公司名稱（可能有編碼問題）
                flight_number = parts[4].strip()  # 航班號
                gate = parts[5].strip()  # 登機門
                scheduled_date = parts[6]  # 預定日期
                scheduled_time = parts[7]  # 預定時間
                actual_date = parts[8] if len(parts) > 8 else scheduled_date  # 實際日期
                actual_time = parts[9] if len(parts) > 9 else scheduled_time  # 實際時間
                airport_code = parts[10].strip() if len(parts) > 10 else ''  # 機場代碼
                city_en = parts[11].strip() if len(parts) > 11 else ''  # 城市英文名稱
                city_zh = parts[12].strip() if len(parts) > 12 else ''  # 城市中文名稱（可能有編碼問題）
                status = parts[13].strip() if len(parts) > 13 else ''  # 狀態
                aircraft = parts[14].strip() if len(parts) > 14 else ''  # 機型
                
                # 優先使用中文城市名稱，如果沒有則使用英文
                city = city_zh if city_zh and not city_zh.startswith('') else city_en
                
                # 只處理 D 區登機門（D1–D18，含 L／R）
                if not self.D_GATE_PATTERN.fullmatch(gate):
                    continue
                
                # 只處理離境（出發）航班，忽略抵達航班
                if flight_type != 'D':
                    continue
                
                # 建立航班代碼（航空公司代碼 + 航班號）
                flight_code = f"{airline_code}{flight_number}".strip()
                
                # 解析日期時間
                try:
                    # 日期格式：2026/01/31，時間格式：00:05:00
                    date_match = re.match(r'(\d{4})/(\d{1,2})/(\d{1,2})', scheduled_date)
                    time_match = re.match(r'(\d{1,2}):(\d{2}):(\d{2})', scheduled_time)
                    
                    if date_match and time_match:
                        year, month, day = map(int, date_match.groups())
                        hour, minute, _ = map(int, time_match.groups())
                        
                        dt = datetime(year, month, day, hour, minute)
                        
                        flight_data = {
                            'terminal': terminal,
                            'type': 'departure',  # 只處理離境航班
                            'airline_code': airline_code,
                            'airline_name': airline_name,
                            'flight_code': flight_code,
                            'flight_number': flight_number,
                            'gate': gate,
                            'scheduled_datetime': dt,
                            'scheduled_date': scheduled_date,
                            'scheduled_time': scheduled_time,
                            'actual_date': actual_date,
                            'actual_time': actual_time,
                            'airport_code': airport_code,
                            'city': city,
                            'status': status.strip(),
                            'aircraft': aircraft.strip(),
                            'raw_line': line_num
                        }
                        
                        flights.append(flight_data)
                except ValueError as e:
                    # 日期時間解析失敗，跳過這筆資料
                    continue
                    
            except Exception as e:
                # 解析失敗，跳過這筆資料
                continue
        
        return flights


PAX_FORECAST_URL = "https://www.taoyuan-airport.com/uploads/fos/{name}.xls"


def parse_t2_departure_pax(content: bytes) -> Optional[Dict[str, List[int]]]:
    """從官方「航班運量整點人數預報表」取出第二航廈每小時出發、轉機離站人數（各 24 格），格式不對回 None。"""
    import xlrd
    sheet = xlrd.open_workbook(file_contents=content).sheet_by_index(0)
    for r in range(sheet.nrows - 1):
        titles = sheet.row_values(r)
        t2 = next((c for c, v in enumerate(titles) if '第二航廈' in str(v)), None)
        if t2 is None:
            continue
        headers = sheet.row_values(r + 1)
        cols = {name: next((c for c in range(t2, len(headers)) if headers[c] == name), None) for name in ('出發', '轉機離站')}
        if None in cols.values():
            return None
        hourly = {'departure': {}, 'transfer': {}}
        for rr in range(r + 2, sheet.nrows):
            m = re.match(r'(\d{2}):00', str(sheet.cell_value(rr, t2)))
            if not m:
                continue
            for key, name in (('departure', '出發'), ('transfer', '轉機離站')):
                v = sheet.cell_value(rr, cols[name])
                if isinstance(v, float):
                    hourly[key][int(m.group(1))] = int(v)
        if any(len(v) != 24 for v in hourly.values()):
            return None
        return {key: [v[h] for h in range(24)] for key, v in hourly.items()}
    return None


def count_t2_departures_by_hour(text: str) -> Dict[str, List[int]]:
    """
    第二航廈每小時起飛班數（全部登機門，含 C 區；共掛班號只算一次，取消不算）。
    前端拿來把整點人數攤到每一班：該小時人數 ÷ 該小時 T2 班數。
    """
    counts = defaultdict(lambda: [0] * 24)
    seen = set()
    for line in text.splitlines():
        p = [x.strip() for x in line.split(',')]
        if len(p) < 14 or p[0] != '2' or p[1] != 'D':
            continue
        if 'CANCEL' in p[13].upper() or '取消' in p[13]:
            continue
        d = re.match(r'(\d{4})/(\d{1,2})/(\d{1,2})$', p[6])
        t = re.match(r'(\d{1,2}):\d{2}', p[7])
        if not d or not t:
            continue
        key = (p[6], p[7], p[5], p[10])
        if key in seen:
            continue
        seen.add(key)
        date_key = '%04d-%02d-%02d' % tuple(map(int, d.groups()))
        counts[date_key][int(t.group(1))] += 1
    return dict(counts)


def fetch_t2_departure_pax(session, date_key: str) -> Optional[Dict]:
    """優先抓當天早上發布的更新版；抓不到或解析失敗回 None，不影響航班資料。"""
    base = date_key.replace('-', '_')
    for name, is_update in ((f'{base}_update', True), (base, False)):
        try:
            res = session.get(PAX_FORECAST_URL.format(name=name), timeout=15)
            if res.status_code != 200:
                continue
            hourly = parse_t2_departure_pax(res.content)
            if hourly:
                return {**hourly, "is_update": is_update}
        except Exception as e:
            print(f'   ⚠️  {name}.xls 讀取失敗: {e}')
    return None


PAX_DAILY_DOC_URL = "https://firestore.googleapis.com/v1/projects/brainless-schedule/databases/(default)/documents/flightData/_pax_t2_daily"


def build_pax_daily(session, today, stored: Dict[str, int], near_days: range = range(-1, 3), back_days: int = 30) -> Dict[str, int]:
    """
    忙碌指數用的每日 T2 出發＋轉機總數。官網只留約一個月的預報檔，所以要自己累積：
    近幾天每次都重抓（會出更新版），更早的只補 Firestore 還沒有的日子。
    """
    from datetime import timedelta
    out = {}
    for offset in range(-back_days, near_days.stop):
        date_key = (today + timedelta(days=offset)).isoformat()
        if offset not in near_days and date_key in stored:
            continue
        pax = fetch_t2_departure_pax(session, date_key)
        if pax:
            out[date_key] = sum(pax["departure"]) + sum(pax["transfer"])
    return out


def load_stored_pax_daily(session) -> Dict[str, int]:
    """公開讀取目前 Firestore 已存的日子；讀不到就當作空的（最多多抓幾個檔）。"""
    try:
        res = session.get(PAX_DAILY_DOC_URL, timeout=10)
        if res.status_code != 200:
            return {}
        fields = res.json().get("fields", {}).get("days", {}).get("mapValue", {}).get("fields", {})
        return {k: int(v.get("integerValue", 0)) for k, v in fields.items()}
    except Exception:
        return {}


def format_time_for_display(dt: datetime) -> str:
    """格式化時間為顯示格式"""
    return dt.strftime('%H:%M')


def organize_by_date(flights: List[Dict]) -> Dict:
    """
    按日期組織航班資料，並計算 17:00 前後的班次數量
    相同時間和登機門的航班視為同一班機（共掛班號），只計算一次
    
    Args:
        flights: 航班資料列表
    
    Returns:
        按日期組織的資料字典
    """
    date_data = defaultdict(lambda: {
        "flights": [],
        "summary": {
            "before_17:00": 0,
            "after_17:00": 0
        }
    })
    
    # 使用字典來追蹤已處理的航班（時間 + 登機門作為 key）
    processed_flights = {}  # key: (date_key, time_display, gate), value: flight_entry
    
    for flight in flights:
        dt = flight['scheduled_datetime']
        date_key = dt.strftime('%Y-%m-%d')
        time_display = format_time_for_display(dt)
        gate = flight['gate']
        
        # 使用時間和登機門作為唯一識別（共掛班號會有相同的時間和登機門）
        flight_key = (date_key, time_display, gate)
        
        if flight_key not in processed_flights:
            # 這是第一筆共掛班號，建立航班條目
            flight_entry = {
                "time": time_display,
                "datetime": dt.isoformat(),
                "gate": gate,
                "flight_code": flight['flight_code'],  # 保留第一個航班代碼
                "airline_code": flight['airline_code'],
                "airline_name": flight['airline_name'],
                "type": flight['type'],
                "airport_code": flight['airport_code'],
                "city": flight['city'],
                "status": flight['status'],
                "aircraft": flight['aircraft'],
                "terminal": flight['terminal']
            }
            
            # 只處理離境航班，所以只有 destination
            flight_entry["destination"] = f"{flight['city']} ({flight['airport_code']})".strip()
            
            # 儲存共掛班號的資訊（用於顯示）
            flight_entry["codeshare_flights"] = []  # 其他共掛班號的代碼
            
            processed_flights[flight_key] = flight_entry
            
            # 統計 17:00 前後（只計算一次）
            if dt.hour < 17:
                date_data[date_key]["summary"]["before_17:00"] += 1
            else:
                date_data[date_key]["summary"]["after_17:00"] += 1
        else:
            # 這是共掛班號，只記錄航班代碼
            existing_entry = processed_flights[flight_key]
            if flight['flight_code'] != existing_entry['flight_code']:
                existing_entry["codeshare_flights"].append({
                    "flight_code": flight['flight_code'],
                    "airline_code": flight['airline_code'],
                    "airline_name": flight['airline_name']
                })
    
    # 將處理過的航班加入到對應的日期
    for (date_key, _, _), flight_entry in processed_flights.items():
        date_data[date_key]["flights"].append(flight_entry)
    
    # 對每個日期的航班進行排序
    for date_key in date_data:
        date_data[date_key]["flights"].sort(key=lambda x: (
            x.get("datetime", "") if x.get("datetime") else "9999-12-31T23:59:59"
        ))
    
    return dict(date_data)


if __name__ == '__main__':
    import sys
    
    # 確保 data 目錄存在
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    print('🔍 從桃園機場官方文字檔 API 獲取資料...')
    print(f'   URL: https://www.taoyuan-airport.com/uploads/flightx/a_flight_v4.txt\n')
    
    scraper = TaoyuanAirportTxtAPIScraper()
    
    try:
        # 獲取資料
        print('📥 正在下載資料...', end=' ')
        text_data = scraper.fetch_flight_data()
        print(f'✅ 成功（{len(text_data)} 字元）')
        
        # 解析資料（D 區全部登機門，各店範圍由前端 stores.js 決定）
        print('\n📋 正在解析資料（D 區登機門，含 L／R，僅離境航班）...', end=' ')
        flights = scraper.parse_flight_data(text_data)
        print(f'✅ 找到 {len(flights)} 筆離境航班資料')

        if len(flights) == 0:
            print('\n⚠️  警告：未找到任何 D 區的航班資料')
            print('   請檢查登機門代號是否正確，或資料格式是否變更')
            sys.exit(1)
        
        # 按日期組織
        print('\n📊 按日期組織資料...')
        date_data = organize_by_date(flights)
        t2_flights_by_hour = count_t2_departures_by_hour(text_data)
        
        # 儲存每個日期的資料
        for date_key, formatted_data in date_data.items():
            # 建立格式化顯示
            formatted_display = []
            for flight in formatted_data["flights"]:
                gate = flight.get("gate", "")
                flight_code = flight.get("flight_code", "")
                airline_name = flight.get("airline_name", "")
                airline_code = flight.get("airline_code", "")
                time_str = flight.get("time", "")
                
                # 優先使用航空公司名稱，如果沒有則使用代碼
                airline_display = airline_name.strip() if airline_name.strip() else airline_code
                
                display_str = f"{time_str} : {gate} : {flight_code}"
                if airline_display:
                    display_str += f" ({airline_display})"
                
                formatted_display.append(display_str)
            
            # 建立最終輸出格式
            from datetime import datetime
            output = {
                "date": date_key,
                "flights": formatted_data["flights"],
                "summary": {
                    "total_flights": len(formatted_data["flights"]),
                    "before_17:00": formatted_data["summary"]["before_17:00"],
                    "after_17:00": formatted_data["summary"]["after_17:00"]
                },
                "formatted_display": formatted_display,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # 官方整點人數預報（第二航廈出發），只提前約兩天發布，缺了照樣存航班
            pax = fetch_t2_departure_pax(scraper.session, date_key)
            if pax and date_key in t2_flights_by_hour:
                output["pax_t2"] = {**pax, "flights": t2_flights_by_hour[date_key]}

            # 儲存 JSON 檔案
            date_file = os.path.join(data_dir, f'flight-data-{date_key}.json')
            with open(date_file, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
            
            print(f'✅ 已儲存: flight-data-{date_key}.json')
            print(f'   - 總航班數: {output["summary"]["total_flights"]} 班')
            print(f'   - 17:00 前: {output["summary"]["before_17:00"]} 班')
            print(f'   - 17:00 後: {output["summary"]["after_17:00"]} 班')
            print(f'   - T2 出發＋轉機預報: {sum(pax["departure"]) + sum(pax["transfer"]):,} 人' if pax else '   - T2 出發預報: 無')
            
            # 注意：Firebase 存儲將在 GitHub Actions 中單獨執行
            # 這裡不直接存儲，避免重複存儲和依賴問題
        
        # 忙碌指數：每日總數另存一份，save-to-firebase 以 merge 寫進 flightData/_pax_t2_daily
        from zoneinfo import ZoneInfo
        today = datetime.now(ZoneInfo('Asia/Taipei')).date()
        daily = build_pax_daily(scraper.session, today, load_stored_pax_daily(scraper.session))
        if daily:
            with open(os.path.join(data_dir, 'pax-t2-daily.json'), 'w', encoding='utf-8') as f:
                json.dump({"days": daily}, f, ensure_ascii=False, indent=2)
            print(f'✅ 已儲存: pax-t2-daily.json（{len(daily)} 天）')

        print(f'\n✅ 完成！共處理 {len(flights)} 筆航班資料，儲存到 {len(date_data)} 個日期檔案')
        
    except Exception as e:
        print(f'\n❌ 錯誤: {str(e)}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
