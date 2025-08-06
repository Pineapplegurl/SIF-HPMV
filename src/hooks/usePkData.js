import { useState, useEffect } from 'react';

export function usePkData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/manual-points');
      const data = await res.json();
      setData(data);
    } catch (err) {
      console.error('Erreur de récupération des points manuels :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, refetch: fetchData };
}