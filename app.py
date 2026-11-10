import os
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-this")

# Demo-only data. Replace with a regulated, consent-based provider integration
# before showing any real financial information.
accounts = [
    {"id": "bank-1", "bank": "HDFC Bank", "label": "Primary account", "balance": 18450.75, "last4": "2048"},
    {"id": "bank-2", "bank": "State Bank of India", "label": "Savings account", "balance": 7230.00, "last4": "7812"},
    {"id": "bank-3", "bank": "ICICI Bank", "label": "Secondary account", "balance": 12680.40, "last4": "9361"},
]
events = [
    {"id": 3, "kind": "payment", "title": "Demo payment received", "detail": "HDFC Bank • Sample transaction", "amount": 1250.00, "time": "Just now"},
    {"id": 2, "kind": "scan", "title": "QR code scanned", "detail": "Demo scan event • No payment initiated", "amount": None, "time": "8 min ago"},
    {"id": 1, "kind": "payment", "title": "Demo payment sent", "detail": "SBI • Sample transaction", "amount": -240.00, "time": "Yesterday"},
]
next_id = 4

@app.get("/")
def home():
    return render_template("index.html")

@app.get("/api/state")
def state():
    total = sum(a["balance"] for a in accounts)
    return jsonify({"demo": True, "accounts": accounts, "events": events, "total": round(total, 2)})

@app.post("/api/simulate")
def simulate_payment():
    global next_id
    data = request.get_json(silent=True) or {}
    direction = data.get("direction", "received")
    amount = data.get("amount", 250)
    try:
        amount = round(float(amount), 2)
    except (TypeError, ValueError):
        return jsonify({"error": "Enter a valid amount."}), 400
    if amount <= 0 or amount > 1000000:
        return jsonify({"error": "Amount must be between ₹1 and ₹10,00,000."}), 400
    account = accounts[0]
    if direction == "sent":
        account["balance"] = round(max(0, account["balance"] - amount), 2)
        signed_amount = -amount
        title = "Demo payment sent"
    else:
        account["balance"] = round(account["balance"] + amount, 2)
        signed_amount = amount
        title = "Demo payment received"
    events.insert(0, {
        "id": next_id, "kind": "payment", "title": title,
        "detail": f'{account["bank"]} • Simulated transaction',
        "amount": signed_amount, "time": datetime.now().strftime("%I:%M %p")
    })
    next_id += 1
    del events[12:]
    return jsonify({"ok": True, "demo": True})

@app.post("/api/scan")
def record_scan():
    global next_id
    data = request.get_json(silent=True) or {}
    raw = str(data.get("value", "QR code"))[:120]
    events.insert(0, {
        "id": next_id, "kind": "scan", "title": "QR code scanned",
        "detail": f"{raw} • Scan only; no payment made",
        "amount": None, "time": datetime.now().strftime("%I:%M %p")
    })
    next_id += 1
    del events[12:]
    return jsonify({"ok": True, "note": "A scan was recorded. Scanning does not reveal a bank balance or make a payment."})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
