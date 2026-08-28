# 快速執行指南

## 獲取 D11-D18 所有登機門的資料

### 方法 1: 使用虛擬環境（推薦）

```bash
cd scripts/scraper

# 建立虛擬環境
python3 -m venv venv

# 啟動虛擬環境
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate     # Windows

# 安裝依賴
pip install -r requirements.txt

# 執行腳本獲取所有登機門的資料
python3 fetch-all-gates.py
```

### 方法 2: 直接執行（如果已安裝依賴）

```bash
cd scripts/scraper
python3 fetch-all-gates.py
```

### 方法 3: 使用 Python 內聯腳本

```bash
cd scripts/scraper
python3 -c "
import sys, json, os
sys.path.insert(0, '.')
from flight_scraper import TaoyuanAirportFlightScraper

scraper = TaoyuanAirportFlightScraper(delay=0.5)
all_data = scraper.get_all_gates()

os.makedirs('../../data', exist_ok=True)
with open('../../data/flight-data-all.json', 'w', encoding='utf-8') as f:
    json.dump(all_data, f, ensure_ascii=False, indent=2)

for gate_data in all_data:
    if 'error' not in gate_data:
        with open(f'../../data/flight-data-{gate_data[\"gate\"]}.json', 'w', encoding='utf-8') as f:
            json.dump(gate_data, f, ensure_ascii=False, indent=2)

print('✅ 完成！資料已儲存到 data/ 目錄')
"
```

## 輸出檔案

執行後會在 `data/` 目錄生成：

- `flight-data-all.json` - 所有登機門的完整資料
- `flight-data-D11.json` - D11 登機門的資料
- `flight-data-D12.json` - D12 登機門的資料
- ... (D13-D18)
- `flight-data-summary.json` - 摘要資訊

## 如果遇到依賴問題

```bash
# 安裝依賴
pip3 install requests beautifulsoup4 lxml

# 或使用 pip
pip install requests beautifulsoup4 lxml
```
