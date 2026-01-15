# forecast.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

import mysql.connector
import json
from collections import Counter, defaultdict
from datetime import datetime
from prophet import Prophet
import pandas as pd

app = FastAPI(title="Food Demand Analytics API")

# -------------------- FAVICON --------------------
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("static/favicon.ico")

# -------------------- CORS --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://leafy-chaja-b320b3.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- STATIC --------------------
app.mount("/static", StaticFiles(directory="static"), name="static")

# -------------------- DATABASE --------------------
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="capstone_user",
        password="123456",
        database="capstone_db"
    )

# -------------------- ORDERS SUMMARY --------------------
@app.get("/api/orders-summary")
def orders_summary():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT items, created_at FROM orders")
        rows = cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

    orders_counter = Counter()
    hour_counter = Counter()
    day_counter = Counter()

    for row in rows:
        try:
            created_at = row["created_at"]
            if not isinstance(created_at, datetime):
                continue
            items = json.loads(row.get("items", "[]"))
            for item in items:
                name = item.get("name", "Unknown")
                qty = int(item.get("quantity", 1))
                orders_counter[name] += qty
            hour_counter[created_at.hour] += 1
            day_counter[created_at.strftime("%A")] += 1
        except Exception as e:
            print(f"Skipping row due to error: {e}")
            continue

    orders_sorted = [{"name": name, "quantity": qty} for name, qty in orders_counter.most_common()]

    return {
        "orders": orders_sorted,
        "peakHour": hour_counter.most_common(1)[0][0] if hour_counter else None,
        "peakDay": day_counter.most_common(1)[0][0] if day_counter else None,
        "totalOrders": sum(orders_counter.values()),
    }

# -------------------- MENU SUMMARY --------------------
@app.get("/api/menu-summary")
def menu_summary():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM menu_items")  # Adjust table name
        total = cursor.fetchone()[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
    return {"totalItems": total}

# -------------------- QUEUE SUMMARY --------------------
@app.get("/api/queue-summary")
def queue_summary():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM queue")  # Adjust table name
        total = cursor.fetchone()[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
    return {"totalQueues": total}

# -------------------- ANALYTICS SUMMARY --------------------
@app.get("/api/analytics-summary")
def analytics_summary():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM orders")
        total = cursor.fetchone()[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
    return {"upcoming": total}

# -------------------- FORECAST DEMAND --------------------
@app.get("/api/forecast-demand")
def forecast_demand():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT items, created_at FROM orders ORDER BY created_at")
        rows = cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

    # Aggregate total per day
    daily_total = defaultdict(int)
    item_daily = defaultdict(lambda: defaultdict(int))  # {item_name: {date: qty}}

    for row in rows:
        try:
            created_at = row["created_at"]
            if not isinstance(created_at, datetime):
                continue
            date_str = created_at.strftime("%Y-%m-%d")
            items = json.loads(row.get("items", "[]"))
            for item in items:
                name = item.get("name", "Unknown")
                qty = int(item.get("quantity", 1))
                daily_total[date_str] += qty
                item_daily[name][date_str] += qty
        except Exception as e:
            print(f"Skipping row due to error: {e}")
            continue

    # Total orders forecast
    df = pd.DataFrame({"ds": list(daily_total.keys()), "y": list(daily_total.values())})
    forecast_list = []
    if len(df) >= 3:
        try:
            model = Prophet(daily_seasonality=True)
            model.fit(df)
            future = model.make_future_dataframe(periods=7)
            forecast = model.predict(future)
            forecast_total = forecast[["ds", "yhat"]].tail(7)
            for _, rowf in forecast_total.iterrows():
                forecast_list.append({
                    "date": rowf["ds"].strftime("%Y-%m-%d"),
                    "predicted_orders": max(0, int(rowf["yhat"]))
                })
        except Exception as e:
            print(f"Prophet forecast error: {e}")

    # Trend data for top 3 items
    top_items = sorted(item_daily.items(), key=lambda x: sum(x[1].values()), reverse=True)[:3]
    trend_data = []
    for name, daily in top_items:
        item_df = pd.DataFrame({"ds": list(daily.keys()), "y": list(daily.values())})
        if len(item_df) < 2:
            continue
        try:
            m = Prophet(daily_seasonality=True)
            m.fit(item_df)
            future_item = m.make_future_dataframe(periods=7)
            f_item = m.predict(future_item).tail(7)
            for _, r in f_item.iterrows():
                trend_data.append({
                    "date": r["ds"].strftime("%Y-%m-%d"),
                    "name": name,
                    "predicted_orders": max(0, int(r["yhat"]))
                })
        except Exception as e:
            print(f"Skipping item {name} due to Prophet error: {e}")
            continue

    # Optional: basic prediction accuracy (for last 7 days)
    accuracy = None
    if len(df) >= 7:
        try:
            actual = df["y"].tail(7).values
            predicted = [f["predicted_orders"] for f in forecast_list[-7:]]
            if len(predicted) == 7:
                accuracy = round(100 - sum(abs(a-p) for a,p in zip(actual,predicted))/sum(actual)*100, 2)
        except Exception:
            accuracy = None

    return {
        "forecast": forecast_list,
        "trend": trend_data,
        "accuracy_percent": accuracy
    }

# -------------------- RUN SERVER --------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "forecast:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
