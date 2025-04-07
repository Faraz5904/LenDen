// Firebase imports (CDN version)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsh38sx3SYT8209EMjIha2FC62exQQuTI",
  authDomain: "binimoy-web-app.firebaseapp.com",
  databaseURL: "https://binimoy-web-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "binimoy-web-app",
  storageBucket: "binimoy-web-app.appspot.com",
  messagingSenderId: "260888029981",
  appId: "1:260888029981:web:62046714f97edf47ab8ff4",
  measurementId: "G-D3W0F959E7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const loginPage = document.getElementById('login-page');
const appPage = document.getElementById('app');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const transactionForm = document.getElementById('transaction-form');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const transactionIdInput = document.getElementById('transaction-id');
const transactionsList = document.getElementById('transactions-list');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const targetStatus = document.getElementById('target-status');
const proofInput = document.getElementById('proof-upload');
const userSelect = document.getElementById('user-select');
const passwordInput = document.getElementById('password');
const userNameDisplay = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const userRole = document.getElementById('user-role');

// Constants
const MANDATORY_TARGET = 800000;
const OPTIONAL_TARGET = 200000;
const TOTAL_TARGET = MANDATORY_TARGET + OPTIONAL_TARGET;

// User data
const users = {
  'Sajjad Hossain': { 
    email: 'sajjad@example.com', 
    password: 'jannat137', 
    role: 'admin', 
    avatar: 'SH' 
  },
  'Faruque Ahmed': { 
    email: 'faruque@example.com', 
    password: 'fabappy4207', 
    role: 'user', 
    avatar: 'FA' 
  }
};

// Initialize date
dateInput.valueAsDate = new Date();

/* ------------------------ Authentication Functions ------------------------ */
loginBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const username = userSelect.value;
  const password = passwordInput.value.trim();
  
  if (!username || !password) {
    alert('Please fill all fields');
    return;
  }

  const userData = users[username];
  if (!userData || userData.password !== password) {
    alert('Invalid credentials');
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
    currentUser = {
      name: username,
      role: userData.role,
      avatar: userData.avatar
    };
    
    // Update UI
    userNameDisplay.textContent = username;
    userAvatar.textContent = userData.avatar;
    userRole.textContent = userData.role === 'admin' ? 'Admin' : 'User';
    transactionForm.style.display = userData.role === 'admin' ? 'block' : 'none';
    
    // Switch views
    loginPage.style.display = 'none';
    appPage.style.display = 'block';
    
    // Load data
    loadTransactions();
    
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed. Please try again.');
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    currentUser = null;
    userSelect.value = '';
    passwordInput.value = '';
    appPage.style.display = 'none';
    loginPage.style.display = 'flex';
  } catch (error) {
    console.error('Logout error:', error);
  }
});

/* ------------------------ Transaction Functions ------------------------ */
transactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const amount = parseFloat(amountInput.value);
  const date = dateInput.value;
  const transactionId = transactionIdInput.value.trim();
  
  if (!amount || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  if (!date) {
    alert('Please select a date');
    return;
  }

  // Upload proof if selected
  let proofUrl = null;
  if (proofInput.files[0]) {
    proofUrl = await uploadProof(proofInput.files[0]);
  }

  const transaction = {
    amount,
    date,
    transactionId: transactionId || null,
    proofUrl,
    status: 'pending',
    addedBy: currentUser.name,
    timestamp: new Date().getTime()
  };

  try {
    await addDoc(collection(db, "transactions"), transaction);
    amountInput.value = '';
    dateInput.valueAsDate = new Date();
    transactionIdInput.value = '';
    proofInput.value = '';
  } catch (error) {
    console.error("Error adding transaction: ", error);
    alert('Transaction failed to save');
  }
});

async function uploadProof(file) {
  try {
    const storageReference = storageRef(storage, `proofs/${file.name}`);
    await uploadBytes(storageReference, file);
    return await getDownloadURL(storageReference);
  } catch (error) {
    console.error("Error uploading proof: ", error);
    return null;
  }
}

/* ------------------------ Transaction Display Functions ------------------------ */
function loadTransactions() {
  const transactionsQuery = query(
    collection(db, "transactions"),
    orderBy("date", "desc"),
    orderBy("timestamp", "desc")
  );

  onSnapshot(transactionsQuery, (snapshot) => {
    transactionsList.innerHTML = '';
    let totalPaid = 0;
    
    snapshot.forEach((doc) => {
      const transaction = doc.data();
      totalPaid += transaction.amount;
      
      const transactionElement = createTransactionElement(doc.id, transaction);
      transactionsList.appendChild(transactionElement);
    });
    
    updateProgress(totalPaid);
  });
}

function createTransactionElement(id, transaction) {
  const element = document.createElement('div');
  element.className = 'transaction-item';
  element.innerHTML = `
    <div class="transaction-details">
      <div class="transaction-amount">৳${transaction.amount.toLocaleString()}</div>
      <div class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</div>
      ${transaction.transactionId ? `
        <div class="transaction-id">ID: ${transaction.transactionId}</div>
      ` : ''}
      <div class="transaction-status ${transaction.status}">
        ${transaction.status === 'confirmed' ? '✓ Confirmed' : 'Pending'}
      </div>
      <div class="transaction-added-by">Added by: ${transaction.addedBy}</div>
      ${transaction.proofUrl ? `
        <a href="${transaction.proofUrl}" target="_blank" class="proof-link">View Proof</a>
      ` : ''}
    </div>
    <div class="transaction-actions">
      ${currentUser.role === 'admin' ? `
        <button class="delete-btn" data-id="${id}">Delete</button>
      ` : ''}
      ${currentUser.name !== transaction.addedBy && transaction.status !== 'confirmed' ? `
        <button class="confirm-btn" data-id="${id}">Confirm</button>
      ` : ''}
    </div>
  `;

  // Add event listeners
  const deleteBtn = element.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this transaction?')) {
        await deleteDoc(doc(db, "transactions", id));
      }
    });
  }

  const confirmBtn = element.querySelector('.confirm-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      await updateTransactionStatus(id, 'confirmed');
    });
  }

  return element;
}

async function updateTransactionStatus(id, status) {
  try {
    await updateDoc(doc(db, "transactions", id), {
      status,
      confirmedBy: currentUser.name,
      confirmedAt: new Date().getTime()
    });
  } catch (error) {
    console.error("Error confirming transaction: ", error);
  }
}

/* ------------------------ Progress Tracking ------------------------ */
function updateProgress(totalPaid) {
  const percentage = Math.min((totalPaid / TOTAL_TARGET) * 100, 100);
  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `৳${totalPaid.toLocaleString()}`;
  
  const remainingMandatory = Math.max(0, MANDATORY_TARGET - totalPaid);
  const remainingOptional = Math.max(0, TOTAL_TARGET - totalPaid);

  if (totalPaid >= MANDATORY_TARGET) {
    targetStatus.className = 'target-status status-optional';
    targetStatus.innerHTML = `
      <div>Total Paid: <strong>৳${totalPaid.toLocaleString()}</strong></div>
      <div class="success-message">🎉 Mandatory target completed!</div>
      <div>Optional remaining: <strong>৳${remainingOptional.toLocaleString()}</strong></div>
    `;
  } else {
    targetStatus.className = 'target-status status-mandatory';
    targetStatus.innerHTML = `
      <div>Total Paid: <strong>৳${totalPaid.toLocaleString()}</strong></div>
      <div>Remaining mandatory: <strong>৳${remainingMandatory.toLocaleString()}</strong></div>
      <div>Progress: <strong>${((totalPaid/MANDATORY_TARGET)*100).toFixed(1)}%</strong></div>
    `;
  }
}

/* ------------------------ Auth State Listener ------------------------ */
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginPage.style.display = 'none';
    appPage.style.display = 'block';
    loadTransactions();
  } else {
    loginPage.style.display = 'flex';
    appPage.style.display = 'none';
  }
});

/* ------------------------ Utility Functions ------------------------ */
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Initialize connection status check
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
updateConnectionStatus();

function updateConnectionStatus() {
  const statusElement = document.getElementById('connection-status');
  if (navigator.onLine) {
    statusElement.textContent = 'Online';
    statusElement.className = 'connection-status online';
  } else {
    statusElement.textContent = 'Offline';
    statusElement.className = 'connection-status offline';
  }
}