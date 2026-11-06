// ---------- Firebase setup ----------
// 1. Firebase console > Project settings > Your apps > Web app
// 2. Paste your own values below
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
};

if (firebaseConfig.apiKey === "YOUR_API_KEY") {
  console.warn("Sweet Home: paste your Firebase config in auth.js");
}

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ---------- Readable error messages ----------
function friendly(code) {
  const messages = {
    "auth/email-already-in-use": "This email already has an account. Try logging in.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use a password of at least 6 characters.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/network-request-failed": "Network problem. Check your connection and try again.",
    "auth/unauthorized-domain": "This domain is not authorized. Add it in Firebase > Authentication > Settings > Authorized domains.",
    "auth/operation-not-supported-in-this-environment": "Open the site with Live Server or from GitHub Pages, not as a local file."
  };
  return messages[code] || "Something went wrong. Try again.";
}

// ---------- Navbar: login buttons <-> profile menu ----------
const authButtons = document.getElementById("authButtons");
const profileMenu = document.getElementById("profileMenu");
if (authButtons) authButtons.hidden = true;   // hide both until Firebase answers
if (profileMenu) profileMenu.hidden = true;

auth.onAuthStateChanged(user => {
  if (!authButtons || !profileMenu) return;
  authButtons.hidden = !!user;
  profileMenu.hidden = !user;
  if (user) {
    const name = user.displayName || (user.email || "").split("@")[0] || "Profile";
    document.getElementById("profileName").textContent = name + " ▾";
  }
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", e => {
    e.preventDefault();
    auth.signOut();
  });
}
