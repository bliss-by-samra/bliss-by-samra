import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const message = document.getElementById("authMessage");

try {
  const { firebaseConfig } = await import("./firebase-config.js");
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  const $ = id => document.getElementById(id);

  $("signup").addEventListener("click", async () => {
    message.textContent = "Creating your account...";
    try {
      await createUserWithEmailAndPassword(
        auth,
        $("email").value.trim(),
        $("password").value
      );
      message.textContent = "Your BLISS account has been created!";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  $("login").addEventListener("click", async () => {
    message.textContent = "Logging in...";
    try {
      await signInWithEmailAndPassword(
        auth,
        $("email").value.trim(),
        $("password").value
      );
    } catch (error) {
      message.textContent = error.message;
    }
  });

  $("logout").addEventListener("click", () => signOut(auth));

  onAuthStateChanged(auth, user => {
    $("memberArea").classList.toggle("hidden", !user);
    $("welcomeTitle").textContent = user ? "Welcome to BLISS" : "";
    $("memberEmail").textContent = user ? user.email : "";
  });

} catch (error) {
  message.textContent = "BLISS loading error: " + error.message;
}