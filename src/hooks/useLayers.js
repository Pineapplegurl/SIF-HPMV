import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/config';

// Calques de fallback si l'API ne répond pas
const FALLBACK_LAYERS = [
  { name: "Situation actuelle", imageUrl: "/SIF-V6-SIF-EA.png", visible: true, opacity: 1, zIndex: 0 },
  { name: "Phase 1", imageUrl: "/SIF-V6-PHASE1.png", visible: true, opacity: 0.6, zIndex: 1 },
  { name: "Phase 1 pose", imageUrl: "/SIF-V3-Phase1 Pose.png", visible: true, opacity: 0.6, zIndex: 2 },
  { name: "Phase 1 dépose", imageUrl: "/SIF-V3-Phase1Dépose.png", visible: true, opacity: 0.6, zIndex: 3 },
  { name: "Phase 2", imageUrl: "/SIF-V3-Phase2.png", visible: true, opacity: 0.6, zIndex: 4 },
  { name: "Phase 2 pose", imageUrl: "/SIF-V3-Phase2Pose.png", visible: true, opacity: 0.6, zIndex: 5 },
  { name: "Phase 2 dépose", imageUrl: "/SIF-V3-Phase2Depose.png", visible: true, opacity: 0.6, zIndex: 6 }
];

// Hook personnalisé pour gérer les calques dynamiques
export const useLayers = () => {
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLayers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/layers/public`);
      
      if (response.ok) {
        const dynamicLayers = await response.json();
        
        // Si aucun calque dynamique n'existe, initialiser automatiquement
        if (dynamicLayers.length === 0) {
          console.log('Aucun calque trouvé, initialisation automatique...');
          const initResponse = await fetch(`${API_BASE_URL}/api/layers/auto-init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (initResponse.ok) {
            // Refetch après initialisation
            const retryResponse = await fetch(`${API_BASE_URL}/api/layers/public`);
            if (retryResponse.ok) {
              const initializedLayers = await retryResponse.json();
              setLayers(initializedLayers.length > 0 ? initializedLayers : FALLBACK_LAYERS);
            } else {
              setLayers(FALLBACK_LAYERS);
            }
          } else {
            setLayers(FALLBACK_LAYERS);
          }
        } else {
          setLayers(dynamicLayers);
        }
      } else {
        console.warn('Erreur API calques, utilisation fallback');
        setLayers(FALLBACK_LAYERS);
      }
    } catch (err) {
      console.error('Erreur fetch calques:', err);
      setLayers(FALLBACK_LAYERS);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLayers();
  }, [fetchLayers]);

  return { layers, loading, error, refetch: fetchLayers };
};

// Hook pour les calques admin avec toutes les fonctionnalités
export const useAdminLayers = () => {
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLayers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/layers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLayers(data);
        setError(null);
      } else if (response.status === 401 || response.status === 403) {
        // Fallback vers les calques publics si pas d'auth
        const publicResponse = await fetch(`${API_BASE_URL}/api/layers/public`);
        const publicData = await publicResponse.json();
        setLayers(publicData);
      } else {
        throw new Error('Erreur lors du chargement des calques');
      }
    } catch (err) {
      console.error('Erreur admin layers:', err);
      setError(err.message);
      // Fallback vers les calques statiques
      setLayers(FALLBACK_LAYERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayers();
  }, []);

  return { layers, loading, error, refetch: fetchLayers };
};

export default useLayers;