# How This Project Works (Beginner Guide)

This document explains the project in detail, assuming little to no prior
experience with web development. If you just want to run the app, see
[README.md](README.md) instead.

## 1. The big picture

A website like this is really two programs talking to each other:

- **Frontend** — what runs in the user's browser. It's just HTML (structure),
  CSS (appearance), and JavaScript (behavior). The browser downloads these
  files and runs them.
- **Backend** — a program that runs on a server (in this case, your own
  computer, at address `127.0.0.1`, port `5000`). It stores data and
  contains the rules ("business logic") that shouldn't be exposed to or
  trusted from the browser — like "does this student actually have enough
  balance to pay this amount?".

The frontend and backend talk over HTTP, the same protocol your browser uses
to load any web page. The frontend sends a **request** ("give me student
STU001's info"), and the backend sends back a **response** (the student's
data, or an error).

Here, both live on the same machine and the same Flask process serves both —
Flask hands out the HTML/CSS/JS files *and* answers the data requests. That
avoids a class of bugs called CORS errors that show up when frontend and
backend live on different addresses, so it's one less thing to debug as a
beginner.

## 2. Why no database?

Real-world apps usually store data in a database (like PostgreSQL, MySQL, or
SQLite). For a small learning project, a **JSON file** is enough, and you
can open it in any text editor to see exactly what's stored — nothing is
hidden behind database tooling. The tradeoff: JSON files don't handle many
users writing at the same time as well as a real database would. That's
fine here; it would not be fine for a production system with real money and
real students.

## 3. File-by-file walkthrough

### `data/students.json`

A list of student records. Each one looks like:

```json
{
  "student_id": "STU001",
  "name": "John Mensah",
  "class": "SHS 2",
  "total_fee": 2500.0,
  "balance": 1200.0
}
```

`balance` is how much is still owed. When a payment succeeds, the backend
subtracts the paid amount from `balance` and saves the file again.

### `data/transactions.json`

A list of every completed payment, oldest first. Each entry is a full
receipt:

```json
{
  "transaction_id": "a1b2c3...",
  "student_id": "STU001",
  "name": "John Mensah",
  "amount": 300.0,
  "balance_after": 900.0,
  "timestamp": "2026-08-04T21:44:11+00:00",
  "status": "success"
}
```

`transaction_id` is a randomly generated unique ID (a "UUID") — a way to
refer to one specific payment without ambiguity.

### `server.py` — the backend

This is a [Flask](https://flask.palletsprojects.com/) application. Flask
lets you write Python functions and say "run this function when the browser
asks for this URL." Each of those is called a **route**.

Key routes:

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Serves `public/index.html` (the page itself) |
| `/api/student/<student_id>` | GET | Looks up one student's info |
| `/api/pay` | POST | Processes a (simulated) payment |
| `/api/transactions/<student_id>` | GET | Lists a student's past payments |

"GET" and "POST" are HTTP **methods** — GET means "just give me data,"
POST means "here's data, do something with it (like create a payment)."

Walking through `/api/pay` (the most important route), step by step:

1. Read the JSON the browser sent (student ID, name, amount).
2. **Validate everything** before touching any data:
   - Is the student ID present?
   - Is the name present?
   - Is the amount a real, positive number?
3. Look up the student by ID. If not found → send back a `404 Not Found`
   error with a clear message.
4. Check the name matches what's on file for that student ID. This is a
   simple stand-in for authentication (proving you are who you say you
   are) — a real system would use logins instead.
5. Check the amount doesn't exceed the outstanding balance.
6. If everything checks out: subtract the amount from the balance, build a
   transaction record, and save both files back to disk.
7. Send the transaction back as the response — the frontend uses this to
   show a receipt.

Every failure case returns a JSON object like `{"error": "explanation"}`
along with an appropriate **HTTP status code**:

| Code | Meaning | Example here |
|---|---|---|
| `200` | OK | Successful lookup |
| `201` | Created | Successful payment (a new transaction was created) |
| `400` | Bad request | Missing/invalid amount, name mismatch, amount too high |
| `404` | Not found | Student ID doesn't exist |
| `500` | Server error | The data file couldn't be read or saved |

Status codes matter because the frontend checks them to decide whether to
show a success screen or an error message — it doesn't have to guess from
the text.

### `public/index.html` — the page structure

Defines three sections, only one visible at a time:

1. **Lookup section** — a form with a Student ID field.
2. **Student section** — shows the student's info and a payment form.
3. **Receipt section** — shows the result after a successful payment.

`script.js` shows/hides these by toggling the `hidden` attribute on each
`<section>`.

### `public/style.css` — appearance

Plain CSS, no framework. Includes a `@media (prefers-color-scheme: dark)`
block so the page adapts to the user's light/dark mode preference
automatically.

### `public/script.js` — frontend logic

This is what actually calls the backend. The core building block is the
browser's [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
function, which sends an HTTP request and returns a response.

A simplified version of what happens when you click "Find student":

```js
const response = await fetch(`/api/student/${studentId}`);
const data = await response.json();

if (!response.ok) {
  // response.ok is false for any 4xx/5xx status — show the error
  showAlert(data.error);
} else {
  // show the student's info on screen
}
```

The same pattern repeats for making a payment, just with `POST` and a body:

```js
const response = await fetch("/api/pay", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ student_id, name, amount }),
});
```

All of this network code is wrapped in a `try/catch` in `script.js`
(`requestJSON`), so if the server is unreachable entirely (not even an error
response — e.g. you forgot to start `server.py`), the user still sees a
friendly message instead of a silently broken page.

## 4. Trying the API directly (without the browser)

You can talk to the backend without any frontend at all, which is a good way
to understand what's really going on. With the server running, open a
**second** terminal:

```bash
curl http://127.0.0.1:5000/api/student/STU001
```

```bash
curl -X POST http://127.0.0.1:5000/api/pay \
  -H "Content-Type: application/json" \
  -d "{\"student_id\": \"STU001\", \"name\": \"John Mensah\", \"amount\": 100}"
```

This is exactly what `script.js` does under the hood — the browser is just
a more convenient way to trigger these same requests.

## 5. Common beginner questions

**"Why does the page look the same after I edit `style.css`?"**
Your browser cached the old file. Hard-refresh with `Ctrl+Shift+R`
(Windows/Linux) or `Cmd+Shift+R` (Mac).

**"I changed `server.py` but nothing happens."**
`python server.py` needs to be restarted to pick up code changes (stop it
with `Ctrl+C`, run it again). If you want it to reload automatically while
developing, run `flask --app server run --debug` instead.

**"I get `Address already in use`."**
Something is already using port 5000 (maybe a previous run of the server
that didn't fully stop). Close that process, or edit the last line of
`server.py` to use a different port, e.g. `app.run(debug=True, port=5050)`.

**"Can I add more students?"**
Yes — open `data/students.json` in any text editor and add another object
to the list, following the same shape as the existing ones. No restart of
the JSON file is needed, but if the server is running, changes there take
effect on the next request (the file is re-read every time, nothing is
cached in memory).

**"Is this safe to use with real money and real students?"**
No — this is a learning/demo project. Payments are simulated, there is no
real authentication (just a name check), and JSON files are not built for
many simultaneous users. A production version would need a real database,
real login/authentication, HTTPS, and a real payment provider (e.g.
Paystack, Flutterwave, Stripe).

## 6. Glossary

- **API** (Application Programming Interface): the set of URLs a backend
  exposes for other programs (like the frontend) to talk to it.
- **Endpoint**: one specific API URL, e.g. `/api/pay`.
- **JSON**: a text format for structured data — `{"key": "value"}` — used
  both for storage here and for the requests/responses between frontend and
  backend.
- **Request/Response**: a request is what the browser sends to the server;
  a response is what the server sends back.
- **Status code**: a 3-digit number in every HTTP response summarizing the
  outcome (`200` = OK, `404` = not found, etc.).
- **Route**: a backend function tied to a specific URL and HTTP method.
- **Validation**: checking that input data makes sense (not empty, right
  type, right range) before acting on it.
