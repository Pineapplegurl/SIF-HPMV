import pandas as pd
import numpy as np
from scipy.interpolate import interp1d
import matplotlib.pyplot as plt
import json

# Charger les données
data = pd.read_csv('/coordonnees.csv')

# Créer les fonctions d'interpolation
f_lat = interp1d(data['pk'], data['latitude'], kind='linear')
f_lon = interp1d(data['pk'], data['longitude'], kind='linear')

# Créer les points intermédiaires tous les 0.1 km
pk_interp = np.arange(data['pk'].min(), data['pk'].max(), 0.1)
lat_interp = f_lat(pk_interp)
lon_interp = f_lon(pk_interp)

# Sauvegarde en JSON
result = [{"pk": float(pk), "latitude": float(lat), "longitude": float(lon)} for pk, lat, lon in zip(pk_interp, lat_interp, lon_interp)]
with open("interpolated_coords.json", "w") as f:
    json.dump(result, f, indent=2)

# Visualisation
plt.plot(data['longitude'], data['latitude'], 'ro', label='Données originales')
plt.plot(lon_interp, lat_interp, 'b-', label='Interpolées')
plt.xlabel('Longitude')
plt.ylabel('Latitude')
plt.legend()
plt.title('Interpolation des coordonnées (PK)')
plt.grid(True)
plt.show()