
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const OWNER_UID = "4SbMYoerHiOaYeODrysDBuWqPFY2";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);

let currentUser = null;
let stopDirectory = null;
let stopAnnouncements = null;
let stopOwnerHelp = null;

function show(id, visible) {
  const el = $(id);
  if (el) el.classList.toggle("hidden", !visible);
}

function say(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function addText(parent, tag, text, className = "") {
  const el = document.createElement(tag);
  el.textContent = text == null ? "" : String(text);
  if (className) el.className = className;
  parent.appendChild(el);
  return el;
}

function clear(id) {
  const el = $(id);
  if (el) el.replaceChildren();
}

function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "This email already has an account. Please log in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Please choose a stronger password with at least 6 characters.",
    "auth/invalid-credential": "Email or password is incorrect. Please try again.",
    "auth/user-not-found": "No account was found. Please create an account first.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Please wait a little and try again.",
    "permission-denied": "You don't have permission to do that.",
    "unavailable": "Connection problem. Check your internet and try again."
  };
  return messages[error.code] || "Something went wrong. Please try again.";
}

// PAGE NAVIGATION
function openPage(pageId) {
  document.querySelectorAll(".screen").forEach(page => {
    page.classList.toggle("hidden", page.id !== pageId);
  });

  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.page));
});

// INSTAGRAM LINK VALIDATION
function safeInstagramLink(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      ["www.instagram.com", "instagram.com"].includes(url.hostname)
    ) {
      return url.href;
    }
  } catch (_) {}
  return "";
}

// MEMBER DIRECTORY
function renderProfiles(snapshot, targetId, ownerView = false) {
  const target = $(targetId);
  if (!target) return;

  clear(targetId);

  if (snapshot.empty) {
    addText(target, "p", "No profiles yet.", "muted");
    return;
  }

  snapshot.forEach(item => {
    const data = item.data();
    const card = document.createElement("article");
    card.className = "data-item";

    addText(card, "strong", data.handle || "BLISS member");

    if (data.bio) addText(card, "p", data.bio);

    const link = safeInstagramLink(data.instagramUrl || "");

    if (link) {
      const anchor = document.createElement("a");
      anchor.href = link;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = "View Instagram profile";
      card.appendChild(anchor);
    }

    if (ownerView) {
      addText(card, "small", "Community member");
    }

    target.appendChild(card);
  });
}

// OFFICIAL ANNOUNCEMENTS
function startAnnouncementListener() {
  if (stopAnnouncements) stopAnnouncements();

  const updatesQuery = query(
    collection(db, "announcements"),
    orderBy("createdAt", "desc")
  );

  stopAnnouncements = onSnapshot(updatesQuery, snapshot => {
    clear("announcements");

    if (snapshot.empty) {
      addText($("announcements"), "p", "No official updates yet.", "muted");
      return;
    }

    snapshot.forEach(item => {
      const data = item.data();
      const card = document.createElement("article");
      card.className = "data-item";

      addText(card, "strong", data.title || "BLISS update");
      addText(card, "p", data.body || "");
      addText(card, "small", "Official BLISS announcement");

      $("announcements").appendChild(card);
    });
  }, error => {
    say("authMessage", friendlyError(error));
  });
}

// MEMBER DIRECTORY LISTENER
function startDirectoryListener(isOwner) {
  if (stopDirectory) stopDirectory();

  stopDirectory = onSnapshot(
    collection(db, "publicProfiles"),
    snapshot => {
      renderProfiles(snapshot, "directory");

      if (isOwner) {
        renderProfiles(snapshot, "ownerDirectory", true);
      }
    },
    error => say("profileMessage", friendlyError(error))
  );
}

// OWNER HELP DESK INBOX
function startOwnerHelpListener() {
  if (stopOwnerHelp) stopOwnerHelp();

  const helpQuery = query(
    collection(db, "helpRequests"),
    orderBy("createdAt", "desc")
  );

  stopOwnerHelp = onSnapshot(helpQuery, snapshot => {
    clear("ownerHelp");

    if (snapshot.empty) {
      addText($("ownerHelp"), "p", "No questions received yet.", "muted");
      return;
    }

    snapshot.forEach(item => {
      const data = item.data();
      const card = document.createElement("article");
      card.className = "data-item";

      addText(card, "strong", "Member question");
      addText(card, "p", data.message || "");
      addText(card, "small", "Request ID: " + item.id);

      $("ownerHelp").appendChild(card);
    });
  }, error => {
    say("announcementStatus", friendlyError(error));
  });
}

// CREATE ACCOUNT
$("signup").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || password.length < 6) {
    say("authMessage", "Enter a valid email and a password of at least 6 characters.");
    return;
  }

  say("authMessage", "Creating your account...");

  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    say("authMessage", friendlyError(error));
  }
});

// LOG IN
$("login").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    say("authMessage", "Enter your email and password.");
    return;
  }

  say("authMessage", "Logging in...");

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    say("authMessage", friendlyError(error));
  }
});

// LOG OUT
$("logout").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    say("profileMessage", friendlyError(error));
  }
});

// SAVE PROFILE
$("saveProfile").addEventListener("click", async () => {
  if (!currentUser) return;

  const handle = $("igHandle").value.trim().replace(/^@/, "");
  const instagramUrl = $("igLink").value.trim();
  const bio = $("profileBio").value.trim();

  if (handle && !/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
    say("profileMessage", "Enter a valid Instagram username.");
    return;
  }

  if (instagramUrl && !safeInstagramLink(instagramUrl)) {
    say("profileMessage", "Enter a valid Instagram profile link.");
    return;
  }

  say("profileMessage", "Saving...");

  try {
    await setDoc(
      doc(db, "publicProfiles", currentUser.uid),
      {
        handle: handle ? "@" + handle : "",
        instagramUrl,
        bio,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    say("profileMessage", "Your profile has been saved.");
  } catch (error) {
    say("profileMessage", "Could not save: " + friendlyError(error));
  }
});

// SEND QUESTION TO OWNER
$("sendHelp").addEventListener("click", async () => {
  if (!currentUser) return;

  const message = $("helpMessage").value.trim();

  if (message.length < 5) {
    say("helpStatus", "Please write at least 5 characters.");
    return;
  }

  say("helpStatus", "Sending your question...");

  try {
    await addDoc(collection(db, "helpRequests"), {
      uid: currentUser.uid,
      message,
      status: "new",
      createdAt: serverTimestamp()
    });

    $("helpMessage").value = "";
    say("helpStatus", "Your question has been sent to the BLISS owner.");
  } catch (error) {
    say("helpStatus", "Could not send: " + friendlyError(error));
  }
});

// OWNER PUBLISHES OFFICIAL UPDATE
$("publishAnnouncement").addEventListener("click", async () => {
  if (!currentUser || currentUser.uid !== OWNER_UID) {
    say("announcementStatus", "Owner access required.");
    return;
  }

  const title = $("announcementTitle").value.trim();
  const body = $("announcementBody").value.trim();

  if (!title || !body) {
    say("announcementStatus", "Enter both a title and a message.");
    return;
  }

  say("announcementStatus", "Publishing...");

  try {
    await addDoc(collection(db, "announcements"), {
      title,
      body,
      authorUid: currentUser.uid,
      createdAt: serverTimestamp()
    });

    $("announcementTitle").value = "";
    $("announcementBody").value = "";

    say("announcementStatus", "Your official update is published.");
  } catch (error) {
    say("announcementStatus", "Could not publish: " + friendlyError(error));
  }
});

// AUTHENTICATION STATE
onAuthStateChanged(auth, async user => {
  currentUser = user;

  show("authPanel", !user);
  show("appArea", !!user);
  show("bottomNav", !!user);

  if (!user) {
    show("ownerPanel", false);

    [stopDirectory, stopAnnouncements, stopOwnerHelp].forEach(stop => {
      if (stop) stop();
    });

    stopDirectory = null;
    stopAnnouncements = null;
    stopOwnerHelp = null;

    return;
  }

  const isOwner = user.uid === OWNER_UID;

  $("roleLabel").textContent = isOwner ? "BLISS OWNER" : "BLISS MEMBER";
  $("welcomeTitle").textContent = isOwner
    ? "Samra's BLISS profile"
    : "My BLISS profile";

  $("accountNote").textContent = isOwner
    ? "You are signed in as the official owner."
    : "Welcome to the BLISS community.";

  $("topLabel").textContent = isOwner
    ? "Founder & Owner"
    : "Creative community";

  show("ownerPanel", isOwner);
  openPage("homePage");

  try {
    const profileSnapshot = await getDoc(
      doc(db, "publicProfiles", user.uid)
    );

    const data = profileSnapshot.exists()
      ? profileSnapshot.data()
      : {};

    $("igHandle").value = data.handle || "";
    $("igLink").value = data.instagramUrl || "";
    $("profileBio").value = data.bio || "";
  } catch (error) {
    say("profileMessage", "Profile could not load: " + friendlyError(error));
  }

  startDirectoryListener(isOwner);
  startAnnouncementListener();

  if (isOwner) {
    startOwnerHelpListener();
  }
});
