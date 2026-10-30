import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    get,
    set
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAQ0h4nVny5sBeEB0rlK81Kl2-c_XcsXGM",
    authDomain: "bilibite.firebaseapp.com",
    databaseURL: "https://bilibite-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bilibite",
    storageBucket: "bilibite.firebasestorage.app",
    messagingSenderId: "980005954292",
    appId: "1:980005954292:web:68dff460d469d78f1c34a1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const form = document.getElementById("sellerInfoForm");

const allowedHosts = [
    "facebook.com",
    "www.facebook.com",
    "m.facebook.com",
    "web.facebook.com",
    "fb.com",
    "www.fb.com"
];

const allowedDelivery = ["lalamove", "pickup", "meetup", "seller"];

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        const snapshot = await get(ref(db, "sellerContacts/" + user.uid));

        if (snapshot.exists()) {
            // May record na: diretso sa seller dashboard.
            window.location.href = "seller.html";
        }

    } catch (error) {
        console.error("Error checking seller record:", error);
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const facebookLink = document.getElementById("facebookLink").value.trim();
    const mobileNumber = document.getElementById("mobileNumber").value.trim();

    const message = document.getElementById("message");
    const saveBtn = document.getElementById("saveBtn");

    // Kunin ang mga naka-check na delivery method
    const deliveryMethods = Array.from(
        document.querySelectorAll('input[name="deliveryMethod"]:checked')
    )
        .map((box) => box.value)
        .filter((value) => allowedDelivery.includes(value));

    if (!/^09\d{9}$/.test(mobileNumber)) {
        message.textContent = "Enter a valid 11-digit mobile number.";
        return;
    }

    if (deliveryMethods.length === 0) {
        message.textContent = "Pumili ng kahit isang delivery method.";
        return;
    }

    try {
        const url = new URL(facebookLink);

        if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
            message.textContent = "Enter a valid Facebook link.";
            return;
        }

        saveBtn.disabled = true;
        message.textContent = "Saving...";

        await set(ref(db, "sellerContacts/" + user.uid), {
            facebookLink: url.href,
            mobileNumber: mobileNumber,
            deliveryMethods: deliveryMethods,
            email: user.email || "",
            updatedAt: Date.now()
        });

        window.location.href = "seller.html";

    } catch (error) {
        console.error("Firebase error:", error);
        message.textContent = "Unable to save. Check your Firebase Database Rules.";
        saveBtn.disabled = false;
    }
});