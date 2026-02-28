# Blueprint

**Blueprint** is a platform for uni students and job hunters: university opportunities (PhD/Masters matching), mock interviews with speech and feedback, and job application tracking.

Claude (Anthropic) powers **University opportunities** and **Mock interviews**. Set `ANTHROPIC_API_KEY` so that logic runs; otherwise the app uses simple fallbacks.

## Run the app

```bash
conda activate UCLAIfestival
pip install -r requirements.txt
python run.py
```

Open [http://127.0.0.1:5001](http://127.0.0.1:5001).

## Claude API (where it’s used)

- **University opportunities** — Matches your interests/background to PhD and Masters programmes (Claude suggests programmes and match %).
- **Mock interviews** — Generates interview questions and gives feedback on your answers (score, strengths, improvements).

Set the key in a `.env` file in the project root (do not commit it):

```bash
# Copy and edit (add your key)
cp .env.example .env
# In .env:
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Without the key, programme matching and interview feedback use built-in fallbacks so the app still runs.

Sign in and create account use local storage (no backend auth). Sign in first to use Profile, University opportunities, Mock interviews, and Job tracking.

## Project structure

- `app/`
  - `services/`
    - `claude_client.py` — Shared Claude (Anthropic) client; used by interview and postgrad services.
    - `interview_service.py` — Mock interview questions and feedback (Claude).
    - `postgrad_service.py` — Programme matching (Claude).
    - `application_service.py` — Job application tracker (in-memory).
  - `routes/` — Pages and API.
- `templates/` — Single-page UI (Blueprint).
- `static/` — CSS, JS.

## Conda setup

```bash
conda create --name UCLAIfestival
conda activate UCLAIfestival
pip install -r requirements.txt
```

Optional: add `.env` with `ANTHROPIC_API_KEY` for full Claude behaviour.
