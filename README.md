# The Paramount Academy — Lite v2

A modern, installable phone app for one academy (about 500 users). Students and parents use it on
their phones, and teachers and the admin use a phone or a laptop.

**Stack:** Python · FastAPI · SQLite locally / PostgreSQL online · plain HTML, CSS and JavaScript.
No Node.js, no build step, no CDN. Everything works offline once opened.

---

## 1. Run it (Windows, about 5 minutes)

Open the `paramount-lite` folder in VS Code, open a terminal (`` Ctrl+` ``) and run:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

Open **http://localhost:8000**. On first start, demo data is created.

> **Upgrading from v1?** Replace the old folder's files with these, then run `python run.py --reset` to
> start fresh with the new default subjects (English, Mathematics, Science). Online databases are
> upgraded automatically on start and keep their data — see DEPLOY.md.

| Command | What it does |
|---|---|
| `python run.py` | Start on http://localhost:8000 |
| `python run.py --reset` | Delete local data and reload the demo |
| `python run.py --dev` | Auto-restart when you edit code |
| `python run.py --lan` | Let phones on the same Wi-Fi open it |

**If `pip install` fails:** behind the office proxy use `pip install --proxy http://PROXY:PORT -r requirements.txt`.
If only `psycopg` fails to install, remove that line from `requirements.txt` for local use. It's needed online only.

## 2. Demo logins

On the login page, tap **Demo accounts** and then a row to fill it in.

| Role | ID | Password |
|---|---|---|
| Admin | `ADM-001` | `Admin@123` |
| Teacher (Classes 8, 10) | `TCH-001` | `Teacher@123` |
| Teacher (Class 5) | `TCH-002` | `Teacher@123` |
| Students, Class 5 / 8 / 10 | `TPA26-0001…0012` / `0013…0024` / `0025…0036` | `Student@123` |

(`26` = the year the demo was created.)

## 3. What's new in v2

**Modern, interactive UI**
- Smooth page transitions, animated progress ring, count-up numbers, charts that draw themselves.
- Bottom tab bar with a sliding highlight, swipeable notice cards, pull-to-refresh.
- Leaderboard podium, plus confetti when a student reaches the top 3 (once per exam).
- Slide-up sheets for forms on phones, and centred dialogs and side panels on laptops.
- Toast messages, loading spinners on buttons, and a thin progress bar while pages load.
- Light and dark mode that follows the phone's setting, with a 🌙/☀️ toggle.
- Staff pages use calmer, faster motion. If a phone has "reduce motion" turned on, all animation is turned off.

**Marks entry like a spreadsheet:** press Enter to move down, use the arrow keys to move around, and
invalid marks turn red instantly. Marks **autosave** as you type, and the grid shows live class
averages and a % for each student.

**Uploads:** drag and drop, or tap to choose, with a progress bar.

**Subjects managed by the admin (new Subjects page)**
- Every class starts with **English, Mathematics and Science**.
- Add a subject with its own colour and icon, and optionally add it to several classes at once.
- Rename, reorder (↑ ↓), copy to other classes, or remove a subject.
- **Remove = delete** if the subject has no notes or marks; otherwise it is **archived**: hidden from
  students and new exams, while old results stay correct. You can restore it anytime.

## 4. Test it in 5 minutes

1. **Admin** → Subjects → Class 8 → **Add subject** "Hindi", pick a colour and icon, tick classes 6 and 7.
2. **Admin** → Subjects → Class 8 → 🗑 on *Science*. It is **archived** because it has marks.
   **Student `TPA26-0013`** → Courses no longer shows Science, but Results still does. Restore it.
3. **Teacher `TCH-001`** → Exams → Class 10 → *Unit Test 2* → type marks and press Enter.
   Watch "All changes saved ✓", then tap **Publish results**.
4. **Student `TPA26-0025`** → Home (the ring updates) → Ranks (podium) → Results (chart).
5. **Student** → Courses → a subject → **Save offline**. Then stop the server (`Ctrl+C`) and reload
   the page: it still opens, and so does the saved PDF.
6. **Admin** → Dashboard → **Record** next to an overdue fee → a receipt appears.

## 5. Project structure

```
paramount-lite/
├── run.py                  start the app
├── requirements.txt
├── app/
│   ├── main.py             app setup, security headers, auto DB upgrade
│   ├── config.py           settings, default subjects, colours & icons
│   ├── models.py           13 tables
│   ├── services.py         ranks, progress, subjects, fees, import, charts
│   ├── deps.py             login checks, CSRF, template helpers
│   ├── storage.py          files: local folder or Supabase Storage
│   ├── seed.py             demo data / first admin online
│   ├── routes/             auth, student, staff (teacher+admin), admin
│   ├── templates/          HTML pages
│   └── static/             app.css (design), app.js (interactions), sw.js (offline)
└── DEPLOY.md               put it online for free
```

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `python` not recognised | Use `py` instead. |
| "Your session expired…" | Refresh the page and try again. |
| Old design still showing | Press `Ctrl+Shift+R` once (the browser cached v1). |
| Want fresh demo data | `python run.py --reset` |
| Port 8000 busy | Close the other terminal running the app. |
| Offline doesn't work on a phone over Wi-Fi | It needs HTTPS, so host it online (DEPLOY.md). It works on `localhost`. |
