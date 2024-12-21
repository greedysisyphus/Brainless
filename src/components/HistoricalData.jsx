import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getHistoricalData, saveSandwichData } from '../utils/forecastService';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export function HistoricalData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ ham: '', salami: '' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const endDate = dayjs();
        const startDate = endDate.subtract(3, 'month');
        
        console.log('Fetching data from:', startDate.format('YYYY-MM-DD'), 'to:', endDate.format('YYYY-MM-DD'));
        
        const historicalData = await getHistoricalData(startDate, endDate);
        console.log('Fetched data:', historicalData);
        setData(historicalData);
      } catch (error) {
        console.error('Error loading historical data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleEdit = (record) => {
    setEditingId(record.date);
    setEditValues({
      ham: record.sandwichCount?.ham || '',
      salami: record.sandwichCount?.salami || ''
    });
  };

  const handleSave = async () => {
    try {
      await saveSandwichData({
        ham: parseInt(editValues.ham) || 0,
        salami: parseInt(editValues.salami) || 0
      }, dayjs(editingId));

      // 重新載入數據
      const endDate = dayjs();
      const startDate = endDate.subtract(3, 'month');
      const historicalData = await getHistoricalData(startDate, endDate);
      setData(historicalData);
      setEditingId(null);
    } catch (error) {
      console.error('Error saving sandwich data:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ ham: '', salami: '' });
  };

  if (loading) return (
    <div className="text-text-secondary text-center py-4">載入中...</div>
  );

  if (data.length === 0) {
    return (
      <div className="text-text-secondary text-center py-4">
        無歷史數據
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">歷史數據</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-surface">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">日期</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">出境人數</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">火腿三明治</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">臘腸三明治</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {data.map(record => (
              <tr key={record.date} className="hover:bg-purple-500/5 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-300">
                  {dayjs(record.date).format('YYYY/MM/DD')}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-300">
                  {record.passengerCount?.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-300">
                  {editingId === record.date ? (
                    <input
                      type="number"
                      value={editValues.ham}
                      onChange={(e) => setEditValues(prev => ({ ...prev, ham: e.target.value }))}
                      className="input-field w-24 text-right"
                      min="0"
                    />
                  ) : (
                    record.sandwichCount?.ham?.toLocaleString() || '-'
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-300">
                  {editingId === record.date ? (
                    <input
                      type="number"
                      value={editValues.salami}
                      onChange={(e) => setEditValues(prev => ({ ...prev, salami: e.target.value }))}
                      className="input-field w-24 text-right"
                      min="0"
                    />
                  ) : (
                    record.sandwichCount?.salami?.toLocaleString() || '-'
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {editingId === record.date ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleSave}
                        className="p-1 text-green-400 hover:text-green-300 transition-colors"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(record)}
                      className="p-1 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-purple-500/5">
            <tr>
              <td className="px-4 py-3 text-sm font-semibold text-gray-300">平均</td>
              <td className="px-4 py-3 text-sm text-right text-gray-300">
                {Math.round(data.reduce((sum, record) => sum + (record.passengerCount || 0), 0) / data.length).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-300">
                {Math.round(data.reduce((sum, record) => sum + (record.sandwichCount?.ham || 0), 0) / data.length).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-300">
                {Math.round(data.reduce((sum, record) => sum + (record.sandwichCount?.salami || 0), 0) / data.length).toLocaleString()}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
} 