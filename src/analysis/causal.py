"""Causal and Statistical Analysis Module for Spatiotemporal Temperature Data"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.tsa.stattools import adfuller, grangercausalitytests


def run_correlation_analysis(df: pd.DataFrame, output_dir: str = "output/result", fig_dir: str = "output/figure") -> pd.DataFrame:
    """Compute Pearson & Spearman correlation between temperature and environmental features."""
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(fig_dir, exist_ok=True)

    candidate_cols = [
        'temperature',
        'target_t_plus_1',
        'temperature_2m_mean',
        'temperature_2m_max',
        'temperature_2m_min',
        'apparent_temperature_mean',
        'apparent_temperature_max',
        'apparent_temperature_min',
        'precipitation_sum',
        'precipitation_hours',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
        'shortwave_radiation_sum',
        'sunshine_duration',
        'spatial_nbr_lag1_mean',
        'lag_1'
    ]
    cols = [c for c in candidate_cols if c in df.columns]
    
    corr_pearson = df[cols].corr(method='pearson')
    corr_spearman = df[cols].corr(method='spearman')

    corr_pearson.to_csv(os.path.join(output_dir, "correlation_matrix_pearson.csv"))
    corr_spearman.to_csv(os.path.join(output_dir, "correlation_matrix_spearman.csv"))

    # Plot concise heatmap
    plt.figure(figsize=(10, 8))
    sns.heatmap(corr_pearson, annot=True, fmt=".2f", cmap="coolwarm", cbar=True, square=True)
    plt.title("Pearson Correlation Heatmap (Temperature & Environmental Features)")
    plt.tight_layout()
    plt.savefig(os.path.join(fig_dir, "correlation_heatmap.png"), dpi=150)
    plt.close()

    return corr_pearson


def run_stationarity_tests(df: pd.DataFrame, output_dir: str = "output/result") -> pd.DataFrame:
    """Run ADF stationarity tests on daily aggregate series."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Daily aggregation to create continuous time series
    daily = df.groupby('timestamp').agg({
        'temperature': 'mean',
        'temperature_2m_mean': 'mean',
        'apparent_temperature_mean': 'mean',
        'precipitation_sum': 'mean',
        'wind_speed_10m_max': 'mean',
        'shortwave_radiation_sum': 'mean',
        'sunshine_duration': 'mean'
    }).reset_index()

    records = []
    for col in daily.columns:
        if col == 'timestamp':
            continue
        series = daily[col].dropna()
        if len(series) < 20 or series.std() == 0:
            continue
        res = adfuller(series, autolag='AIC')
        records.append({
            'variable': col,
            'adf_statistic': round(float(res[0]), 4),
            'p_value': round(float(res[1]), 6),
            'critical_val_1%': round(float(res[4]['1%']), 4),
            'critical_val_5%': round(float(res[4]['5%']), 4),
            'stationary_at_5%': bool(res[1] < 0.05)
        })

    df_adf = pd.DataFrame(records)
    df_adf.to_csv(os.path.join(output_dir, "stationarity_results.csv"), index=False)
    return df_adf


def run_granger_causality_analysis(
    df: pd.DataFrame,
    max_lag: int = 5,
    output_dir: str = "output/result",
    fig_dir: str = "output/figure"
) -> tuple:
    """Perform Granger causality testing on macro environmental variables vs temperature."""
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(fig_dir, exist_ok=True)

    daily = df.groupby('timestamp').agg({
        'temperature': 'mean',
        'temperature_2m_mean': 'mean',
        'apparent_temperature_mean': 'mean',
        'precipitation_sum': 'mean',
        'wind_speed_10m_max': 'mean',
        'shortwave_radiation_sum': 'mean',
        'sunshine_duration': 'mean'
    }).reset_index()

    candidates = [
        'temperature_2m_mean',
        'apparent_temperature_mean',
        'precipitation_sum',
        'wind_speed_10m_max',
        'shortwave_radiation_sum',
        'sunshine_duration'
    ]

    granger_records = []
    for col in candidates:
        sub = daily[['temperature', col]].dropna()
        try:
            # test if col Granger-causes temperature
            gc_res = grangercausalitytests(sub[['temperature', col]], maxlag=max_lag, verbose=False)
            for lag in range(1, max_lag + 1):
                f_test = gc_res[lag][0]['ssr_ftest']
                f_stat, p_val = f_test[0], f_test[1]
                granger_records.append({
                    'exogenous_variable': col,
                    'lag': lag,
                    'f_statistic': round(float(f_stat), 4),
                    'p_value': round(float(p_val), 6),
                    'granger_causes_temp_5%': bool(p_val < 0.05)
                })
        except Exception as e:
            continue

    df_granger = pd.DataFrame(granger_records)
    df_granger.to_csv(os.path.join(output_dir, "granger_causality_results.csv"), index=False)

    # Identify selected exogenous variables with significant Granger causality (p < 0.05) or high correlation
    sig_vars = df_granger[df_granger['p_value'] < 0.05]['exogenous_variable'].unique().tolist()
    if not sig_vars:
        # Fallback to strongest correlated variables
        sig_vars = ['temperature_2m_mean', 'apparent_temperature_mean', 'shortwave_radiation_sum']

    with open(os.path.join(output_dir, "selected_exogenous_variables.json"), 'w') as f:
        json.dump({'selected_exogenous': sig_vars}, f, indent=2)

    # Plot Granger Causality p-values
    plt.figure(figsize=(10, 5))
    sns.barplot(data=df_granger, x='exogenous_variable', y='p_value', hue='lag', palette='viridis')
    plt.axhline(0.05, color='red', linestyle='--', label='p = 0.05 Significance Threshold')
    plt.title("Granger Causality Test P-Values across Lags (X -> FortyGuard Temperature)")
    plt.ylabel("P-Value (Lower is More Significant)")
    plt.xlabel("Exogenous Predictor")
    plt.xticks(rotation=25)
    plt.legend(title="Lag (Days)")
    plt.tight_layout()
    plt.savefig(os.path.join(fig_dir, "granger_causality_pvalues.png"), dpi=150)
    plt.close()

    return df_granger, sig_vars
