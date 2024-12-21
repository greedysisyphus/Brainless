import { useState, useEffect } from 'react';
import { WrenchScrewdriverIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { getFlightForecast } from '../utils/flightForecastParser';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { saveForecastData, getHistoricalData, predictSandwichCount } from '../utils/forecastService';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Taipei');

function FlightForecast() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [historicalData, setHistoricalData] = useState([]);
  const [prediction, setPrediction] = useState(null);

  async function loadForecast() {
    try {
      setLoading(true);
      const data = await getFlightForecast();
      setForecast(data);
      setLastUpdated(dayjs().tz('Asia/Taipei'));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadForecast();

    // 設定自動更新
    const checkAndUpdate = () => {
      const now = dayjs().tz('Asia/Taipei');
      let targetTime = now.hour(0).minute(15).second(0); // 設定為 00:15

      // 如果現在時間已經過了今天的 00:15，則目標時間設為明天的 00:15
      if (now.isAfter(targetTime)) {
        targetTime = targetTime.add(1, 'day');
      }

      // 計算距離下次更新的毫秒數
      const msUntilUpdate = targetTime.diff(now);
      console.log(`下次更新時間：${targetTime.format('YYYY-MM-DD HH:mm:ss')}`);
      console.log(`距離下次更新還有 ${msUntilUpdate} 毫秒`);

      // 設定定時器
      const timer = setTimeout(() => {
        loadForecast();
        checkAndUpdate(); // 重新設定下一次更新
      }, msUntilUpdate);

      return () => clearTimeout(timer);
    };

    const cleanup = checkAndUpdate();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (forecast?.today) {
      const todayTotal = calculateTotal(forecast.today);
      saveForecastData(todayTotal, dayjs());
      
      // 獲取歷史數據
      const startDate = dayjs().subtract(30, 'days');
      const endDate = dayjs();
      
      getHistoricalData(startDate, endDate).then(data => {
        setHistoricalData(data);
        
        // 預測明天需要的三明治數量
        const tomorrowTotal = calculateTotal(forecast.tomorrow);
        const predictedCount = predictSandwichCount(tomorrowTotal, data);
        setPrediction(predictedCount);
      });
    }
  }, [forecast]);

  // 計算總計
  const calculateTotal = (data) => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + item.quantity, 0);
  };

  const renderTab = (id, label) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
          ${isActive 
            ? 'bg-purple-500 text-white' 
            : 'text-gray-400 hover:text-gray-300 hover:bg-purple-500/10'
          }`}
      >
        {label}
      </button>
    );
  };

  const renderPrediction = () => {
    if (!prediction) return null;

    return (
      <div className="mt-6 p-4 bg-purple-500/10 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-2">明日三明治預測</h3>
        <div className="space-y-2">
          <p className="text-text-secondary">
            火腿三明治：<span className="text-white font-bold">{prediction.ham}</span> 個
          </p>
          <p className="text-text-secondary">
            臘腸三明治：<span className="text-white font-bold">{prediction.salami}</span> 個
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-[#1e1e2d] rounded-lg">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="animate-spin p-4 rounded-full bg-purple-500/10 mb-6">
              <WrenchScrewdriverIcon className="w-12 h-12 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">載入中...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-[#1e1e2d] rounded-lg">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-full bg-red-500/10 mb-6">
              <WrenchScrewdriverIcon className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-500">
              {error || '無法載入預報數據'}
            </h2>
          </div>
        </div>
      </div>
    );
  }

  const renderForecastTable = (data, title, date) => {
    if (!data) return null;
    const total = calculateTotal(data);
    const fileName = date.format('YYYY_MM_DD') + '.xls';

    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <div className="group relative">
            <InformationCircleIcon 
              className="h-5 w-5 text-purple-400 hover:text-purple-300 transition-colors cursor-help" 
              title={`資料來源：${fileName}`}
            />
            <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-purple-500 text-white text-sm rounded-md whitespace-nowrap shadow-lg z-10">
              資料來源：{fileName}
              <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 border-4 border-transparent border-t-purple-500"></div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full bg-[#1e1e2d]">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">時間</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">出境人數</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {data.map((item) => (
                <tr key={item.time} className="hover:bg-purple-500/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">{item.time}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-300">
                    {item.quantity.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-purple-500/5 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-300">總計</td>
                <td className="px-6 py-4 text-sm text-right text-gray-300">
                  {total.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-surface rounded-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">第二航廈出境人數預報</h2>
              <div className="flex gap-2">
                {renderTab('today', '今日預報')}
                {renderTab('tomorrow', '明日預報')}
              </div>
            </div>
            {lastUpdated && (
              <div className="text-sm text-gray-400 bg-purple-500/10 px-3 py-1 rounded-full">
                最後更新：{lastUpdated.format('YYYY/MM/DD HH:mm:ss')}
              </div>
            )}
          </div>
          <div className="mt-6">
            {activeTab === 'today' && renderForecastTable(
              forecast.today,
              '今日預報',
              dayjs().tz('Asia/Taipei')
            )}
            {activeTab === 'tomorrow' && (
              <>
                {renderForecastTable(
                  forecast.tomorrow,
                  '明日預報',
                  dayjs().tz('Asia/Taipei').add(1, 'day')
                )}
                {renderPrediction()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlightForecast; 