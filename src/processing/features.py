"""Feature Engineering Module for Spatiotemporal Temperature Forecasting"""

import os
import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors


def build_spatiotemporal_features(
    df: pd.DataFrame,
    n_neighbors: int = 5,
    drop_na_rows: bool = True
) -> pd.DataFrame:
    """
    Build strictly leakage-free spatiotemporal, environmental, and target features.
    """
    df_feat = df.copy()
    df_feat['timestamp'] = pd.to_datetime(df_feat['timestamp'])
    df_feat['year'] = df_feat['timestamp'].dt.year

    # Strict sorting
    df_feat = df_feat.sort_values(by=['tile_id', 'year', 'timestamp']).reset_index(drop=True)

    # 1. Temporal Lags (computed within each tile and year to prevent off-season leakage)
    for k in range(1, 8):
        df_feat[f'lag_{k}'] = df_feat.groupby(['tile_id', 'year'])['temperature'].shift(k)

    # 2. Rolling features over past observations (closed='left' equivalent using explicit lags)
    # Rolling 3-day statistics
    l1 = df_feat['lag_1'].values
    l2 = df_feat['lag_2'].values
    l3 = df_feat['lag_3'].values
    mean3 = (l1 + l2 + l3) / 3.0
    df_feat['rolling_mean_3'] = mean3
    df_feat['rolling_min_3'] = np.minimum(np.minimum(l1, l2), l3)
    df_feat['rolling_max_3'] = np.maximum(np.maximum(l1, l2), l3)
    df_feat['rolling_std_3'] = np.sqrt(np.maximum(0.0, ((l1 - mean3)**2 + (l2 - mean3)**2 + (l3 - mean3)**2) / 2.0))

    # Rolling 7-day statistics
    lags7_arr = np.column_stack([df_feat[f'lag_{k}'].values for k in range(1, 8)])
    df_feat['rolling_mean_7'] = np.mean(lags7_arr, axis=1)
    df_feat['rolling_min_7'] = np.min(lags7_arr, axis=1)
    df_feat['rolling_max_7'] = np.max(lags7_arr, axis=1)
    df_feat['rolling_std_7'] = np.std(lags7_arr, axis=1, ddof=1)

    # 3. Cyclic Calendar Features
    day_of_year = df_feat['timestamp'].dt.dayofyear
    day_of_month = df_feat['timestamp'].dt.day
    day_of_week = df_feat['timestamp'].dt.dayofweek
    month = df_feat['timestamp'].dt.month

    df_feat['doy_sin'] = np.sin(2 * np.pi * day_of_year / 365.25)
    df_feat['doy_cos'] = np.cos(2 * np.pi * day_of_year / 365.25)
    df_feat['dom_sin'] = np.sin(2 * np.pi * day_of_month / 31.0)
    df_feat['dom_cos'] = np.cos(2 * np.pi * day_of_month / 31.0)
    df_feat['dow_sin'] = np.sin(2 * np.pi * day_of_week / 7.0)
    df_feat['dow_cos'] = np.cos(2 * np.pi * day_of_week / 7.0)
    df_feat['month'] = month

    # 4. Environmental Derived Features
    df_feat['temp_2m_range'] = df_feat['temperature_2m_max'] - df_feat['temperature_2m_min']
    df_feat['apparent_temp_range'] = df_feat['apparent_temperature_max'] - df_feat['apparent_temperature_min']

    # 5. Spatial Neighbor Features (Strictly using lag_1 neighbor temperatures to prevent leakage)
    # Precompute KNN graph for unique coordinate configurations
    dates_grouped = df_feat.groupby('timestamp', sort=True)
    spatial_results = []
    
    # Identify unique coordinate grid signatures
    grid_cache = {}
    
    for date, grp in dates_grouped:
        grp_sorted = grp.sort_values('tile_id')
        n_pts = len(grp_sorted)
        coords = grp_sorted[['latitude', 'longitude']].values
        
        # Cache key by coordinate grid shape and first coordinate
        cache_key = (n_pts, round(coords[0, 0], 5), round(coords[0, 1], 5))
        if cache_key not in grid_cache:
            coords_rad = np.radians(coords)
            k = min(n_neighbors, n_pts - 1)
            knn = NearestNeighbors(n_neighbors=k + 1, metric='haversine').fit(coords_rad)
            dist, idx = knn.kneighbors(coords_rad)
            dist, idx = dist[:, 1:], idx[:, 1:]
            inv_d = 1.0 / np.maximum(dist, 1e-6)
            weights = inv_d / np.sum(inv_d, axis=1, keepdims=True)
            grid_cache[cache_key] = (idx, weights)
            
        idx, weights = grid_cache[cache_key]
        l1_vals = grp_sorted['lag_1'].values
        nbr_temps = l1_vals[idx]
        
        mean_nbr = np.nanmean(nbr_temps, axis=1)
        weighted_nbr = np.nansum(nbr_temps * weights, axis=1)
        min_nbr = np.nanmin(nbr_temps, axis=1)
        max_nbr = np.nanmax(nbr_temps, axis=1)
        
        date_df = pd.DataFrame({
            'timestamp': grp_sorted['timestamp'].values,
            'tile_id': grp_sorted['tile_id'].values,
            'spatial_nbr_lag1_mean': mean_nbr,
            'spatial_nbr_lag1_weighted': weighted_nbr,
            'spatial_nbr_lag1_min': min_nbr,
            'spatial_nbr_lag1_max': max_nbr
        })
        spatial_results.append(date_df)

    df_spatial = pd.concat(spatial_results, ignore_index=True)
    df_feat = df_feat.merge(df_spatial, on=['timestamp', 'tile_id'], how='left')

    # Spatial Anomaly Features (Leakage-safe relative features using lag_1)
    df_feat['tile_spatial_anomaly_lag1'] = df_feat['lag_1'] - df_feat.groupby('timestamp')['lag_1'].transform('mean')
    df_feat['spatial_nbr_diff_lag1'] = df_feat['spatial_nbr_lag1_mean'] - df_feat['lag_1']

    # Macro Weather Delta (Day-over-day change in macro 2m temperature)
    df_feat['macro_temp_2m_delta'] = df_feat['temperature_2m_mean'] - df_feat.groupby(['tile_id', 'year'])['temperature_2m_mean'].shift(1)

    # 6. Target Variables: Absolute next-day temperature and Delta target (T_{t+1} - T_t)
    df_feat['target_t_plus_1'] = df_feat.groupby(['tile_id', 'year'])['temperature'].shift(-1)
    df_feat['target_delta_t_plus_1'] = df_feat['target_t_plus_1'] - df_feat['temperature']

    if drop_na_rows:
        # Drop rows where lag features (lag_7) or next-day target are not available
        df_feat = df_feat.dropna(subset=['lag_7', 'rolling_mean_7', 'spatial_nbr_lag1_mean', 'target_t_plus_1', 'macro_temp_2m_delta']).reset_index(drop=True)

    # Format timestamp as string
    df_feat['timestamp'] = pd.to_datetime(df_feat['timestamp']).dt.strftime('%Y-%m-%d')

    return df_feat


def generate_feature_dataset(
    input_path: str = "data/processed/cleaned_data.csv",
    output_path: str = "data/processed/features.csv"
) -> pd.DataFrame:
    """Generate and save feature engineered dataset."""
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    df_cleaned = pd.read_csv(input_path)
    df_features = build_spatiotemporal_features(df_cleaned, drop_na_rows=True)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df_features.to_csv(output_path, index=False)
    return df_features
