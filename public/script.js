const alertBox = document.getElementById("alert");

// Portal Sections
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
const printReceiptBtn = document.getElementById("print-receipt-btn");
const copyTxBtn = document.getElementById("copy-tx-btn");

// Step indicators
const stepChipLookup = document.getElementById("step-chip-lookup");
const stepChipStudent = document.getElementById("step-chip-student");
const stepChipReceipt = document.getElementById("step-chip-receipt");

// Dashboard Elements
const avatarInitials = document.getElementById("avatar-initials");
const sStatusBadge = document.getElementById("s-status-badge");
const sIdDisplay = document.getElementById("s-id-display");
const progressPercentage = document.getElementById("progress-percentage");
const progressBarFill = document.getElementById("progress-bar-fill");
const historyContainer = document.getElementById("history-container");

// Payment Presets
const presetFull = document.getElementById("preset-full");
const preset50 = document.getElementById("preset-50");
const preset25 = document.getElementById("preset-25");

let currentStudent = null;

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `ai-alert ${type}`;
  alertBox.hidden = false;
}

function clearAlert() {
  alertBox.hidden = true;
  alertBox.textContent = "";
}

function updateStepIndicators(stepName) {
  stepChipLookup.classList.toggle("active", stepName === "lookup");
  stepChipStudent.classList.toggle("active", stepName === "student");
  stepChipReceipt.classList.toggle("active", stepName === "receipt");
}

function showSection(section) {
  lookupSection.hidden = section !== "lookup";
  studentSection.hidden = section !== "student";
  receiptSection.hidden = section !== "receipt";
  updateStepIndicators(section);
}

async function requestJSON(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    throw new Error("Could not reach server. Check connection.");
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

// Student Lookup Handler
lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert();

  const studentId = studentIdInput.value.trim();
  if (!studentId) {
    showAlert("Please enter a Student Index number.", "error");
    return;
  }

  try {
    const student = await requestJSON(`/api/student/${encodeURIComponent(studentId)}`);
    currentStudent = student;
    renderStudent(student);
    await loadStudentTransactions(student.student_id);
    showSection("student");
  } catch (err) {
    showAlert(err.message, "error");
  }
});

// Demo Student Quick Select Buttons
document.querySelectorAll(".ai-chip-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const studentId = btn.getAttribute("data-id");
    studentIdInput.value = studentId;
    lookupForm.requestSubmit();
  });
});

function getInitials(name) {
  if (!name) return "CU";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function renderStudent(student) {
  document.getElementById("s-name").textContent = student.name;
  document.getElementById("s-class").textContent = student.class || "Undergraduate";
  document.getElementById("s-total").textContent = student.total_fee.toFixed(2);
  document.getElementById("s-balance").textContent = student.balance.toFixed(2);
  sIdDisplay.textContent = student.student_id;
  avatarInitials.textContent = getInitials(student.name);

  // Clearance Analytics Progress
  const totalFee = student.total_fee || 1;
  const paidAmount = Math.max(0, totalFee - student.balance);
  const percentagePaid = Math.min(100, Math.max(0, Math.round((paidAmount / totalFee) * 100)));

  progressBarFill.style.width = `${percentagePaid}%`;
  progressPercentage.textContent = `${percentagePaid}% Paid`;

  if (student.balance <= 0) {
    sStatusBadge.textContent = "Cleared";
    sStatusBadge.className = "ai-badge cleared";
  } else {
    sStatusBadge.textContent = "Pending";
    sStatusBadge.className = "ai-badge danger";
  }

  document.getElementById("pay-student-id").value = student.student_id;
  document.getElementById("pay-name").value = student.name;

  amountInput.value = "";
  amountInput.max = student.balance;
  payButton.disabled = student.balance <= 0;
  
  const payBtnSpan = payButton.querySelector("span");
  if (payBtnSpan) {
    payBtnSpan.textContent = student.balance <= 0 ? "Account Fully Cleared" : "Process Payment";
  }
}

// Payment Presets
presetFull.addEventListener("click", () => {
  if (currentStudent && currentStudent.balance > 0) {
    amountInput.value = currentStudent.balance.toFixed(2);
  }
});

preset50.addEventListener("click", () => {
  if (currentStudent && currentStudent.balance > 0) {
    amountInput.value = (currentStudent.balance * 0.5).toFixed(2);
  }
});

preset25.addEventListener("click", () => {
  if (currentStudent && currentStudent.balance > 0) {
    amountInput.value = (currentStudent.balance * 0.25).toFixed(2);
  }
});

// Channel Selection Toggle
document.querySelectorAll(".ai-channel-card input").forEach((radio) => {
  radio.addEventListener("change", () => {
    document.querySelectorAll(".ai-channel-card").forEach((card) => card.classList.remove("active"));
    radio.closest(".ai-channel-card").classList.add("active");
  });
});

// Load Student Transaction History
async function loadStudentTransactions(studentId) {
  historyContainer.innerHTML = '<p class="empty-text">Loading insights…</p>';
  try {
    const transactions = await requestJSON(`/api/transactions/${encodeURIComponent(studentId)}`);
    if (!transactions || transactions.length === 0) {
      historyContainer.innerHTML = '<p class="empty-text">No payment records found.</p>';
      return;
    }

    historyContainer.innerHTML = transactions
      .map(
        (tx) => `
        <div class="ai-history-row">
          <div>
            <span class="mono-text">Ref: ${tx.transaction_id.slice(0, 8)}...</span>
            <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 0.5rem;">
              ${new Date(tx.timestamp).toLocaleDateString()}
            </span>
          </div>
          <span style="color: var(--success-text); font-weight: 700;">+ GHS ${tx.amount.toFixed(2)}</span>
        </div>
      `
      )
      .join("");
  } catch (err) {
    historyContainer.innerHTML = '<p class="empty-text">Unable to load transaction log.</p>';
  }
}

// Payment Submission
payForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert();

  const amount = parseFloat(amountInput.value);
  if (Number.isNaN(amount) || amount <= 0) {
    showAlert("Please enter a valid amount greater than zero.", "error");
    return;
  }

  payButton.disabled = true;
  const payBtnSpan = payButton.querySelector("span");
  if (payBtnSpan) payBtnSpan.textContent = "Processing...";

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
    if (payBtnSpan) payBtnSpan.textContent = "Process Payment";
  }
});

// Render Official Receipt
function renderReceipt(transaction) {
  document.getElementById("r-id").textContent = transaction.transaction_id;
  document.getElementById("r-name").textContent = transaction.name;
  document.getElementById("r-amount").textContent = `GHS ${transaction.amount.toFixed(2)}`;
  document.getElementById("r-balance").textContent = `GHS ${transaction.balance_after.toFixed(2)}`;
  document.getElementById("r-time").textContent = new Date(transaction.timestamp).toLocaleString();
}

// Copy Reference ID
if (copyTxBtn) {
  copyTxBtn.addEventListener("click", () => {
    const txId = document.getElementById("r-id").textContent;
    if (txId && txId !== "---") {
      navigator.clipboard.writeText(txId);
      showAlert("Transaction reference copied to clipboard!", "success");
    }
  });
}

// Print Receipt
if (printReceiptBtn) {
  printReceiptBtn.addEventListener("click", () => {
    window.print();
  });
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
