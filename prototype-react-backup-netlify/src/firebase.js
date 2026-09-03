import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// =========================================================================
// 🔥 FIREBASE SDK CONFIGURATION
// =========================================================================
// Replace these placeholders with your actual Web App credentials from the Firebase Console.
// Go to: Project Settings -> General -> Under "Your apps" section.
const firebaseConfig = {
  apiKey: "AIzaSyAsT4m1UXClW6Z7-kbQMn3yf2RoH_wQYuQ",
  authDomain: "scot-website-bd617.firebaseapp.com",
  projectId: "scot-website-bd617",
  storageBucket: "scot-website-bd617.appspot.com",
  messagingSenderId: "128590748101",
  appId: "1:128590748101:web:1dc7e2eab8845fa91a93ac"
};

// Paste your Web Push VAPID Key pair below.
// Go to: Project Settings -> Cloud Messaging -> Web Configuration -> Generate Key pair
export const VAPID_KEY = "BGVnUUCelDd_pwoP6RWHYzNtx_oiJb4xL4o_IPMrtYR22I8fT9vD0zeYzr3IkIDtTO7xfggKNTuvAzz-zemc5Eg";

const app = initializeApp(firebaseConfig);
let messaging = null;

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.error("Firebase Messaging failed to initialize: ", err);
  }
}

export { messaging };

export const requestForToken = async () => {
  if (!messaging) return null;
  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      return currentToken;
    } else {
      console.log('No FCM registration token available.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving FCM token: ', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
