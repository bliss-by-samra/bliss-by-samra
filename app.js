import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const $ = (id) => document.getElementById(id);
const message = $("authMessage");

$("signup").addEventListener("click", async () => {
  message.textContent = "";
  try {
    const email = $("email").value.trim();
    const password = $("password").value;
    if (!email || password.length < 6) throw new Error("Enter an email and a password with at least 6 characters.");
    await createUserWithEmailAndPassword(auth, email, password);
    message.textContent = "Your BLISS account has been created.";
  } catch (e) { message.textContent = e.message; }
});

$("login").addEventListener("click", async () => {
  message.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (e) { message.textContent = e.message; }
});

$("logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  $("memberArea").classList.toggle("hidden", !user);
  $("welcomeTitle").textContent = user ? "Welcome to BLISS" : "";
  $("memberEmail").textContent = user ? user.email : "";
});
