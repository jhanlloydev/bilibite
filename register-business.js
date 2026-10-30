import { initializeApp } 
from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getDatabase, ref, push, set }
from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

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
const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

const businessForm = document.getElementById("businessForm");



businessForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const businessName = document.getElementById("businessName").value;
    const ownerName = document.getElementById("ownerName").value;
    const barangay = document.getElementById("barangay").value;
    const description = document.getElementById("description").value;

    const businessRef = push(ref(db, "businesses"));

set(businessRef, {
    businessName: businessName,
    ownerName: ownerName,
    barangay: barangay,
    description: description
})
.then(function() {

    console.log("SUCCESS! Na-save sa Firebase.");

    alert("Business registered successfully!");

})
.catch(function(error) {

    console.error("Firebase Error:", error);

    alert("Hindi na-save. Tingnan ang Console.");

});
});

