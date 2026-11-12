

import { firebaseConfig } from "./firebase-config.js";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const OWNER_UID = "4SbMYoerHiOaYeODrysDBuWqPFY2";

let currentUser = null;
let currentChatId = null;
let currentChatMember = null;

let currentPageId = null;
let pageHistory = [];

let allResources = [];
let selectedResourceCategory = "All";

const $ = id => document.getElementById(id);

function showMessage(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

// BACK BUTTON AND PAGE NAVIGATION

function createBackButton(page) {
  if (!page || page.id === "homePage") return;

  if (page.querySelector(".page-back-button")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "page-back-button";
  button.textContent = "← Back";
  button.addEventListener("click", goBack);

  page.prepend(button);
}

function showPage(pageId, addToHistory = true) {
  const page = $(pageId);
  if (!page) return;

  if (
    addToHistory &&
    currentPageId &&
    currentPageId !== pageId
  ) {
    pageHistory.push(currentPageId);
  }

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.add("hidden");
  });

  page.classList.remove("hidden");

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageId
    );
  });

  currentPageId = pageId;

  createBackButton(page);

  const titles = {
    homePage: "Your creative community",
    discoverPage: "Discover creators",
    supportPage: "Creator support",
    createPage: "Create and submit",
    resourcesPage: "Editing Resources",
    challengesPage: "Challenges",
    messagesPage: "Messages",
    profilePage: "Your profile",
    ownerProfilePage: "Official BLISS profile"
  };

  if ($("topLabel")) {
    $("topLabel").textContent = titles[pageId] || "BLISS";
  }

  if (pageId === "discoverPage") {
    loadDirectory();
    loadCollabs();
  }

  if (pageId === "supportPage") loadSupport();
  if (pageId === "homePage") loadHome();
  if (pageId === "messagesPage") loadMessages();
  if (pageId === "resourcesPage") loadResources();
  if (pageId === "ownerProfilePage") loadOwnerPosts();
}

function goBack() {
  const previousPage = pageHistory.pop();

  if (previousPage && $(previousPage)) {
    showPage(previousPage, false);
  } else {
    pageHistory = [];
    showPage("homePage", false);
  }
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

// ACCOUNT HELPERS

function isOwner() {
  return currentUser && currentUser.uid === OWNER_UID;
}

function setLoggedInUI(user) {
  if ($("authPanel")) $("authPanel").classList.add("hidden");
  if ($("appArea")) $("appArea").classList.remove("hidden");

  if ($("ownerPanel")) {
    $("ownerPanel").classList.toggle(
      "hidden",
      user.uid !== OWNER_UID
    );
  }

  if ($("roleLabel")) {
    $("roleLabel").textContent = user.uid === OWNER_UID
      ? "BLISS OWNER"
      : "BLISS MEMBER";
  }

  if ($("welcomeTitle")) {
    $("welcomeTitle").textContent = user.uid === OWNER_UID
      ? "Welcome back, Samra"
      : "Welcome to BLISS";
  }

  if ($("accountNote")) {
    $("accountNote").textContent = user.uid === OWNER_UID
      ? "You are signed in as the BLISS owner."
      : "Your creative space is ready.";
  }

  pageHistory = [];
  currentPageId = null;
  showPage("homePage", false);
}

function setLoggedOutUI() {
  if ($("authPanel")) $("authPanel").classList.remove("hidden");
  if ($("appArea")) $("appArea").classList.add("hidden");
  if ($("ownerPanel")) $("ownerPanel").classList.add("hidden");

  pageHistory = [];
  currentPageId = null;
}

// GENERAL CARDS AND LISTS

function makeCard(title, body, date = "", link = "") {
  const card = document.createElement("article");
  card.className = "data-item";

  const heading = document.createElement("h3");
  heading.textContent = title || "BLISS update";

  const paragraph = document.createElement("p");
  paragraph.textContent = body || "";

  card.append(heading, paragraph);

  if (link) {
    const anchor = document.createElement("a");
    anchor.href = link;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = "Open link";
    card.append(anchor);
  }

  if (date) {
    const small = document.createElement("small");
    small.textContent = date;
    card.append(small);
  }

  return card;
}

function showList(id, items, emptyText) {
  const container = $(id);
  if (!container) return;

  container.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  items.forEach(item => container.append(item));
}

function dateLabel(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  return timestamp.toDate().toLocaleDateString();
}

async function readCollection(name, max = 40) {
  const result = await getDocs(
    query(collection(db, name), limit(max))
  );

  return result.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

// HOME AND ANNOUNCEMENTS

async function loadHome() {
  try {
    const announcements = await readCollection("announcements");

    announcements.sort((a, b) =>
      (b.createdAt?.seconds || 0) -
      (a.createdAt?.seconds || 0)
    );

    showList(
      "announcements",
      announcements.map(item =>
        makeCard(
          item.title,
          item.body,
          dateLabel(item.createdAt)
        )
      ),
      "No announcements yet. Check back soon."
    );
  } catch (error) {
    console.error("Announcements:", error);
  }

  try {
    const voices = await readCollection("voiceAnnouncements");
    const container = $("voiceAnnouncements");

    if (container) {
      container.replaceChildren();

      voices.forEach(item => {
        const card = makeCard(
          item.title,
          item.description || ""
        );

        if (item.url) {
          const audio = document.createElement("audio");
          audio.controls = true;
          audio.preload = "none";
          audio.src = item.url;
          card.append(audio);
        }

        container.append(card);
      });

      if (!voices.length) {
        container.textContent = "No voice announcements yet.";
      }
    }
  } catch (error) {
    console.error("Voice announcements:", error);
  }
}

// SIGN UP AND LOGIN

if ($("signup")) {
  $("signup").addEventListener("click", async () => {
    const email = $("email")?.value.trim();
    const password = $("password")?.value;

    if (!email || !password) {
      showMessage(
        "authMessage",
        "Enter your email and password."
      );
      return;
    }

    try {
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      showMessage(
        "authMessage",
        "Account created successfully."
      );
    } catch (error) {
      showMessage("authMessage", error.message);
    }
  });
}

if ($("login")) {
  $("login").addEventListener("click", async () => {
    const email = $("email")?.value.trim();
    const password = $("password")?.value;

    if (!email || !password) {
      showMessage(
        "authMessage",
        "Enter your email and password."
      );
      return;
    }

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
    } catch (error) {
      showMessage("authMessage", error.message);
    }
  });
}

if ($("logout")) {
  $("logout").addEventListener("click", () => signOut(auth));
}

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (!user) {
    setLoggedOutUI();
    return;
  }

  setLoggedInUI(user);

  await loadProfile();
  await loadHome();
  await loadResources();
  await loadCollabs();
  await loadSupport();
  await loadOwnerPosts();
  await loadOwnerAvatar();
});

// MEMBER PROFILE

async function loadProfile() {
  if (!currentUser) return;

  try {
    const result = await getDoc(
      doc(db, "publicProfiles", currentUser.uid)
    );

    if (!result.exists()) return;

    const data = result.data();

    if ($("igHandle")) {
      $("igHandle").value = data.handle || "";
    }

    if ($("igLink")) {
      $("igLink").value = data.instagramUrl || "";
    }

    if ($("profileBio")) {
      $("profileBio").value = data.bio || "";
    }
  } catch (error) {
    console.error("Profile:", error);
  }
}

if ($("saveProfile")) {
  $("saveProfile").addEventListener("click", async () => {
    if (!currentUser) return;

    const handle = $("igHandle")?.value.trim() || "";
    const instagramUrl = $("igLink")?.value.trim() || "";
    const bio = $("profileBio")?.value.trim() || "";

    if (handle.length > 40 || bio.length > 250) {
      showMessage(
        "profileMessage",
        "Please shorten your profile details."
      );
      return;
    }

    if (
      instagramUrl &&
      !/^https:\/\/(www\.)?instagram\.com\//i.test(instagramUrl)
    ) {
      showMessage(
        "profileMessage",
        "Enter a valid Instagram profile link."
      );
      return;
    }

    try {
      await setDoc(
        doc(db, "publicProfiles", currentUser.uid),
        {
          handle,
          instagramUrl,
          bio,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      showMessage("profileMessage", "Profile saved.");
    } catch (error) {
      showMessage(
        "profileMessage",
        "Could not save: " + error.message
      );
    }
  });
}

// MEMBER DIRECTORY

async function loadDirectory(searchTerm = "") {
  try {
    const profiles = await readCollection("publicProfiles", 100);
    const term = searchTerm.toLowerCase();

    const filtered = profiles.filter(profile =>
      profile.id !== currentUser?.uid &&
      `${profile.handle || ""} ${profile.bio || ""}`
        .toLowerCase()
        .includes(term)
    );

    showList(
      "directory",
      filtered.map(profile => {
        const card = makeCard(
          profile.handle || "BLISS member",
          profile.bio || "Creative community member"
        );

        if (profile.instagramUrl) {
          const link = document.createElement("a");
          link.href = profile.instagramUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Instagram profile";
          card.append(link);
        }

        const messageButton = document.createElement("button");
        messageButton.textContent = "Request message";
        messageButton.className = "button-soft";

        messageButton.addEventListener("click", () => {
          if ($("messageRecipient")) {
            $("messageRecipient").value =
              profile.handle || "";
          }

          showPage("messagesPage");
        });

        card.append(messageButton);
        return card;
      }),
      "No members found yet."
    );
  } catch (error) {
    console.error("Directory:", error);
  }
}

if ($("memberSearch")) {
  $("memberSearch").addEventListener("input", event => {
    loadDirectory(event.target.value.trim());
  });
}

// OWNER WRITTEN ANNOUNCEMENTS

if ($("publishAnnouncement")) {
  $("publishAnnouncement").addEventListener(
    "click",
    async () => {
      if (!isOwner()) return;

      const title = $("announcementTitle")?.value.trim();
      const body = $("announcementBody")?.value.trim();

      if (!title || !body) {
        showMessage(
          "announcementStatus",
          "Add a title and announcement."
        );
        return;
      }

      try {
        await addDoc(collection(db, "announcements"), {
          title,
          body,
          authorUid: currentUser.uid,
          createdAt: serverTimestamp()
        });

        $("announcementTitle").value = "";
        $("announcementBody").value = "";

        showMessage(
          "announcementStatus",
          "Announcement published."
        );

        loadHome();
      } catch (error) {
        showMessage(
          "announcementStatus",
          "Could not publish: " + error.message
        );
      }
    }
  );
}

// OWNER VOICE ANNOUNCEMENTS
// Existing feature preserved. Add a public audio link.

if ($("publishVoice")) {
  $("publishVoice").addEventListener(
    "click",
    async () => {
      if (!isOwner()) return;

      const title = $("voiceTitle")?.value.trim();
      const url = $("voiceUrl")?.value.trim();

      if (!title || !url || !/^https:\/\//i.test(url)) {
        showMessage(
          "voiceStatus",
          "Enter a title and secure audio link."
        );
        return;
      }

      try {
        await addDoc(collection(db, "voiceAnnouncements"), {
          title,
          url,
          description: "",
          authorUid: currentUser.uid,
          createdAt: serverTimestamp()
        });

        $("voiceTitle").value = "";
        $("voiceUrl").value = "";

        showMessage(
          "voiceStatus",
          "Voice announcement published."
        );

        loadHome();
      } catch (error) {
        showMessage(
          "voiceStatus",
          "Could not publish: " + error.message
        );
      }
    }
  );
}

// EDITING RESOURCES

function isImageResource(url) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#].*)?$/i.test(url);
}

function createResourceFilters() {
  const library = $("resourceLibrary");
  if (!library) return;

  let filters = $("resourceFilters");

  if (!filters) {
    filters = document.createElement("div");
    filters.id = "resourceFilters";
    filters.className = "resource-filters";
    library.parentNode.insertBefore(filters, library);
  }

  const categories = [
    "All",
    "Backgrounds",
    "Overlays",
    "Fonts",
    "PNG Elements",
    "Layouts",
    "Inspiration"
  ];

  filters.replaceChildren();

  categories.forEach(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "resource-filter-button";
    button.textContent = category;

    if (selectedResourceCategory === category) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      selectedResourceCategory = category;
      renderResources();
    });

    filters.append(button);
  });
}

function renderResources() {
  const library = $("resourceLibrary");
  if (!library) return;

  createResourceFilters();

  const filtered = selectedResourceCategory === "All"
    ? allResources
    : allResources.filter(item =>
        (item.category || "Editing resource")
          .toLowerCase() === selectedResourceCategory.toLowerCase()
      );

  library.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = selectedResourceCategory === "All"
      ? "No resources have been added yet."
      : "No resources in this category yet.";

    library.append(empty);
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "data-item resource-card";

    const heading = document.createElement("h3");
    heading.textContent = item.title || "Editing resource";

    const category = document.createElement("p");
    category.className = "resource-category";
    category.textContent = item.category || "Editing resource";

    card.append(heading, category);

    if (item.url && isImageResource(item.url)) {
      const image = document.createElement("img");
      image.className = "resource-preview";
      image.src = item.url;
      image.alt = item.title || "Editing resource preview";
      image.loading = "lazy";

      image.addEventListener("error", () => {
        image.remove();
      });

      card.append(image);
    }

    if (item.url) {
      const link = document.createElement("a");
      link.className = "resource-download";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open / Download resource";
      link.setAttribute("download", "");
      card.append(link);
    }

    const date = dateLabel(item.createdAt);

    if (date) {
      const small = document.createElement("small");
      small.textContent = date;
      card.append(small);
    }

    library.append(card);
  });
}

async function loadResources() {
  try {
    allResources = await readCollection("resources", 100);

    allResources.sort((a, b) =>
      (b.createdAt?.seconds || 0) -
      (a.createdAt?.seconds || 0)
    );

    renderResources();
  } catch (error) {
    console.error("Resources:", error);
    showMessage(
      "resourceStatus",
      "Could not load resources. Please try again."
    );
  }
}

if ($("publishResource")) {
  $("publishResource").addEventListener(
    "click",
    async () => {
      if (!isOwner()) return;

      const title = $("resourceTitle")?.value.trim();
      const category = $("resourceCategory")?.value.trim();
      const url = $("resourceUrl")?.value.trim();

      if (!title || !url || !/^https:\/\//i.test(url)) {
        showMessage(
          "resourceStatus",
          "Add a title and a secure HTTPS resource link."
        );
        return;
      }

      try {
        await addDoc(collection(db, "resources"), {
          title,
          category: category || "Editing resource",
          url,
          authorUid: currentUser.uid,
          createdAt: serverTimestamp()
        });

        $("resourceTitle").value = "";
        $("resourceCategory").value = "";
        $("resourceUrl").value = "";

        showMessage(
          "resourceStatus",
          "Resource added successfully."
        );

        selectedResourceCategory = "All";
        await loadResources();
      } catch (error) {
        showMessage(
          "resourceStatus",
          "Could not add resource: " + error.message
        );
      }
    }
  );
}

// COLLABORATION BOARD

async function loadCollabs() {
  try {
    const items = await readCollection("collabs", 60);

    showList(
      "collabBoard",
      items.map(item =>
        makeCard(
          `${item.type || "Collaboration"} — ${item.handle || "Member"}`,
          item.details || "",
          dateLabel(item.createdAt)
        )
      ),
      "No collaboration posts yet."
    );
  } catch (error) {
    console.error("Collaborations:", error);
  }
}

if ($("postCollab")) {
  $("postCollab").addEventListener(
    "click",
    async () => {
      if (!currentUser) return;

      const type = $("collabType")?.value || "Collaboration";
      const details = $("collabDetails")?.value.trim();

      if (!details || details.length < 5) {
        showMessage(
          "collabStatus",
          "Write more about your collaboration."
        );
        return;
      }

      try {
        await addDoc(collection(db, "collabs"), {
          uid: currentUser.uid,
          handle: $("igHandle")?.value.trim() || "BLISS member",
          type,
          details,
          createdAt: serverTimestamp()
        });

        $("collabDetails").value = "";

        showMessage(
          "collabStatus",
          "Your collaboration post is live."
        );

        loadCollabs();
      } catch (error) {
        showMessage(
          "collabStatus",
          "Could not post: " + error.message
        );
      }
    }
  );
}

// FOLLOW-FOR-FOLLOW SUPPORT BOARD

async function loadSupport() {
  try {
    const items = await readCollection("supportPosts", 80);

    showList(
      "supportBoard",
      items.map(item =>
        makeCard(
          `${item.handle || "Member"} · ${item.type || "Support"}`,
          "Visit their profile and support each other respectfully.",
          dateLabel(item.createdAt),
          item.link
        )
      ),
      "No support members yet."
    );
  } catch (error) {
    console.error("Support:", error);
  }
}

if ($("joinSupport")) {
  $("joinSupport").addEventListener(
    "click",
    async () => {
      if (!currentUser) return;

      const handle = $("supportHandle")?.value.trim();
      const link = $("supportLink")?.value.trim();
      const type = $("supportType")?.value || "Mutual support";

      if (
        !handle ||
        !link ||
        !/^https:\/\/(www\.)?instagram\.com\//i.test(link)
      ) {
        showMessage(
          "supportStatus",
          "Enter your Instagram username and profile link."
        );
        return;
      }

      try {
        await addDoc(collection(db, "supportPosts"), {
          uid: currentUser.uid,
          handle,
          link,
          type,
          createdAt: serverTimestamp()
        });

        showMessage(
          "supportStatus",
          "Your support post has been added."
        );

        loadSupport();
      } catch (error) {
        showMessage(
          "supportStatus",
          "Could not join: " + error.message
        );
      }
    }
  );
}

// HELP DESK

if ($("sendHelp")) {
  $("sendHelp").addEventListener(
    "click",
    async () => {
      if (!currentUser) return;

      const message = $("helpMessage")?.value.trim();

      if (!message || message.length < 5) {
        showMessage(
          "helpStatus",
          "Please write your message first."
        );
        return;
      }

      try {
        await addDoc(collection(db, "helpRequests"), {
          uid: currentUser.uid,
          message,
          status: "new",
          createdAt: serverTimestamp()
        });

        $("helpMessage").value = "";

        showMessage(
          "helpStatus",
          "Your help request has been sent."
        );
      } catch (error) {
        showMessage(
          "helpStatus",
          "Could not send: " + error.message
        );
      }
    }
  );
}

// EDIT SUBMISSIONS

if ($("submitEdit")) {
  $("submitEdit").addEventListener(
    "click",
    async () => {
      if (!currentUser) return;

      const link = $("editSubmissionLink")?.value.trim();
      const note = $("editSubmissionNote")?.value.trim() || "";

      if (!link || !/^https:\/\//i.test(link)) {
        showMessage(
          "submissionStatus",
          "Enter a valid link to your edit."
        );
        return;
      }

      try {
        await addDoc(collection(db, "editSubmissions"), {
          uid: currentUser.uid,
          link,
          note,
          status: "new",
          createdAt: serverTimestamp()
        });

        $("editSubmissionLink").value = "";
        $("editSubmissionNote").value = "";

        showMessage(
          "submissionStatus",
          "Your edit has been submitted."
        );
      } catch (error) {
        showMessage(
          "submissionStatus",
          "Could not submit: " + error.message
        );
      }
    }
  );
}

// OWNER OFFICIAL POSTS

async function loadOwnerPosts() {
  try {
    const posts = await readCollection("ownerPosts", 50);

    posts.sort((a, b) =>
      (b.createdAt?.seconds || 0) -
      (a.createdAt?.seconds || 0)
    );

    const container = $("ownerPosts");
    if (!container) return;

    container.replaceChildren();

    posts.forEach(post => {
      const card = makeCard(
        post.title,
        post.caption,
        dateLabel(post.createdAt)
      );

      if (post.imageUrl) {
        const image = document.createElement("img");
        image.src = post.imageUrl;
        image.alt = post.title || "BLISS post";
        image.loading = "lazy";
        card.prepend(image);
      }

      container.append(card);
    });

    if (!posts.length) {
      container.textContent =
        "Official BLISS posts will appear here.";
    }
  } catch (error) {
    console.error("Owner posts:", error);
  }
}

if ($("publishPost")) {
  $("publishPost").addEventListener(
    "click",
    async () => {
      if (!isOwner()) return;

      const title = $("postTitle")?.value.trim();
      const imageUrl = $("postImageUrl")?.value.trim();
      const caption = $("postCaption")?.value.trim();

      if (!title || !caption) {
        showMessage(
          "postStatus",
          "Add a post title and caption."
        );
        return;
      }

      if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
        showMessage(
          "postStatus",
          "Image link must start with https://"
        );
        return;
      }

      try {
        await addDoc(collection(db, "ownerPosts"), {
          title,
          imageUrl,
          caption,
          authorUid: currentUser.uid,
          createdAt: serverTimestamp()
        });

        $("postTitle").value = "";
        $("postImageUrl").value = "";
        $("postCaption").value = "";

        showMessage(
          "postStatus",
          "Official post published."
        );

        loadOwnerPosts();
      } catch (error) {
        showMessage(
          "postStatus",
          "Could not publish: " + error.message
        );
      }
    }
  );
}

// OWNER AVATAR

async function loadOwnerAvatar() {
  try {
    const result = await getDoc(
      doc(db, "siteSettings", "owner")
    );

    if (!result.exists()) return;

    const url = result.data().avatarUrl;
    if (!url) return;

    if ($("officialAvatar")) {
      $("officialAvatar").src = url;
    }

    if ($("ownerAvatarUrl")) {
      $("ownerAvatarUrl").value = url;
    }
  } catch (error) {
    console.error("Owner avatar:", error);
  }
}

if ($("saveOwnerAvatar")) {
  $("saveOwnerAvatar").addEventListener(
    "click",
    async () => {
      if (!isOwner()) return;

      const url = $("ownerAvatarUrl")?.value.trim();

      if (!url || !/^https:\/\//i.test(url)) {
        showMessage(
          "avatarStatus",
          "Enter a valid image link."
        );
        return;
      }

      try {
        await setDoc(
          doc(db, "siteSettings", "owner"),
          {
            avatarUrl: url,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );

        if ($("officialAvatar")) {
          $("officialAvatar").src = url;
        }

        showMessage("avatarStatus", "Avatar link saved.");
      } catch (error) {
        showMessage(
          "avatarStatus",
          "Could not save avatar: " + error.message
        );
      }
    }
  );
}

// MESSAGE REQUESTS
// Private conversations remain disabled until secure rules are added.

if ($("sendMessageRequest")) {
  $("sendMessageRequest").addEventListener(
    "click",
    async () => {
      if (!currentUser) return;

      const handle = $("messageRecipient")
        ?.value.trim().replace(/^@/, "");

      const message = $("messageRequestText")
        ?.value.trim();

      if (!handle || !message) {
        showMessage(
          "messageRequestStatus",
          "Enter a username and message."
        );
        return;
      }

      try {
        const profiles = await getDocs(
          query(
            collection(db, "publicProfiles"),
            limit(100)
          )
        );

        const match = profiles.docs.find(item =>
          (item.data().handle || "")
            .replace(/^@/, "")
            .toLowerCase() === handle.toLowerCase()
        );

        if (!match) {
          showMessage(
            "messageRequestStatus",
            "Member not found. Check the username."
          );
          return;
        }

        if (match.id === currentUser.uid) {
          showMessage(
            "messageRequestStatus",
            "You cannot message yourself."
          );
          return;
        }

        await addDoc(collection(db, "messageRequests"), {
          fromUid: currentUser.uid,
          toUid: match.id,
          message,
          status: "pending",
          createdAt: serverTimestamp()
        });

        $("messageRequestText").value = "";

        showMessage(
          "messageRequestStatus",
          "Message request sent."
        );

        loadMessages();
      } catch (error) {
        showMessage(
          "messageRequestStatus",
          "Could not send request: " + error.message
        );
      }
    }
  );
}

async function loadMessages() {
  if (!currentUser) return;

  try {
    const requests = await getDocs(
      query(
        collection(db, "messageRequests"),
        where("toUid", "==", currentUser.uid),
        limit(40)
      )
    );

    const sent = await getDocs(
      query(
        collection(db, "messageRequests"),
        where("fromUid", "==", currentUser.uid),
        limit(40)
      )
    );

    const cards = [];

    requests.docs.forEach(item => {
      const data = item.data();

      if (data.status !== "pending") return;

      const card = makeCard(
        "New message request",
        data.message || ""
      );

      const note = document.createElement("p");
      note.textContent = "Request from a BLISS member";
      card.append(note);

      cards.push(card);
    });

    sent.docs.forEach(item => {
      if (item.data().status === "pending") {
        cards.push(
          makeCard(
            "Request sent",
            "Waiting for the member to respond."
          )
        );
      }
    });

    showList(
      "messageRequests",
      cards,
      "No new message requests."
    );

    showList(
      "conversations",
      [],
      "Private chats are not enabled yet."
    );
  } catch (error) {
    console.error("Messages:", error);
  }
}

// FINAL INITIALIZATION

console.log("BLISS app loaded.");


  

