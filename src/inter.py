import pandas as pd
import numpy as np
from scipy.interpolate import interp1d
import matplotlib.pyplot as plt
import json
import os

os.makedirs("public", exist_ok=True)

# Données complètes fournies
pk_values = list(range(0, 23))
latitudes = [
    48.92583, 48.92286557, 48.9150499, 48.90705153, 48.8997104, 48.89231552,
    48.88569814, 48.87803542, 48.87115721, 48.86410752, 48.8566637,
    48.8500472, 48.8425254, 48.83427843, 48.82818996, 48.81984585,
    48.81125853, 48.80483008, 48.79744409, 48.78903207, 48.78078777,
    48.77297322, 48.76429077
]
longitudes = [
    4.354597, 4.35203494, 4.34539673, 4.33925955, 4.33143987, 4.32384307,
    4.3149569, 4.30814869, 4.29943159, 4.29094741, 4.2834279,
    4.27417981, 4.2667444, 4.26382827, 4.25381561, 4.249732,
    4.24929677, 4.24086452, 4.23309868, 4.22932642, 4.22404401,
    4.21814174, 4.21521201
]

# Création du DataFrame
data = pd.DataFrame({
    'pk': pk_values,
    'latitude': latitudes,
    'longitude': longitudes
})

# Interpolation cubique
f_lat = interp1d(data['pk'], data['latitude'], kind='cubic')
f_lon = interp1d(data['pk'], data['longitude'], kind='cubic')

# Interpolation tous les 0.1 km
pk_interp = np.arange(data['pk'].min(), data['pk'].max(), 0.1)
lat_interp = f_lat(pk_interp)
lon_interp = f_lon(pk_interp)

# Sauvegarde JSON pour usage avec React ou autre
result = [{"pk": float(pk), "latitude": float(lat), "longitude": float(lon)}
          for pk, lat, lon in zip(pk_interp, lat_interp, lon_interp)]
with open("public/interpolated_coords.json", "w") as f:
    json.dump(result, f, indent=2)

# Visualisation : Latitude en fonction du PK
plt.figure(figsize=(10, 6))
plt.plot(data['pk'], data['latitude'], 'o', label='Points originaux')
plt.plot(pk_interp, lat_interp, '-', label='Interpolé (chaque 0.1 km)')
plt.xlabel('PK (Point Kilométrique)')
plt.ylabel('Latitude')
plt.title('Interpolation de la latitude en fonction du PK (ligne 6000)')
plt.legend()
plt.grid(True)
plt.show()