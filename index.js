
import { initializeApp } 
from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAQ0h4nVny5sBeEB0rlK81Kl2-c_XcsXGM",
    authDomain: "bilibite.firebaseapp.com",
    databaseURL: "https://bilibite-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bilibite",
    storageBucket: "bilibite.firebasestorage.app",
    messagingSenderId: "980005954292",
    appId: "1:980005954292:web:68dff460d469d78f1c34a1",
    measurementId: "G-7G80NDJ7CM"
};


// Start Firebase
const app = initializeApp(firebaseConfig);


// Firebase Authentication
const auth = getAuth(app);


// Google provider
const provider = new GoogleAuthProvider();


// Google button
const googleBtn = document.getElementById("googleBtn");


googleBtn.addEventListener("click", () => {

    signInWithPopup(auth, provider)

        .then((result) => {

            const user = result.user;

            console.log("Login successful!");
            console.log("Name:", user.displayName);
            console.log("Email:", user.email);

            // Go to Bili-Bite homepage
            window.location.href = "role.html";

        })

        .catch((error) => {

            console.error("Firebase Error:", error);

            // Ipakita ang actual error
            alert("Login failed: " + error.code);

        });

});