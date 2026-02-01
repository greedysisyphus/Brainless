#!/usr/bin/env python3
"""
測試桃園機場官方網站爬蟲
"""

import sys
import os

# 添加當前目錄到路徑
sys.path.insert(0, os.path.dirname(__file__))

from taoyuan_airport_official_scraper import TaoyuanAirportOfficialScraper

def test_api_endpoints():
    """測試 API 端點檢查"""
    print('🔍 測試 API 端點檢查...')
    scraper = TaoyuanAirportOfficialScraper()
    endpoints = scraper.check_api_endpoints()
    
    print(f'   測試了 {len(endpoints["tested"])} 個端點')
    if endpoints['found']:
        print(f'   ✅ 找到 {len(endpoints["found"])} 個可能的 API 端點')
        for endpoint in endpoints['found']:
            print(f'      - {endpoint["url"]}')
    else:
        print('   ⚠️  未找到公開的 API 端點')
    
    return len(endpoints['found']) > 0

def test_departure_flights():
    """測試獲取出發航班"""
    print('\n📋 測試獲取出發航班...')
    scraper = TaoyuanAirportOfficialScraper()
    
    # 測試獲取 D11 登機門的資料
    result = scraper.get_departure_flights(gate='D11')
    
    if 'error' in result:
        print(f'   ❌ 錯誤: {result["error"]}')
        return False
    
    dep_count = len(result.get('departure', {}).get('data', []))
    print(f'   ✅ 成功獲取 {dep_count} 筆出發航班資料')
    
    if dep_count > 0:
        # 顯示第一筆資料作為範例
        first_flight = result['departure']['data'][0]
        print(f'   範例資料: {first_flight}')
    
    return dep_count > 0

def test_arrival_flights():
    """測試獲取抵達航班"""
    print('\n📋 測試獲取抵達航班...')
    scraper = TaoyuanAirportOfficialScraper()
    
    # 測試獲取 D11 登機門的資料
    result = scraper.get_arrival_flights(gate='D11')
    
    if 'error' in result:
        print(f'   ❌ 錯誤: {result["error"]}')
        return False
    
    arr_count = len(result.get('arrival', {}).get('data', []))
    print(f'   ✅ 成功獲取 {arr_count} 筆抵達航班資料')
    
    if arr_count > 0:
        # 顯示第一筆資料作為範例
        first_flight = result['arrival']['data'][0]
        print(f'   範例資料: {first_flight}')
    
    return arr_count > 0

if __name__ == '__main__':
    print('=' * 60)
    print('桃園機場官方網站爬蟲測試')
    print('=' * 60)
    
    results = []
    
    # 測試 API 端點
    results.append(('API 端點檢查', test_api_endpoints()))
    
    # 測試出發航班
    results.append(('獲取出發航班', test_departure_flights()))
    
    # 測試抵達航班
    results.append(('獲取抵達航班', test_arrival_flights()))
    
    # 顯示測試結果
    print('\n' + '=' * 60)
    print('測試結果總結')
    print('=' * 60)
    
    for test_name, passed in results:
        status = '✅ 通過' if passed else '❌ 失敗'
        print(f'{test_name}: {status}')
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print('\n✅ 所有測試通過！')
        sys.exit(0)
    else:
        print('\n⚠️  部分測試失敗，請檢查錯誤訊息')
        sys.exit(1)
