import { useEffect, useState } from 'react';

export function useManualPoints() {
  const [manualPoints, setManualPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPoints = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/manual-points');
      const data = await res.json();
      setManualPoints(data);
    } catch (err) {
      console.error("Erreur chargement points manuels :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, []);

  return {
    manualPoints,
    loading,
    refetch: fetchPoints, // fonction accessible depuis PlanViewer
  };
}