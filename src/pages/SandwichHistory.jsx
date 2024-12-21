import { HistoricalData } from '../components/HistoricalData';

function SandwichHistory() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-surface rounded-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">三明治銷售記錄</h2>
          <HistoricalData />
        </div>
      </div>
    </div>
  );
}

export default SandwichHistory; 