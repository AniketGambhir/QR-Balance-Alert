# QR Balance Alert

A Flask-based QR and payment activity dashboard. The starter version uses clearly labeled demo bank balances and simulated payment alerts. It does not connect to real bank accounts or monitor other apps.

## Run locally

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000

## Deploy on Render

- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`

Set `SECRET_KEY` as a private environment variable in production.
