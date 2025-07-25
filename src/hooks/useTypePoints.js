// src/hooks/useTypePoints.js
import { useEffect, useState } from 'react';

export const useTypePoints = () => {
  const [typePoints, setTypePoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTypePoints = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/type-points', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      setTypePoints(data);
    } catch (err) {
      console.error("Erreur lors du chargement des points de type BTS/GSMR", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypePoints();
  }, []);

  return { typePoints, loading, refetch: fetchTypePoints };
};