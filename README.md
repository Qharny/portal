# School Fees Payment Portal

A minimal web app where a student can look up their fee balance by Student ID
and make a payment. Payments are **simulated** — no real money moves and no
real payment provider is involved.

New to this kind of project? Read [DOCUMENTATION.md](DOCUMENTATION.md) for a
full, beginner-friendly walkthrough of how everything works.

## What's inside

- **Frontend**: plain HTML, CSS, and JavaScript (`public/`)
- **Backend**: Python, using the [Flask](https://flask.palletsprojects.com/) web framework (`server.py`)
- **Storage**: two JSON files (`data/students.json`, `data/transactions.json`) — no database needed

## Requirements

- [Python 3.9+](https://www.python.org/downloads/) installed
- (Nothing else — the frontend needs no build step, no Node.js)

## Setup

Open a terminal in this folder and run:

```bash
pip install -r requirements.txt
```

This installs Flask, the only dependency.

## Run it

```bash
python server.py
```

You should see output ending in something like:

```
 * Running on http://127.0.0.1:5000
```

Now open **http://127.0.0.1:5000** in your browser.

To stop the server, go back to the terminal and press `Ctrl+C`.

## Try it out

The app comes with 3 sample students already in `data/students.json`:

| Student ID | Name          | Balance   |
|------------|---------------|-----------|
| STU001     | John Mensah   | GHS 1200  |
| STU002     | Ama Owusu     | GHS 0     |
| STU003     | Kwame Boateng | GHS 2700  |

Enter `STU001` and pay any amount up to 1200 — the name must be typed
exactly as `John Mensah` (this is how the app checks you're looking at the
right student).

## Project structure

```
Portal/
├── server.py              Backend (Flask app + API routes)
├── requirements.txt        Python dependencies
├── data/
│   ├── students.json        Student records (id, name, class, balance)
│   └── transactions.json    Log of every payment made
└── public/
    ├── index.html            Page structure
    ├── style.css             Styling
    └── script.js             Frontend logic (talks to the backend)
```

For a line-by-line explanation of how it all fits together, see
[DOCUMENTATION.md](DOCUMENTATION.md).
