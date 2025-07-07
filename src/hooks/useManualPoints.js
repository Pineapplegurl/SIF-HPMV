import { useEffect, useState } from 'react';
// Exemple sûr de useManualPoints.js
export function useManualPoints() {
  const [manualPoints, setManualPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchManualPoints = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/manual-points");
      const data = await res.json();
      if (Array.isArray(data)) {
        setManualPoints(data);
      } else {
        console.error("Erreur: format inattendu", data);
        setManualPoints([]); // fallback
      }
    } catch (err) {
      console.error("Erreur de chargement des points manuels :", err);
      setManualPoints([]); // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManualPoints();
  }, []);

  return { manualPoints, loading, refetch: fetchManualPoints };
}