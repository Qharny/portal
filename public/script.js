const alertBox = document.getElementById("alert");

const lookupSection = document.getElementById("lookup-section");
const lookupForm = document.getElementById("lookup-form");
const studentIdInput = document.getElementById("student-id");

const studentSection = document.getElementById("student-section");
const payForm = document.getElementById("pay-form");
const payButton = document.getElementById("pay-button");
const amountInput = document.getElementById("amount");
const newLookupButton = document.getElementById("new-lookup");

const receiptSection = document.getElementById("receipt-section");
const doneButton = document.getElementById("done-button");

let currentStudent = null;

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
  alertBox.hidden = false;
}

function clearAlert() {
  alertBox.hidden = true;
  alertBox.textContent = "";
}

function showSection(section) {
  lookupSection.hidden = section !== "lookup";
  studentSection.hidden = section !== "student";
  receiptSection.hidden = section !== "receipt";
}

async function requestJSON(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch (parseError) {
    // Response had no/invalid JSON body.
  }

  if (!response.ok) {
    const message = (data && data.error) || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert();

  const studentId = studentIdInput.value.trim();
  if (!studentId) {
    showAlert("Please enter a student ID.", "error");
    return;
  }

  try {
    const student = await requestJSON(`/api/student/${encodeURIComponent(studentId)}`);
    currentStudent = student;
    renderStudent(student);
    showSection("student");
  } catch (err) {
    showAlert(err.message, "error");
  }
});

function renderStudent(student) {
  document.getElementById("s-name").textContent = student.name;
  document.getElementById("s-class").textContent = student.class;
  document.getElementById("s-total").textContent = student.total_fee.toFixed(2);
  document.getElementById("s-balance").textContent = student.balance.toFixed(2);

  document.getElementById("pay-student-id").value = student.student_id;
  document.getElementById("pay-name").value = student.name;

  amountInput.value = "";
  amountInput.max = student.balance;
  payButton.disabled = student.balance <= 0;
  payButton.textContent = student.balance <= 0 ? "No balance due" : "Pay now";
}

payForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert();

  const amount = parseFloat(amountInput.value);
  if (Number.isNaN(amount) || amount <= 0) {
    showAlert("Enter a valid amount greater than zero.", "error");
    return;
  }

  payButton.disabled = true;
  payButton.textContent = "Processing…";

  try {
    const transaction = await requestJSON("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: document.getElementById("pay-student-id").value,
        name: document.getElementById("pay-name").value,
        amount,
      }),
    });
    renderReceipt(transaction);
    showSection("receipt");
  } catch (err) {
    showAlert(err.message, "error");
    payButton.disabled = false;
    payButton.textContent = "Pay now";
  }
});

function renderReceipt(transaction) {
  document.getElementById("r-id").textContent = transaction.transaction_id;
  document.getElementById("r-name").textContent = transaction.name;
  document.getElementById("r-amount").textContent = `GHS ${transaction.amount.toFixed(2)}`;
  document.getElementById("r-balance").textContent = `GHS ${transaction.balance_after.toFixed(2)}`;
  document.getElementById("r-time").textContent = new Date(transaction.timestamp).toLocaleString();
}

newLookupButton.addEventListener("click", () => {
  clearAlert();
  currentStudent = null;
  studentIdInput.value = "";
  showSection("lookup");
});

doneButton.addEventListener("click", () => {
  clearAlert();
  currentStudent = null;
  studentIdInput.value = "";
  showSection("lookup");
});
