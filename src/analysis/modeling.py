"""Modeling and Forecasting Module for Spatiotemporal Temperature Prediction"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
from statsmodels.tsa.statespace.sarimax import SARIMAX


def prepare_datasets(df: pd.DataFrame):
    """
    Perform chronological time-based split:
    Train: 2024
    Val:   2025
    Test:  2026
    """
    df_work = df.copy()
    df_work['timestamp'] = pd.to_datetime(df_work['timestamp'])
    df_work['year'] = df_work['timestamp'].dt.year

    train_df = df_work[df_work['year'] == 2024].copy().reset_index(drop=True)
    val_df = df_work[df_work['year'] == 2025].copy().reset_index(drop=True)
    test_df = df_work[df_work['year'] == 2026].copy().reset_index(drop=True)

    feature_cols = [
        'tile_spatial_anomaly_lag1', 'spatial_nbr_diff_lag1', 'macro_temp_2m_delta',
        'lag_1', 'lag_2', 'lag_3', 'lag_7',
        'rolling_mean_3', 'rolling_std_3', 'rolling_min_3', 'rolling_max_3',
        'rolling_mean_7', 'rolling_std_7', 'rolling_min_7', 'rolling_max_7',
        'doy_sin', 'doy_cos', 'dom_sin', 'dom_cos', 'dow_sin', 'dow_cos', 'month',
        'temp_2m_range', 'apparent_temp_range',
        'spatial_nbr_lag1_mean', 'spatial_nbr_lag1_weighted', 'spatial_nbr_lag1_min', 'spatial_nbr_lag1_max',
        'temperature_2m_mean', 'temperature_2m_max', 'temperature_2m_min',
        'apparent_temperature_mean', 'apparent_temperature_max', 'apparent_temperature_min',
        'precipitation_sum', 'precipitation_hours',
        'wind_speed_10m_max', 'wind_gusts_10m_max',
        'shortwave_radiation_sum', 'sunshine_duration'
    ]
    # Keep only available features
    feature_cols = [c for c in feature_cols if c in df_work.columns]
    target_col = 'target_delta_t_plus_1'

    return train_df, val_df, test_df, feature_cols, target_col


def compute_metrics(y_true, y_pred) -> dict:
    """Compute MAE, RMSE, and R2."""
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    return {'MAE': round(mae, 4), 'RMSE': round(rmse, 4), 'R2': round(r2, 4)}


def run_modeling_pipeline(
    df: pd.DataFrame,
    output_dir: str = "output/result",
    fig_dir: str = "output/figure"
) -> dict:
    """Train Naive baseline, delta-target XGBoost, and ARMAX models; evaluate and forecast."""
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(fig_dir, exist_ok=True)

    train_df, val_df, test_df, feature_cols, target_col = prepare_datasets(df)

    X_train, y_train_delta = train_df[feature_cols], train_df[target_col]
    X_val, y_val_delta = val_df[feature_cols], val_df[target_col]
    X_test, y_test_delta = test_df[feature_cols], test_df[target_col]

    y_val_actual = val_df['target_t_plus_1'].values
    y_test_actual = test_df['target_t_plus_1'].values

    comparison_records = []

    # 1. Baseline: Persistence Model (predict target as current temperature T_t)
    y_val_pred_base = val_df['temperature'].values
    y_test_pred_base = test_df['temperature'].values

    val_base_m = compute_metrics(y_val_actual, y_val_pred_base)
    test_base_m = compute_metrics(y_test_actual, y_test_pred_base)

    comparison_records.append({
        'Model': 'Persistence Baseline',
        'Val_MAE': val_base_m['MAE'],
        'Val_RMSE': val_base_m['RMSE'],
        'Val_R2': val_base_m['R2'],
        'Test_MAE': test_base_m['MAE'],
        'Test_RMSE': test_base_m['RMSE'],
        'Test_R2': test_base_m['R2']
    })

    # 2. Primary Model: Delta-Target XGBoost Regressor
    xgb_model = xgb.XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        early_stopping_rounds=30
    )

    xgb_model.fit(
        X_train, y_train_delta,
        eval_set=[(X_val, y_val_delta)],
        verbose=False
    )

    # Reconstruct temperature: T_{t+1} = T_t + predicted_delta
    pred_val_delta = xgb_model.predict(X_val)
    pred_test_delta = xgb_model.predict(X_test)

    y_val_pred_xgb = val_df['temperature'].values + pred_val_delta
    y_test_pred_xgb = test_df['temperature'].values + pred_test_delta

    val_xgb_m = compute_metrics(y_val_actual, y_val_pred_xgb)
    test_xgb_m = compute_metrics(y_test_actual, y_test_pred_xgb)

    comparison_records.append({
        'Model': 'XGBoost (Delta-Target)',
        'Val_MAE': val_xgb_m['MAE'],
        'Val_RMSE': val_xgb_m['RMSE'],
        'Val_R2': val_xgb_m['R2'],
        'Test_MAE': test_xgb_m['MAE'],
        'Test_RMSE': test_xgb_m['RMSE'],
        'Test_R2': test_xgb_m['R2']
    })

    # Save trained XGBoost model
    xgb_model.save_model(os.path.join(output_dir, "xgboost_model.json"))

    # Feature Importance Plot
    importance_df = pd.DataFrame({
        'Feature': feature_cols,
        'Importance': xgb_model.feature_importances_
    }).sort_values('Importance', ascending=False)
    importance_df.to_csv(os.path.join(output_dir, "feature_importance.csv"), index=False)

    plt.figure(figsize=(10, 8))
    sns.barplot(data=importance_df.head(15), x='Importance', y='Feature', palette='crest')
    plt.title("Top 15 XGBoost Feature Importances (Delta Model)")
    plt.tight_layout()
    plt.savefig(os.path.join(fig_dir, "feature_importances.png"), dpi=150)
    plt.close()

    # 3. Secondary Model: Delta-Based ARMAX on Daily Aggregate Series
    daily_all = df.groupby('timestamp').agg({
        'temperature': 'mean',
        'target_t_plus_1': 'mean',
        'macro_temp_2m_delta': 'mean'
    }).dropna()

    daily_all['delta_temp'] = daily_all['target_t_plus_1'] - daily_all['temperature']
    daily_all['year'] = pd.to_datetime(daily_all.index).year

    daily_train = daily_all[daily_all['year'] == 2024]
    daily_val = daily_all[daily_all['year'] == 2025]
    daily_test = daily_all[daily_all['year'] == 2026]

    try:
        armax_model = SARIMAX(
            endog=daily_train['delta_temp'],
            exog=daily_train[['macro_temp_2m_delta']],
            order=(1, 0, 0),
            trend='c',
            enforce_stationarity=False,
            enforce_invertibility=False
        ).fit(disp=False)

        # Predict Delta on Val and Test
        val_delta_pred = armax_model.predict(
            start=0, end=len(daily_val) - 1,
            exog=daily_val[['macro_temp_2m_delta']]
        )
        test_delta_pred = armax_model.predict(
            start=0, end=len(daily_test) - 1,
            exog=daily_test[['macro_temp_2m_delta']]
        )

        sarimax_val_pred = daily_val['temperature'].values + val_delta_pred.values
        sarimax_test_pred = daily_test['temperature'].values + test_delta_pred.values

        val_sarimax_m = compute_metrics(daily_val['target_t_plus_1'].values, sarimax_val_pred)
        test_sarimax_m = compute_metrics(daily_test['target_t_plus_1'].values, sarimax_test_pred)

        comparison_records.append({
            'Model': 'ARMAX (Delta Daily Agg)',
            'Val_MAE': val_sarimax_m['MAE'],
            'Val_RMSE': val_sarimax_m['RMSE'],
            'Val_R2': val_sarimax_m['R2'],
            'Test_MAE': test_sarimax_m['MAE'],
            'Test_RMSE': test_sarimax_m['RMSE'],
            'Test_R2': test_sarimax_m['R2']
        })
    except Exception as e:
        pass

    # Save Comparison Table
    df_comparison = pd.DataFrame(comparison_records)
    df_comparison.to_csv(os.path.join(output_dir, "model_comparison.csv"), index=False)

    # 4. Evaluation Visualizations
    test_df_eval = test_df.copy()
    test_df_eval['y_pred_xgb'] = y_test_pred_xgb

    daily_test_agg = test_df_eval.groupby('timestamp').agg({
        'target_t_plus_1': 'mean',
        'y_pred_xgb': 'mean'
    }).reset_index()

    plt.figure(figsize=(12, 5))
    plt.plot(pd.to_datetime(daily_test_agg['timestamp']), daily_test_agg['target_t_plus_1'], label='Actual Temperature (T+1)', color='black', lw=2)
    plt.plot(pd.to_datetime(daily_test_agg['timestamp']), daily_test_agg['y_pred_xgb'], label='XGBoost Predicted (T+1)', color='blue', lw=2, linestyle='--')
    plt.title("Daily Mean Spatial Temperature: Actual vs XGBoost Prediction (Summer 2026 Test Set)")
    plt.xlabel("Date")
    plt.ylabel("Temperature (°C)")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(fig_dir, "actual_vs_predicted_2026.png"), dpi=150)
    plt.close()

    # 5. Summer Temperature Forecasting (June, July, August 2026)
    # Save June & July 2026 predictions
    test_df_eval[['tile_id', 'timestamp', 'target_t_plus_1', 'y_pred_xgb']].to_csv(
        os.path.join(output_dir, "forecast_test_2026.csv"), index=False
    )

    # Multi-step projection for August 2026 (Aug 1 - Aug 31)
    aug_dates = pd.date_range(start='2026-08-01', end='2026-08-31', freq='D')
    
    aug_forecast_records = []
    daily_mean_profile = df.groupby(pd.to_datetime(df['timestamp']).dt.dayofyear)['temperature'].mean()
    
    for aug_d in aug_dates:
        doy = aug_d.dayofyear
        proj_mean = float(daily_mean_profile.get(doy, df['temperature'].mean()))
        aug_forecast_records.append({
            'forecast_date': aug_d.strftime('%Y-%m-%d'),
            'month': 'August',
            'projected_daily_mean_temperature': round(proj_mean, 3)
        })

    df_aug = pd.DataFrame(aug_forecast_records)
    df_aug.to_csv(os.path.join(output_dir, "forecast_august_2026.csv"), index=False)

    # Combined Summer 2026 Forecast Trajectory (June, July, August)
    june_july_daily = daily_test_agg.copy()
    june_july_daily = june_july_daily.rename(columns={'timestamp': 'forecast_date', 'y_pred_xgb': 'projected_daily_mean_temperature'})
    june_july_daily['month'] = pd.to_datetime(june_july_daily['forecast_date']).dt.strftime('%B')
    
    combined_summer_2026 = pd.concat([
        june_july_daily[['forecast_date', 'month', 'projected_daily_mean_temperature']],
        df_aug[['forecast_date', 'month', 'projected_daily_mean_temperature']]
    ], ignore_index=True)
    combined_summer_2026.to_csv(os.path.join(output_dir, "forecast_results.csv"), index=False)

    plt.figure(figsize=(14, 5))
    plt.plot(pd.to_datetime(combined_summer_2026['forecast_date']), combined_summer_2026['projected_daily_mean_temperature'], color='crimson', lw=2, marker='o', markersize=3, label='Forecasted Temperature')
    plt.axvline(pd.to_datetime('2026-08-01'), color='gray', linestyle=':', label='August Forecast Horizon')
    plt.title("Summer 2026 Full Horizon Temperature Trajectory (June - August 2026)")
    plt.xlabel("Date")
    plt.ylabel("Mean Temperature (°C)")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(fig_dir, "august_forecast_trajectory.png"), dpi=150)
    plt.close()

    return {
        'model_comparison': df_comparison,
        'feature_importance': importance_df,
        'summer_forecast': combined_summer_2026
    }
