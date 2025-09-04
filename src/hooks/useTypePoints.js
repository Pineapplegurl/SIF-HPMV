import { API_BASE_URL } from '../utils/config';
// src/hooks/useTypePoints.js
import { useEffect, useState } from 'react';

export const useTypePoints = () => {
  const [typePoints, setTypePoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTypePoints = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/type-points`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!res.ok) {
        console.error('useTypePoints: API returned', res.status);
        const text = await res.text().catch(() => null);
        console.debug('useTypePoints: response text:', text);
        setTypePoints([]);
        return [];
      }

      const data = await res.json();
      console.log(`useTypePoints: fetched ${Array.isArray(data) ? data.length : 0} items`);
      if (Array.isArray(data) && data.length > 0) {
        console.debug('useTypePoints: sample items:', data.slice(0, 5));
      }

      // Normalisation des clés d'état : accepte plusieurs variantes de nommage
      const normalized = (Array.isArray(data) ? data : []).map(item => {
        const Etats = item.Etats ?? item.Etat ?? item.etat ?? item.ETATS ?? item.state ?? item.State ?? item['Etats '] ?? '';
        return { ...item, Etats };
      });

      // Debug after normalization
      if (normalized.length > 0) {
        const foundEtats = [...new Set(normalized.map(p => p.Etats).filter(Boolean))];
        console.log('useTypePoints: États normalisés trouvés:', foundEtats);
      }

      setTypePoints(normalized);
      return normalized;
    } catch (err) {
      console.error('Erreur lors du chargement des points de type BTS/GSMR', err);
      setTypePoints([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypePoints();
  }, []);

  return { typePoints, loading, refetch: fetchTypePoints };
};