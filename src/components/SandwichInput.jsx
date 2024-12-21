import { useState } from 'react';
import dayjs from 'dayjs';
import { saveSandwichData } from '../utils/forecastService';

export function SandwichInput() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [counts, setCounts] = useState({ ham: '', salami: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await saveSandwichData({
        ham: parseInt(counts.ham) || 0,
        salami: parseInt(counts.salami) || 0
      }, dayjs(date));
      setCounts({ ham: '', salami: '' });
      // 顯示成功訊息
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          日期
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field w-full"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            火腿三明治數量
          </label>
          <input
            type="number"
            value={counts.ham}
            onChange={(e) => setCounts(prev => ({ ...prev, ham: e.target.value }))}
            className="input-field w-full"
            placeholder="請輸入數量"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            臘腸三明治數量
          </label>
          <input
            type="number"
            value={counts.salami}
            onChange={(e) => setCounts(prev => ({ ...prev, salami: e.target.value }))}
            className="input-field w-full"
            placeholder="請輸入數量"
            min="0"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? '儲存中...' : '儲存'}
      </button>
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </form>
  );
} 