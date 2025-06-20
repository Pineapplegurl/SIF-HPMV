import { useState, useEffect } from 'react';

export function usePkData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/manual-points') 
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false)
     
      })
      .catch((err) => {
        console.error('Erreur de récupération des points manuels :', err);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}