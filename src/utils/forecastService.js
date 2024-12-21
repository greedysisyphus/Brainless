import { db } from './firebase';
import { collection, setDoc, doc, query, where, getDocs, orderBy } from 'firebase/firestore';
import dayjs from 'dayjs';

export async function saveForecastData(passengerCount, date) {
  try {
    const docId = date.format('YYYY-MM-DD');
    await setDoc(doc(db, 'forecasts', docId), {
      date: docId,
      passengerCount,
      timestamp: date.valueOf()
    });
  } catch (error) {
    console.error('Error saving forecast:', error);
    throw error;
  }
}

export async function saveSandwichData(counts, date) {
  try {
    const docId = date.format('YYYY-MM-DD');
    await setDoc(doc(db, 'sandwiches', docId), {
      date: docId,
      counts: {
        ham: counts.ham || 0,
        salami: counts.salami || 0
      },
      timestamp: date.valueOf()
    });
  } catch (error) {
    console.error('Error saving sandwich count:', error);
    throw error;
  }
}

export async function getHistoricalData(startDate, endDate) {
  try {
    console.log('Getting historical data...');
    console.log('Start date:', startDate.format('YYYY-MM-DD'));
    console.log('End date:', endDate.format('YYYY-MM-DD'));

    // 獲取預報數據
    const forecastQuery = query(
      collection(db, 'forecasts'),
      where('timestamp', '>=', startDate.valueOf()),
      where('timestamp', '<=', endDate.valueOf()),
      orderBy('timestamp', 'desc')
    );
    
    console.log('Executing forecast query...');
    const forecastDocs = await getDocs(forecastQuery);
    console.log('Found forecast documents:', forecastDocs.size);

    const forecasts = {};
    forecastDocs.forEach(doc => {
      const data = doc.data();
      console.log('Forecast document:', data);
      forecasts[data.date] = {
        date: data.date,
        passengerCount: data.passengerCount,
        timestamp: data.timestamp
      };
    });

    // 獲取三明治數據
    const sandwichQuery = query(
      collection(db, 'sandwiches'),
      where('timestamp', '>=', startDate.valueOf()),
      where('timestamp', '<=', endDate.valueOf()),
      orderBy('timestamp', 'desc')
    );

    console.log('Executing sandwich query...');
    const sandwichDocs = await getDocs(sandwichQuery);
    console.log('Found sandwich documents:', sandwichDocs.size);

    sandwichDocs.forEach(doc => {
      const data = doc.data();
      console.log('Sandwich document:', data);
      if (forecasts[data.date]) {
        forecasts[data.date].sandwichCount = data.counts;
        if (forecasts[data.date].passengerCount) {
          forecasts[data.date].ratio = {
            ham: data.counts.ham / forecasts[data.date].passengerCount,
            salami: data.counts.salami / forecasts[data.date].passengerCount
          };
        }
      }
    });

    const result = Object.values(forecasts)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    console.log('Final result:', result);
    return result;

  } catch (error) {
    console.error('Error getting historical data:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return [];
  }
}

export function predictSandwichCount(passengerCount, historicalData) {
  if (!historicalData || historicalData.length === 0) {
    return null;
  }

  // 計算平均比例
  const validRecords = historicalData.filter(record => record.ratio);
  if (validRecords.length === 0) {
    return null;
  }

  const averageRatio = {
    ham: validRecords.reduce((sum, record) => sum + record.ratio.ham, 0) / validRecords.length,
    salami: validRecords.reduce((sum, record) => sum + record.ratio.salami, 0) / validRecords.length
  };

  return {
    ham: Math.round(passengerCount * averageRatio.ham),
    salami: Math.round(passengerCount * averageRatio.salami)
  };
} 