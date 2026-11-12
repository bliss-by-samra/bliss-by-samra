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

function message(id, text) {
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

function safeInstagramLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname === "www.instagram.com") {
      return url.href;
    }
  } catch (_) {}
  return "";
}

function renderProfileList(snapshot, targetId, ownerView = false) {
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
    if (ownerView) {
      addText(card, "small", "Member account");
    }
    $(targetId).appendChild(card);
  });
}

function startMemberListeners(user, isOwner) {
  if (stopDirectory) stopDirectory();
  if (stopAnnouncements) stopAnnouncements();

  const profilesQuery = query(collection(db, "publicProfiles"));
  stopDirectory = onSnapshot(profilesQuery, snapshot => {
    renderProfileList(snapshot, "directory");
    if (isOwner) renderProfileList(snapshot, "ownerDirectory", true);
  }, error => {
    message("profileMessage", "Could not load profiles: " + error.message);
  });

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
    message("authMessage", "Could not load updates: " + error.message);
  });

  if (isOwner) {
    if (stopOwnerHelp) stopOwnerHelp();
    stopOwnerHelp = onSnapshot(
      query(collection(db, "helpRequests"), orderBy("createdAt", "desc")),
      snapshot => {
        clear("ownerHelp");
        if (snapshot.empty) {
          addText($("ownerHelp"), "p", "No help requests yet.");
          return;
        }
        snapshot.forEach(item => {
          const data = item.data();
          const card = document.createElement("div");
          card.className = "data-item";
          addText(card, "strong", "Request from a member");
          addText(card, "p", data.message || "");
          addText(card, "small", "Request ID: " + item.id);
          $("ownerHelp").appendChild(card);
        });
      },
      error => message("announcementStatus", "Help requests unavailable: " + error.message)
    );
  }
}

$("signup").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || password.length < 6) {
    message("authMessage", "Enter a valid email and a password of at least 6 characters.");
    return;
  }
  message("authMessage", "Creating your account...");
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    message("authMessage", "Account created. Welcome to BLISS!");
  } catch (error) {
    message("authMessage", error.message);
  }
});

$("login").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) {
    message("authMessage", "Enter your email and password.");
    return;
  }
  message("authMessage", "Logging in...");
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    message("authMessage", error.message);
  }
});

$("logout").addEventListener("click", async () => {
  await signOut(auth);
});

$("saveProfile").addEventListener("click", async () => {
  if (!currentUser) return;

  const handle = $("igHandle").value.trim().replace(/^@/, "");
  const instagramUrl = $("igLink").value.trim();
  const bio = $("profileBio").value.trim();

  if (handle && !/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
    message("profileMessage", "Please enter a valid Instagram username.");
    return;
  }

  if (instagramUrl && !safeInstagramLink(instagramUrl)) {
    message("profileMessage", "Use your full https://www.instagram.com/ profile link.");
    return;
  }

  message("profileMessage", "Saving your profile...");
  try {
    await setDoc(doc(db, "publicProfiles", currentUser.uid), {
      handle: handle ? "@" + handle : "",
      instagramUrl,
      bio,
      updatedAt: serverTimestamp()
    }, { merge: true });
    message("profileMessage", "Your profile has been saved!");
  } catch (error) {
    message("profileMessage", "Could not save: " + error.message);
  }
});

$("sendHelp").addEventListener("click", async () => {
  if (!currentUser) return;
  const text = $("helpMessage").value.trim();
  if (text.length < 5) {
    message("helpStatus", "Please write a little more about what you need help with.");
    return;
  }

  message("helpStatus", "Sending your request...");
  try {
    await addDoc(collection(db, "helpRequests"), {
      uid: currentUser.uid,
      message: text,
      status: "new",
      createdAt: serverTimestamp()
    });
    $("helpMessage").value = "";
    message("helpStatus", "Your request has been sent to the BLISS owner.");
  } catch (error) {
    message("helpStatus", "Could not send request: " + error.message);
  }
});

$("publishAnnouncement").addEventListener("click", async () => {
  if (!currentUser || currentUser.uid !== OWNER_UID) return;

  const title = $("announcementTitle").value.trim();
  const body = $("announcementBody").value.trim();

  if (!title || !body) {
    message("announcementStatus", "Enter both a title and a message.");
    return;
  }

  message("announcementStatus", "Publishing...");
  try {
    await addDoc(collection(db, "announcements"), {
      title,
      body,
      authorUid: currentUser.uid,
      createdAt: serverTimestamp()
    });
    $("announcementTitle").value = "";
    $("announcementBody").value = "";
    message("announcementStatus", "Announcement published!");
  } catch (error) {
    message("announcementStatus", "Could not publish: " + error.message);
  }
});

onAuthStateChanged(auth, async user => {
  currentUser = user;
  show("authPanel", !user);
  show("memberArea", !!user);

  if (!user) {
    show("ownerPanel", false);
    if (stopDirectory) stopDirectory();
    if (stopAnnouncements) stopAnnouncements();
    if (stopOwnerHelp) stopOwnerHelp();
    return;
  }

  const isOwner = user.uid === OWNER_UID;
  $("welcomeTitle").textContent = "Welcome to BLISS";
  $("roleLabel").textContent = isOwner ? "OWNER DASHBOARD" : "MEMBER DASHBOARD";
  $("accountNote").textContent = isOwner
    ? "You are signed in as the BLISS owner."
    : "You are signed in as a BLISS member.";

  show("ownerPanel", isOwner);

  try {
    const profileRef = doc(db, "publicProfiles", user.uid);
    const profileSnapshot = await getDoc(profileRef);
    if (profileSnapshot.exists()) {
      const data = profileSnapshot.data();
      $("igHandle").value = data.handle || "";
      $("igLink").value = data.instagramUrl || "";
      $("profileBio").value = data.bio || "";
    }
  } catch (error) {
    message("profileMessage", "Profile could not load: " + error.message);
  }

  startMemberListeners(user, isOwner);
});