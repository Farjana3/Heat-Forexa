"""Data Quality Audit & Preprocessing Module"""

import os
import pandas as pd
import numpy as np


def load_raw_data(filepath: str = "data/raw/temperature_2024_2026.csv") -> pd.DataFrame:
    """Load raw merged temperature and environmental dataset."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Raw data file not found at: {filepath}")
    df = pd.read_csv(filepath)
    return df


def audit_data_quality(df: pd.DataFrame) -> dict:
    """Perform comprehensive data quality audit."""
    df_temp = df.copy()
    df_temp['timestamp'] = pd.to_datetime(df_temp['timestamp'])

    shape = df.shape
    columns = list(df.columns)
    dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
    missing = df.isnull().sum().to_dict()
    total_missing = int(df.isnull().sum().sum())

    exact_duplicates = int(df.duplicated().sum())
    tile_time_duplicates = int(df.duplicated(subset=['tile_id', 'timestamp']).sum())
    coord_time_duplicates = int(df.duplicated(subset=['latitude', 'longitude', 'timestamp']).sum())

    # Spatial checks
    lat_min, lat_max = float(df['latitude'].min()), float(df['latitude'].max())
    lon_min, lon_max = float(df['longitude'].min()), float(df['longitude'].max())
    lat_valid = (-90.0 <= lat_min <= 90.0) and (-90.0 <= lat_max <= 90.0)
    lon_valid = (-180.0 <= lon_min <= 180.0) and (-180.0 <= lon_max <= 180.0)

    unique_tiles = int(df['tile_id'].nunique())
    unique_coords = int(df.groupby(['latitude', 'longitude']).ngroups)
    unique_timestamps = int(df_temp['timestamp'].nunique())
    min_date = str(df_temp['timestamp'].min().date())
    max_date = str(df_temp['timestamp'].max().date())

    # Temporal frequency check
    dates_sorted = df_temp['timestamp'].drop_duplicates().sort_values()
    diffs = dates_sorted.diff().dropna()
    is_daily = bool((diffs.isin([pd.Timedelta(days=1)]) | (diffs > pd.Timedelta(days=1))).all())

    # Temperature stats
    temp_stats = {
        'mean': float(df['temperature'].mean()),
        'std': float(df['temperature'].std()),
        'min': float(df['temperature'].min()),
        '25%': float(df['temperature'].quantile(0.25)),
        '50%': float(df['temperature'].quantile(0.50)),
        '75%': float(df['temperature'].quantile(0.75)),
        'max': float(df['temperature'].max()),
        'outliers_3sigma': int(((df['temperature'] - df['temperature'].mean()).abs() > 3 * df['temperature'].std()).sum())
    }

    # Physical / thermodynamic checks
    physical_checks = {
        'temp_2m_order_valid': bool((df['temperature_2m_min'] <= df['temperature_2m_max']).all() and (df['temperature_2m_min'] <= df['temperature_2m_mean']).all() and (df['temperature_2m_mean'] <= df['temperature_2m_max']).all()),
        'apparent_temp_order_valid': bool((df['apparent_temperature_min'] <= df['apparent_temperature_max']).all() and (df['apparent_temperature_min'] <= df['apparent_temperature_mean']).all() and (df['apparent_temperature_mean'] <= df['apparent_temperature_max']).all()),
        'wind_gust_order_valid': bool((df['wind_speed_10m_max'] <= df['wind_gusts_10m_max']).all()),
        'non_negative_precipitation': bool((df['precipitation_sum'] >= 0).all()),
        'non_negative_radiation': bool((df['shortwave_radiation_sum'] >= 0).all())
    }

    return {
        'shape': shape,
        'columns': columns,
        'dtypes': dtypes,
        'missing_values': missing,
        'total_missing': total_missing,
        'exact_duplicates': exact_duplicates,
        'tile_time_duplicates': tile_time_duplicates,
        'coord_time_duplicates': coord_time_duplicates,
        'lat_bounds': (lat_min, lat_max),
        'lon_bounds': (lon_min, lon_max),
        'coordinates_valid': bool(lat_valid and lon_valid),
        'unique_tiles': unique_tiles,
        'unique_coords': unique_coords,
        'unique_timestamps': unique_timestamps,
        'date_range': (min_date, max_date),
        'is_daily_frequency': is_daily,
        'temperature_stats': temp_stats,
        'physical_checks': physical_checks
    }


def clean_and_validate_data(df: pd.DataFrame, output_path: str = "data/processed/cleaned_data.csv") -> pd.DataFrame:
    """Clean, sort, and save validated dataset."""
    df_clean = df.copy()
    df_clean['timestamp'] = pd.to_datetime(df_clean['timestamp'])

    # Deduplicate if any exact duplicates exist
    df_clean = df_clean.drop_duplicates()

    # Sort strictly by tile_id and timestamp
    df_clean = df_clean.sort_values(by=['tile_id', 'timestamp']).reset_index(drop=True)

    # Format timestamp as YYYY-MM-DD string for standardized storage
    df_clean['timestamp'] = df_clean['timestamp'].dt.strftime('%Y-%m-%d')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df_clean.to_csv(output_path, index=False)
    return df_clean
