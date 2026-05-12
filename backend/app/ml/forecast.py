import logging
import numpy as np
import pandas as pd
from prophet import Prophet

logger = logging.getLogger(__name__)

logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
logging.getLogger("prophet").setLevel(logging.ERROR)


TIMEFRAME_CONFIG = {
    "5m": {"horizon": 5, "lookback": 1000},
    "15m": {"horizon": 15, "lookback": 1500},
    "1h": {"horizon": 60, "lookback": 3000},
    "4h": {"horizon": 240, "lookback": 10000},
    "1d": {"horizon": 1440, "lookback": 30000},
}


def _prepare(df: pd.DataFrame) -> pd.DataFrame:
    df = df[["time_timestamp", "close"]].copy()

    df["ds"] = pd.to_datetime(df["time_timestamp"], unit="s", utc=True).dt.tz_convert(None)
    df["y"] = pd.to_numeric(df["close"], errors="coerce")

    df = (
        df.dropna()
        .query("y > 0")
        .sort_values("ds")
        .drop_duplicates("ds")
        .set_index("ds")
        .resample("1min")
        .last()
    )

    df["y"] = df["y"].ffill()

    return df.reset_index()[["ds", "y"]]


def generate_prophet_forecast(df_symbol: pd.DataFrame, timeframe: str) -> list:
    try:
        config = TIMEFRAME_CONFIG.get(timeframe, TIMEFRAME_CONFIG["1h"])

        df = _prepare(df_symbol).tail(config["lookback"])

        rows = len(df)
        logger.info("Prophet input rows=%s timeframe=%s", rows, timeframe)

        # Require a reasonable minimum history so Prophet is stable.
        if rows < 60:
            logger.info("Insufficient data for forecast: timeframe=%s rows=%s", timeframe, rows)
            return []

        df["y"] = np.log(df["y"].clip(lower=1e-8))

        model = Prophet(
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=5.0,
            seasonality_mode="additive",
            daily_seasonality=True,
            weekly_seasonality=False,
            yearly_seasonality=False,
        )

        model.add_seasonality(
            name="hourly",
            period=1 / 24,
            fourier_order=6,
        )

        model.fit(df)

        future = model.make_future_dataframe(
            periods=config["horizon"],
            freq="1min",
            include_history=False,
        )

        forecast = model.predict(future)

        return [
            {
                "datetime": r.ds.strftime("%Y-%m-%d %H:%M:%S"),
                "time_timestamp": int(r.ds.timestamp()),
                "predicted_close": round(float(np.exp(r.yhat)), 4),
                "lower_bound": round(float(np.exp(r.yhat_lower)), 4),
                "upper_bound": round(float(np.exp(r.yhat_upper)), 4),
            }
            for r in forecast.itertuples()
        ]

    except Exception:
        logger.exception("Forecast failed")
        return []