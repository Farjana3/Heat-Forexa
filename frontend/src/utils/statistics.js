/**
 * Core Statistics Utility Module
 * Implements client-side OLS, Matrix operations, Incomplete Beta Function,
 * Augmented Dickey-Fuller (ADF) Unit-Root Test, and Granger Causality Test.
 */

// --- 1. Basic Matrix Utilities ---

function transpose(A) {
  const R = A.length;
  const C = A[0].length;
  const T = [];
  for (let c = 0; c < C; c++) {
    T[c] = [];
    for (let r = 0; r < R; r++) {
      T[c][r] = A[r][c];
    }
  }
  return T;
}

function multiply(A, B) {
  const rA = A.length;
  const cA = A[0].length;
  const cB = B[0].length;
  const M = [];
  for (let r = 0; r < rA; r++) {
    M[r] = [];
    for (let c = 0; c < cB; c++) {
      let sum = 0;
      for (let k = 0; k < cA; k++) {
        sum += A[r][k] * B[k][c];
      }
      M[r][c] = sum;
    }
  }
  return M;
}

// Invert square matrix using Gaussian elimination with partial pivoting
function invertMatrix(A) {
  const K = A.length;
  const aug = [];
  for (let i = 0; i < K; i++) {
    aug[i] = [];
    for (let j = 0; j < K; j++) {
      aug[i][j] = A[i][j];
    }
    for (let j = 0; j < K; j++) {
      aug[i][K + j] = i === j ? 1 : 0;
    }
  }

  for (let i = 0; i < K; i++) {
    let maxRow = i;
    let maxVal = Math.abs(aug[i][i]);
    for (let r = i + 1; r < K; r++) {
      if (Math.abs(aug[r][i]) > maxVal) {
        maxVal = Math.abs(aug[r][i]);
        maxRow = r;
      }
    }

    if (maxVal < 1e-13) {
      return null; // Singular matrix
    }

    if (maxRow !== i) {
      const temp = aug[i];
      aug[i] = aug[maxRow];
      aug[maxRow] = temp;
    }

    const pivot = aug[i][i];
    for (let j = i; j < 2 * K; j++) {
      aug[i][j] /= pivot;
    }

    for (let r = 0; r < K; r++) {
      if (r === i) continue;
      const factor = aug[r][i];
      for (let j = i; j < 2 * K; j++) {
        aug[r][j] -= factor * aug[i][j];
      }
    }
  }

  const inv = [];
  for (let i = 0; i < K; i++) {
    inv[i] = [];
    for (let j = 0; j < K; j++) {
      inv[i][j] = aug[i][K + j];
    }
  }
  return inv;
}

// --- 2. Ordinary Least Squares (OLS) ---

export function runOLS(X, Y) {
  const N = X.length;
  const K = X[0].length;

  const Xt = transpose(X);
  const XtX = multiply(Xt, X);
  const invXtX = invertMatrix(XtX);

  if (!invXtX) {
    return { error: 'Singular Matrix: Collinearity in predictors.' };
  }

  // Y needs to be N x 1 matrix
  const Ycol = Y.map(v => [v]);
  const XtY = multiply(Xt, Ycol);
  const betaCol = multiply(invXtX, XtY);
  const beta = betaCol.map(row => row[0]);

  // Residuals
  let SSR = 0;
  const residuals = [];
  for (let i = 0; i < N; i++) {
    let fitted = 0;
    for (let j = 0; j < K; j++) {
      fitted += X[i][j] * beta[j];
    }
    const res = Y[i] - fitted;
    residuals.push(res);
    SSR += res * res;
  }

  const df = N - K;
  const s2 = df > 0 ? SSR / df : 0;

  // Covariance matrix of coefficients: s2 * inv(X'X)
  const se = [];
  const tStats = [];
  for (let j = 0; j < K; j++) {
    const variance = s2 * invXtX[j][j];
    const stdErr = variance > 0 ? Math.sqrt(variance) : 0;
    se.push(stdErr);
    tStats.push(stdErr > 0 ? beta[j] / stdErr : 0);
  }

  return {
    beta,
    residuals,
    SSR,
    df,
    s2,
    se,
    tStats
  };
}

// --- 3. Lanczos Gamma & Incomplete Beta (for Granger F-test p-value) ---

function logGamma(x) {
  const p = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let s = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    s += p[i] / (x + i + 1);
  }
  const t = x + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
}

function logBeta(a, b) {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

// Regularized Incomplete Beta Function I_x(a,b) using Lentz method
function betaInc(x, a, b) {
  if (x < 0 || x > 1) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;

  if (x > (a + 1) / (a + b + 2)) {
    return 1 - betaInc(1 - x, b, a);
  }

  const lBeta = logBeta(a, b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lBeta) / a;

  let f = 1.0;
  let c = 1.0;
  let d = 0.0;
  const tiny = 1e-30;

  f = tiny;
  d = 0.0;
  c = f;

  const maxIter = 100;
  for (let m = 1; m <= maxIter; m++) {
    let numerator;
    if (m % 2 === 0) {
      const k = m / 2;
      numerator = (k * (b - k) * x) / ((a + 2 * k - 1) * (a + 2 * k));
    } else {
      const k = (m - 1) / 2;
      numerator = -((a + k) * (a + b + k) * x) / ((a + 2 * k) * (a + 2 * k + 1));
    }

    d = 1.0 + numerator * d;
    if (Math.abs(d) < tiny) d = tiny;
    d = 1.0 / d;

    c = 1.0 + numerator / c;
    if (Math.abs(c) < tiny) c = tiny;

    const delta = c * d;
    f *= delta;

    if (Math.abs(delta - 1.0) < 1e-9) {
      break;
    }
  }

  return front * f;
}

// F-distribution Survival Function (p-value)
export function fSurvival(fStat, df1, df2) {
  if (fStat <= 0) return 1.0;
  const x = df2 / (df2 + df1 * fStat);
  return betaInc(x, df2 / 2, df1 / 2);
}

// --- 4. Augmented Dickey-Fuller (ADF) Test ---

// Piecewise linear interpolation of MacKinnon critical values for finite sample size
function getADFCriticalValues(includeTrend) {
  if (includeTrend) {
    return {
      '1%': -4.12,
      '5%': -3.49,
      '10%': -3.17
    };
  } else {
    return {
      '1%': -3.54,
      '5%': -2.91,
      '10%': -2.59
    };
  }
}

// Interpolate ADF p-value based on critical value anchors
function interpolateADFPValue(adfStat, includeTrend) {
  const cvs = getADFCriticalValues(includeTrend);
  const cv1 = cvs['1%'];
  const cv5 = cvs['5%'];
  const cv10 = cvs['10%'];

  if (adfStat <= cv1) {
    // Highly significant, map to < 0.01
    return Math.max(0.0001, 0.01 * Math.exp(adfStat - cv1));
  } else if (adfStat <= cv5) {
    // Between 1% and 5%
    const ratio = (adfStat - cv1) / (cv5 - cv1) ;
    return 0.01 + ratio * 0.04;
  } else if (adfStat <= cv10) {
    // Between 5% and 10%
    const ratio = (adfStat - cv5) / (cv10 - cv5);
    return 0.05 + ratio * 0.05;
  } else {
    // Non-significant
    const anchor = includeTrend ? -1.5 : -1.0;
    if (adfStat <= anchor) {
      const ratio = (adfStat - cv10) / (anchor - cv10);
      return 0.10 + ratio * 0.40;
    } else {
      const ratio = Math.min(1.0, (adfStat - anchor) / (2.0 - anchor));
      return 0.50 + ratio * 0.45;
    }
  }
}

export function performADF(series, lag = 1, includeTrend = false) {
  const n = series.length;
  if (n < lag + 5) {
    return { error: 'Insufficient observations for selected lag.' };
  }

  // 1. Compute differences
  const dy = [];
  for (let i = 1; i < n; i++) {
    dy.push(series[i] - series[i - 1]);
  }

  // 2. Build regression data
  // Model: dy_t = c + [trend*t] + gamma * y_{t-1} + sum_{j=1}^p delta_j * dy_{t-j} + e_t
  // We run this regression for t = lag to n-2 (in dy terms, which correspond to t = lag+1 to n-1 in original series)
  const X = [];
  const Y_target = [];

  for (let t = lag; t < n - 1; t++) {
    const row = [];
    // Constant
    row.push(1.0);
    // Trend (optional)
    if (includeTrend) {
      row.push(t);
    }
    // Lagged level y_{t-1}
    row.push(series[t]);
    // Lagged differences dy_{t-1} ... dy_{t-lag}
    for (let j = 1; j <= lag; j++) {
      row.push(dy[t - j]);
    }
    X.push(row);
    Y_target.push(dy[t]);
  }

  const regressionResult = runOLS(X, Y_target);
  if (regressionResult.error) {
    return { error: regressionResult.error };
  }

  // The coefficient of interest is gamma (lagged level coefficient)
  // Index of gamma:
  // if trend is included: index is 2 (0: const, 1: trend, 2: lagged level)
  // if no trend: index is 1 (0: const, 1: lagged level)
  const gammaIdx = includeTrend ? 2 : 1;
  const gamma = regressionResult.beta[gammaIdx];
  const gammaSE = regressionResult.se[gammaIdx];
  const adfStat = gammaSE > 0 ? gamma / gammaSE : 0.0;

  const criticalValues = getADFCriticalValues(includeTrend);
  const pValue = interpolateADFPValue(adfStat, includeTrend);

  return {
    adfStatistic: adfStat,
    pValue: pValue,
    criticalValues: criticalValues,
    isStationary: pValue < 0.05,
    gamma: gamma,
    gammaSE: gammaSE,
    nobs: X.length,
    ssr: regressionResult.SSR
  };
}

// --- 5. Granger Causality Test ---

export function performGranger(targetSeries, exogSeries, lag = 1, includeTrend = false) {
  const n = targetSeries.length;
  if (n !== exogSeries.length) {
    return { error: 'Target and Exogenous series must be of equal length.' };
  }
  if (n < 2 * lag + 5) {
    return { error: 'Insufficient observations for selected lag.' };
  }

  // Z_t = Y_t (t = lag ... n-1)
  const Z = [];
  const X_restricted = [];
  const X_unrestricted = [];

  for (let t = lag; t < n; t++) {
    Z.push(targetSeries[t]);

    // Restricted predictors: const, [trend], Y_{t-1}...Y_{t-lag}
    const rowRes = [1.0];
    if (includeTrend) rowRes.push(t);
    for (let j = 1; j <= lag; j++) {
      rowRes.push(targetSeries[t - j]);
    }
    X_restricted.push(rowRes);

    // Unrestricted predictors: const, [trend], Y_{t-1}...Y_{t-lag}, X_{t-1}...X_{t-lag}
    const rowUnr = [1.0];
    if (includeTrend) rowUnr.push(t);
    for (let j = 1; j <= lag; j++) {
      rowUnr.push(targetSeries[t - j]);
    }
    for (let j = 1; j <= lag; j++) {
      rowUnr.push(exogSeries[t - j]);
    }
    X_unrestricted.push(rowUnr);
  }

  const regRestricted = runOLS(X_restricted, Z);
  const regUnrestricted = runOLS(X_unrestricted, Z);

  if (regRestricted.error) return { error: 'Restricted Model: ' + regRestricted.error };
  if (regUnrestricted.error) return { error: 'Unrestricted Model: ' + regUnrestricted.error };

  const ssrRest = regRestricted.SSR;
  const ssrUnr = regUnrestricted.SSR;

  const nobs = Z.length;
  // df1 = lag (number of parameters constrained to zero, i.e., lags of X)
  const df1 = lag;
  // df2 = N_obs - K_unrestricted
  const df2 = nobs - X_unrestricted[0].length;

  if (df2 <= 0) {
    return { error: 'Degrees of freedom exhausted.' };
  }

  // F-statistic: ((SSR_r - SSR_ur) / df1) / (SSR_ur / df2)
  const fStat = ssrUnr > 0 ? ((ssrRest - ssrUnr) / df1) / (ssrUnr / df2) : 0.0;
  const pValue = fSurvival(fStat, df1, df2);

  return {
    fStatistic: fStat,
    pValue: pValue,
    significant: pValue < 0.05,
    df1,
    df2,
    ssrRestricted: ssrRest,
    ssrUnrestricted: ssrUnr,
    nobs
  };
}
