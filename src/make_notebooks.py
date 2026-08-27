"""Helper script to construct and save all 4 notebooks cleanly."""

import os
import nbformat as nbf


def make_notebook(cells, filename):
    nb = nbf.v4.new_notebook()
    nb.cells = cells
    for target_dir in ['notebook', 'notebooks']:
        os.makedirs(target_dir, exist_ok=True)
        path = os.path.join(target_dir, filename)
        with open(path, 'w', encoding='utf-8') as f:
            nbf.write(nb, f)
    print(f"Created {filename}")


def create_all_notebooks():
    # 01_data_quality.ipynb
    nb1_cells = [
        nbf.v4.new_markdown_cell("# 01. Data Quality Audit & Clean Dataset Export\n\nComprehensive quality audit on raw FortyGuard + Open-Meteo dataset."),
        nbf.v4.new_code_cell(
            "import sys\n"
            "import os\n"
            "sys.path.insert(0, os.path.abspath('..'))\n"
            "sys.path.insert(0, os.path.abspath('.'))\n\n"
            "import pandas as pd\n"
            "import numpy as np\n"
            "from src.processing.data_quality import load_raw_data, audit_data_quality, clean_and_validate_data"
        ),
        nbf.v4.new_code_cell(
            "# 1. Load Raw Dataset\n"
            "df_raw = load_raw_data('data/raw/temperature_2024_2026.csv')\n"
            "print(f'Raw Dataset Shape: {df_raw.shape[0]:,} rows, {df_raw.shape[1]} columns')"
        ),
        nbf.v4.new_code_cell(
            "# 2. Run Comprehensive Data Quality Audit\n"
            "audit = audit_data_quality(df_raw)\n\n"
            "print('=== DATA QUALITY SUMMARY ===')\n"
            "print(f'Total Rows: {audit[\"shape\"][0]:,}, Columns: {audit[\"shape\"][1]}')\n"
            "print(f'Total Missing Values: {audit[\"total_missing\"]}')\n"
            "print(f'Exact Duplicate Rows: {audit[\"exact_duplicates\"]}')\n"
            "print(f'Duplicate (tile_id, timestamp) pairs: {audit[\"tile_time_duplicates\"]}')\n"
            "print(f'Unique Tiles: {audit[\"unique_tiles\"]:,}, Unique Coordinates: {audit[\"unique_coords\"]:,}')\n"
            "print(f'Date Range: {audit[\"date_range\"][0]} to {audit[\"date_range\"][1]} ({audit[\"unique_timestamps\"]} days)')\n"
            "print(f'Daily Frequency Confirmed: {audit[\"is_daily_frequency\"]}')\n"
            "print(f'Coordinates Valid (within WGS84 bounds): {audit[\"coordinates_valid\"]}')"
        ),
        nbf.v4.new_code_cell(
            "# 3. Temperature Statistics & Physical Consistency\n"
            "print('=== TEMPERATURE METRICS ===')\n"
            "for k, v in audit['temperature_stats'].items():\n"
            "    print(f'  {k}: {v}')\n\n"
            "print('\\n=== THERMODYNAMIC & PHYSICAL BOUND CHECKS ===')\n"
            "for check, passed in audit['physical_checks'].items():\n"
            "    print(f'  {check}: {\"PASSED\" if passed else \"FAILED\"}')"
        ),
        nbf.v4.new_code_cell(
            "# 4. Save Validated Dataset\n"
            "df_cleaned = clean_and_validate_data(df_raw, output_path='data/processed/cleaned_data.csv')\n"
            "print(f'Cleaned dataset successfully saved to data/processed/cleaned_data.csv ({df_cleaned.shape[0]:,} rows).')"
        )
    ]
    make_notebook(nb1_cells, '01_data_quality.ipynb')

    # 02_feature_engineering.ipynb
    nb2_cells = [
        nbf.v4.new_markdown_cell("# 02. Leakage-Safe Spatiotemporal Feature Engineering\n\nGenerates temporal lags, rolling metrics, cyclic calendar features, spatial KNN neighbor features, and next-day target."),
        nbf.v4.new_code_cell(
            "import sys\n"
            "import os\n"
            "sys.path.insert(0, os.path.abspath('..'))\n"
            "sys.path.insert(0, os.path.abspath('.'))\n\n"
            "import pandas as pd\n"
            "import numpy as np\n"
            "from src.processing.features import build_spatiotemporal_features, generate_feature_dataset"
        ),
        nbf.v4.new_code_cell(
            "# 1. Load Cleaned Dataset\n"
            "df_clean = pd.read_csv('data/processed/cleaned_data.csv')\n"
            "print(f'Cleaned data loaded: {df_clean.shape[0]:,} rows')"
        ),
        nbf.v4.new_code_cell(
            "# 2. Generate Leakage-Safe Features\n"
            "df_features = generate_feature_dataset(\n"
            "    input_path='data/processed/cleaned_data.csv',\n"
            "    output_path='data/processed/features.csv'\n"
            ")\n"
            "print(f'Engineered features dataset shape: {df_features.shape[0]:,} rows, {df_features.shape[1]} columns')"
        ),
        nbf.v4.new_code_cell(
            "# 3. Feature Summary & Verification\n"
            "print('Feature Columns:')\n"
            "for i, col in enumerate(df_features.columns):\n"
            "    print(f'  [{i:02d}] {col}')\n\n"
            "print('\\nMissing values count in final feature matrix:')\n"
            "print(df_features.isnull().sum()[df_features.isnull().sum() > 0])"
        ),
        nbf.v4.new_code_cell(
            "# 4. Temporal Alignment Verification\n"
            "print('Temporal alignment check:')\n"
            "print('Years present:', df_features['year'].value_counts().sort_index().to_dict())\n"
            "print('Earliest date per year with full lag features:')\n"
            "print(df_features.groupby('year')['timestamp'].min().to_dict())"
        )
    ]
    make_notebook(nb2_cells, '02_feature_engineering.ipynb')

    # 03_causal_analysis.ipynb
    nb3_cells = [
        nbf.v4.new_markdown_cell("# 03. Causal & Statistical Analysis\n\nCorrelation analysis, stationarity testing (ADF), and Granger causality analysis of environmental drivers."),
        nbf.v4.new_code_cell(
            "import sys\n"
            "import os\n"
            "sys.path.insert(0, os.path.abspath('..'))\n"
            "sys.path.insert(0, os.path.abspath('.'))\n\n"
            "import pandas as pd\n"
            "import matplotlib.pyplot as plt\n"
            "from src.analysis.causal import run_correlation_analysis, run_stationarity_tests, run_granger_causality_analysis"
        ),
        nbf.v4.new_code_cell(
            "# 1. Load Feature Dataset\n"
            "df_feat = pd.read_csv('data/processed/features.csv')\n"
            "print(f'Features loaded: {df_feat.shape[0]:,} rows')"
        ),
        nbf.v4.new_code_cell(
            "# 2. Correlation Analysis\n"
            "df_corr = run_correlation_analysis(df_feat, output_dir='output/result', fig_dir='output/figure')\n"
            "print('Top correlations with target_t_plus_1:')\n"
            "print(df_corr['target_t_plus_1'].sort_values(ascending=False))"
        ),
        nbf.v4.new_code_cell(
            "# 3. Stationarity Testing (Augmented Dickey-Fuller)\n"
            "df_adf = run_stationarity_tests(df_feat, output_dir='output/result')\n"
            "print('ADF Stationarity Test Results:')\n"
            "print(df_adf.to_string(index=False))"
        ),
        nbf.v4.new_code_cell(
            "# 4. Granger Causality Testing\n"
            "df_granger, selected_exog = run_granger_causality_analysis(df_feat, max_lag=5, output_dir='output/result', fig_dir='output/figure')\n"
            "print('Granger Causality Results (p < 0.05):')\n"
            "sig_granger = df_granger[df_granger['p_value'] < 0.05]\n"
            "print(sig_granger.to_string(index=False) if len(sig_granger) > 0 else 'All candidate tests computed.')\n"
            "print('\\nSelected Exogenous Variables for SARIMAX:', selected_exog)"
        )
    ]
    make_notebook(nb3_cells, '03_causal_analysis.ipynb')

    # 04_modeling_forecasting.ipynb
    nb4_cells = [
        nbf.v4.new_markdown_cell("# 04. Modeling, Evaluation & Summer Forecasting\n\nChronological time-based split, Baseline vs XGBoost vs SARIMAX evaluation, and June-July-August forecasts."),
        nbf.v4.new_code_cell(
            "import sys\n"
            "import os\n"
            "sys.path.insert(0, os.path.abspath('..'))\n"
            "sys.path.insert(0, os.path.abspath('.'))\n\n"
            "import pandas as pd\n"
            "import matplotlib.pyplot as plt\n"
            "from src.analysis.modeling import run_modeling_pipeline"
        ),
        nbf.v4.new_code_cell(
            "# 1. Load Features\n"
            "df_feat = pd.read_csv('data/processed/features.csv')\n"
            "print(f'Features loaded: {df_feat.shape[0]:,} rows')"
        ),
        nbf.v4.new_code_cell(
            "# 2. Execute Modeling Pipeline (Train/Val/Test Split & Benchmarking)\n"
            "results = run_modeling_pipeline(df_feat, output_dir='output/result', fig_dir='output/figure')\n"
            "print('=== MODEL COMPARISON RESULTS ===')\n"
            "print(results['model_comparison'].to_string(index=False))"
        ),
        nbf.v4.new_code_cell(
            "# 3. Top Feature Importances (XGBoost)\n"
            "print('\\n=== TOP 10 FEATURE IMPORTANCES ===')\n"
            "print(results['feature_importance'].head(10).to_string(index=False))"
        ),
        nbf.v4.new_code_cell(
            "# 4. Summer 2026 Forecasting Summary (June, July, August)\n"
            "print('\\n=== SUMMER 2026 FORECAST SUMMARY ===')\n"
            "forecast_df = results['summer_forecast']\n"
            "print(forecast_df.groupby('month')['projected_daily_mean_temperature'].agg(['count', 'mean', 'min', 'max']))"
        )
    ]
    make_notebook(nb4_cells, '04_modeling_forecasting.ipynb')


if __name__ == '__main__':
    create_all_notebooks()
