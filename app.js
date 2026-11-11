const message = document.getElementById("authMessage");

if (message) {
  message.textContent = "BLISS is starting...";
}

async function startBliss() {
  try {
    const [firebaseApp, firebaseAuth, config] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
      import("./firebase-config.js")
    ]);

    const app = firebaseApp.initializeApp(config.firebaseConfig);
    const auth = firebaseAuth.getAuth(app);

    const $ = id => document.getElementById(id);

    const signup = $("signup");
    const login = $("login");
    const logout = $("logout");

    if (!signup || !login || !logout || !message) {
      throw new Error("A required HTML element is missing.");
    }

    signup.addEventListener("click", async () => {
      message.textContent = "Creating your account...";

      try {
        await firebaseAuth.createUserWithEmailAndPassword(
          auth,
          $("email").value.trim(),
          $("password").value
        );

        message.textContent = "Your BLISS account has been created!";
      } catch (error) {
        message.textContent = error.message;
      }
    });

    login.addEventListener("click", async () => {
      message.textContent = "Logging in...";

      try {
        await firebaseAuth.signInWithEmailAndPassword(
          auth,
          $("email").value.trim(),
          $("password").value
        );
      } catch (error) {
        message.textContent = error.message;
      }
    });

    logout.addEventListener("click", () => firebaseAuth.signOut(auth));

    firebaseAuth.onAuthStateChanged(auth, user => {
      $("memberArea").classList.toggle("hidden", !user);
      $("welcomeTitle").textContent = user ? "Welcome to BLISS" : "";
      $("memberEmail").textContent = user ? user.email : "";
    });

    message.textContent = "BLISS is ready. You can create an account.";

  } catch (error) {
    if (message) {
      message.textContent = "BLISS ERROR: " + error.message;
    }
  }
}

startBliss();