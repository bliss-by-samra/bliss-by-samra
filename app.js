
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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
  $(id).classList.toggle("hidden", !visible);
}

function say(id, text) {
  $(id).textContent = text;
}

function addText(parent, tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.appendChild(element);
  return element;
}

function clear(id) {
  $(id).replaceChildren();
}

// PAGE NAVIGATION
function openPage(pageId) {
  document.querySelectorAll(".screen").forEach(page => {
    page.classList.toggle("hidden", page.id !== pageId);
  });

  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  $("chatPanel").classList.add("hidden");
  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.page));
});

// INSTAGRAM LINK CHECK
function safeInstagramLink(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      (url.hostname === "www.instagram.com" ||
       url.hostname === "instagram.com")
    ) {
      return url.href;
    }
  } catch (_) {}
  return "";
}

// MEMBER DIRECTORY
function renderProfiles(snapshot, targetId, ownerView = false) {
  clear(targetId);

  if (snapshot.empty) {
    addText($(targetId), "p", "No profiles yet.");
    return;
  }

  snapshot.forEach(item => {
    const data = item.data();
    const card = document.createElement("div");
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

    if (ownerView) addText(card, "small", "BLISS member");

    $(targetId).appendChild(card);
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
      addText($("announcements"), "p", "No official updates yet.");
      return;
    }

    snapshot.forEach(item => {
      const data = item.data();
      const card = document.createElement("div");
      card.className = "data-item";

      addText(card, "strong", data.title || "BLISS update");
      addText(card, "p", data.body || "");
      addText(card, "small", "Official BLISS announcement");

      $("announcements").appendChild(card);
    });
  }, error => {
    say("authMessage", "Updates could not load: " + error.message);
  });
}

// PROFILE DIRECTORY
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
    error => say("profileMessage", "Profiles could not load: " + error.message)
  );
}

// OWNER'S PRIVATE HELP DESK INBOX
function startOwnerHelpListener() {
  if (stopOwnerHelp) stopOwnerHelp();

  const helpQuery = query(
    collection(db, "helpRequests"),
    orderBy("createdAt", "desc")
  );

  stopOwnerHelp = onSnapshot(helpQuery, snapshot => {
    clear("ownerHelp");

    if (snapshot.empty) {
      addText($("ownerHelp"), "p", "No questions have been received yet.");
      return;
    }

    snapshot.forEach(item => {
      const data = item.data();
      const card = document.createElement("div");
      card.className = "data-item";

      addText(card, "strong", "Member question");
      addText(card, "p", data.message || "");
      addText(card, "small", "Request ID: " + item.id);

      $("ownerHelp").appendChild(card);
    });
  }, error => {
    say("announcementStatus", "Inbox error: " + error.message);
  });
}

// SIGN UP
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
    say("authMessage", "Your BLISS account has been created!");
  } catch (error) {
    say("authMessage", error.message);
  }
});

// LOGIN
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
    say("authMessage", error.message);
  }
});

// LOGOUT
$("logout").addEventListener("click", async () => {
  await signOut(auth);
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
    say("profileMessage", "Enter your Instagram profile link.");
    return;
  }

  say("profileMessage", "Saving your profile...");

  try {
    await setDoc(doc(db, "publicProfiles", currentUser.uid), {
      handle: handle ? "@" + handle : "",
      instagramUrl,
      bio,
      updatedAt: serverTimestamp()
    }, { merge: true });

    say("profileMessage", "Your profile has been saved!");
  } catch (error) {
    say("profileMessage", "Could not save: " + error.message);
  }
});

// SEND QUESTION TO OWNER
$("sendHelp").addEventListener("click", async () => {
  if (!currentUser) return;

  const text = $("helpMessage").value.trim();

  if (text.length < 5) {
    say("helpStatus", "Please write at least 5 characters.");
    return;
  }

  say("helpStatus", "Sending your question...");

  try {
    await addDoc(collection(db, "helpRequests"), {
      uid: currentUser.uid,
      message: text,
      status: "new",
      createdAt: serverTimestamp()
    });

    $("helpMessage").value = "";
    say("helpStatus", "Your question has been sent to Samra!");
  } catch (error) {
    say("helpStatus", "Could not send: " + error.message);
  }
});

// OWNER PUBLISHES ANNOUNCEMENT
$("publishAnnouncement").addEventListener("click", async () => {
  if (!currentUser || currentUser.uid !== OWNER_UID) return;

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
    say("announcementStatus", "Your update has been published!");
  } catch (error) {
    say("announcementStatus", "Could not publish: " + error.message);
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

    if (stopDirectory) stopDirectory();
    if (stopAnnouncements) stopAnnouncements();
    if (stopOwnerHelp) stopOwnerHelp();

    return;
  }

  const isOwner = user.uid === OWNER_UID;

  $("roleLabel").textContent = isOwner ? "BLISS OWNER" : "BLISS MEMBER";
  $("welcomeTitle").textContent = isOwner ? "Samra's BLISS Profile" : "My BLISS Profile";
  $("accountNote").textContent = isOwner
    ? "You are signed in as the official owner."
    : "You are part of the BLISS community.";

  $("topLabel").textContent = isOwner ? "Founder & Owner" : "BLISS Member";

  show("ownerPanel", isOwner);

  openPage("homePage");

  try {
    const profileSnapshot = await getDoc(
      doc(db, "publicProfiles", user.uid)
    );

    if (profileSnapshot.exists()) {
      const data = profileSnapshot.data();
      $("igHandle").value = data.handle || "";
      $("igLink").value = data.instagramUrl || "";
      $("profileBio").value = data.bio || "";
    } else {
      $("igHandle").value = "";
      $("igLink").value = "";
      $("profileBio").value = "";
    }
  } catch (error) {
    say("profileMessage", "Profile could not load: " + error.message);
  }

  startDirectoryListener(isOwner);
  startAnnouncementListener();

  if (isOwner) startOwnerHelpListener();
});
