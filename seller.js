import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    push,
    remove,
    update,
    get,
    onValue
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";


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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


// Get elements from HTML
const sellerName = document.getElementById("sellerName");
const addFoodButton = document.getElementById("addFoodButton");
const cancelButton = document.getElementById("cancelButton");
const addProductSection = document.getElementById("addProductSection");
const productForm = document.getElementById("productForm");
const productList = document.getElementById("productList");

// Edit profile
const editProfileButton = document.getElementById("editProfileButton");
const profileModal = document.getElementById("profileModal");
const profileForm = document.getElementById("profileForm");
const closeProfileModal = document.getElementById("closeProfileModal");
const cancelProfileButton = document.getElementById("cancelProfileButton");
const saveProfileButton = document.getElementById("saveProfileButton");
const profileMessage = document.getElementById("profileMessage");

const allowedHosts = [
    "facebook.com",
    "www.facebook.com",
    "m.facebook.com",
    "web.facebook.com",
    "fb.com",
    "www.fb.com"
];

const allowedDelivery = ["lalamove", "pickup", "meetup", "seller"];


// Show / hide the add food form
addFoodButton.addEventListener("click", function() {
    addProductSection.style.display = "block";
});

cancelButton.addEventListener("click", function() {
    addProductSection.style.display = "none";
    productForm.reset();
});


// Make text safe before putting it inside HTML
function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : text;
    return div.innerHTML;
}


// Shrink the image so it's small enough to save in the database
function resizeImage(file) {
    return new Promise(function(resolve, reject) {

        const reader = new FileReader();

        reader.onload = function() {

            const img = new Image();

            img.onload = function() {
                const maxWidth = 400;
                const scale = Math.min(1, maxWidth / img.width);

                const canvas = document.createElement("canvas");
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;

                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL("image/jpeg", 0.7));
            };

            img.onerror = reject;
            img.src = reader.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


// Check who is logged in
onAuthStateChanged(auth, function(user) {

    // Not logged in? Go back to login
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Show seller's name
    sellerName.textContent = user.displayName || "Seller";

    // This seller's own drawer in the database
    const myProductsRef = ref(db, "products/" + user.uid);


    // ===== EDIT PROFILE =====
    function closeProfile() {
        profileModal.hidden = true;
        profileMessage.textContent = "";
    }

    editProfileButton.addEventListener("click", async function() {

        profileMessage.textContent = "";

        // Ilagay ang kasalukuyang info sa form
        document.getElementById("editName").value = user.displayName || "";
        document.getElementById("editFacebook").value = "";
        document.getElementById("editMobile").value = "";
        document.getElementById("editLocation").value = "";
        document.querySelectorAll('input[name="editDelivery"]').forEach(function(box) {
            box.checked = false;
        });

        profileModal.hidden = false;

        try {
            const snap = await get(ref(db, "sellerContacts/" + user.uid));
            const info = snap.val() || {};

            document.getElementById("editFacebook").value = info.facebookLink || "";
            document.getElementById("editMobile").value = info.mobileNumber || "";
            document.getElementById("editLocation").value = info.location || "";

            const saved = Array.isArray(info.deliveryMethods) ? info.deliveryMethods : [];

            document.querySelectorAll('input[name="editDelivery"]').forEach(function(box) {
                box.checked = saved.includes(box.value);
            });

        } catch (error) {
            console.error(error);
            profileMessage.textContent = "Hindi makuha ang dating info. Pwede ka pa ring mag-type ng bago.";
        }
    });

    closeProfileModal.addEventListener("click", closeProfile);
    cancelProfileButton.addEventListener("click", closeProfile);

    profileModal.addEventListener("click", function(e) {
        if (e.target === profileModal) closeProfile();
    });

    profileForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const name = document.getElementById("editName").value.trim();
        const facebookLink = document.getElementById("editFacebook").value.trim();
        const mobileNumber = document.getElementById("editMobile").value.trim();
        const location = document.getElementById("editLocation").value.trim();

        const deliveryMethods = Array.from(
            document.querySelectorAll('input[name="editDelivery"]:checked')
        )
            .map(function(box) { return box.value; })
            .filter(function(value) { return allowedDelivery.includes(value); });

        // Validation
        if (name.length < 2) {
            profileMessage.textContent = "Masyadong maikli ang pangalan.";
            return;
        }

        if (!/^09\d{9}$/.test(mobileNumber)) {
            profileMessage.textContent = "Enter a valid 11-digit mobile number.";
            return;
        }

        if (location.length < 3) {
            profileMessage.textContent = "Ilagay ang location mo (barangay o lugar).";
            return;
        }

        if (deliveryMethods.length === 0) {
            profileMessage.textContent = "Pumili ng kahit isang delivery method.";
            return;
        }

        let url;

        try {
            url = new URL(facebookLink);
        } catch (e) {
            profileMessage.textContent = "Enter a valid Facebook link.";
            return;
        }

        if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
            profileMessage.textContent = "Enter a valid Facebook link.";
            return;
        }

        saveProfileButton.disabled = true;
        profileMessage.textContent = "Saving...";

        try {

            // 1. I-save ang contact info
            await update(ref(db, "sellerContacts/" + user.uid), {
                facebookLink: url.href,
                mobileNumber: mobileNumber,
                location: location,
                deliveryMethods: deliveryMethods,
                email: user.email || "",
                updatedAt: Date.now()
            });

            // 2. Kung nagpalit ng pangalan
            if (name !== (user.displayName || "")) {

                await updateProfile(user, { displayName: name });

                // I-update ang sellerName ng lahat ng products
                const productsSnap = await get(myProductsRef);
                const changes = {};

                productsSnap.forEach(function(child) {
                    changes[child.key + "/sellerName"] = name;
                });

                if (Object.keys(changes).length > 0) {
                    await update(myProductsRef, changes);
                }

                sellerName.textContent = name;
            }

            closeProfile();
            alert("Na-save na ang profile details mo!");

        } catch (error) {
            console.error(error);
            profileMessage.textContent = "Hindi na-save. Tingnan ang console (F12) o ang Firebase Rules.";
        }

        saveProfileButton.disabled = false;
    });


    // ===== ADD FOOD =====
    productForm.addEventListener("submit", async function(event) {

        // Stop the page from refreshing
        event.preventDefault();

        const saveButton = productForm.querySelector(".save-button");
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const file = document.getElementById("productImage").files[0];
            const image = await resizeImage(file);

            await push(myProductsRef, {
                name: document.getElementById("productName").value,
                description: document.getElementById("productDescription").value,
                price: Number(document.getElementById("productPrice").value),
                available: document.getElementById("productAvailable").value === "true",
                image: image,
                sellerName: user.displayName || "Seller",
                sellerId: user.uid
            });

            productForm.reset();
            addProductSection.style.display = "none";

        } catch (error) {
            console.error(error);
            alert("May error sa pag-save. Tingnan ang console (F12).");
        }

        saveButton.disabled = false;
        saveButton.textContent = "Add Product";
    });


    // ===== SHOW MY PRODUCTS =====
    onValue(myProductsRef, function(snapshot) {

        productList.innerHTML = "";

        // No products yet
        if (!snapshot.exists()) {
            productList.innerHTML = `<p class="empty-message">Wala ka pang products. Pindutin ang "+ Add Food"!</p>`;
            return;
        }

        snapshot.forEach(function(child) {

            const product = child.val();

            // Walang "available" field = available (lumang products)
            const isAvailable = product.available !== false;

            if (!product.sellerName) {
                update(ref(db, "products/" + user.uid + "/" + child.key), {
                    sellerName: user.displayName || "Seller"
                });
            }

            const card = document.createElement("div");
            card.className = "product-card" + (isAvailable ? "" : " unavailable");

            card.innerHTML = `
                <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">

                <div class="product-info">
                    <h3>${escapeHTML(product.name)}</h3>
                    <p>${escapeHTML(product.description)}</p>
                    <p class="price">₱${escapeHTML(String(product.price))}</p>

                    <label class="availability-label">Availability</label>
                    <select class="availability-select">
                        <option value="true" ${isAvailable ? "selected" : ""}>Available</option>
                        <option value="false" ${!isAvailable ? "selected" : ""}>Not Available</option>
                    </select>

                    <button class="delete-button">Delete Product</button>
                </div>
            `;

            // Palitan ang Available / Not Available
            card.querySelector(".availability-select").addEventListener("change", function(e) {
                update(ref(db, "products/" + user.uid + "/" + child.key), {
                    available: e.target.value === "true"
                }).catch(function(error) {
                    console.error(error);
                    alert("Hindi na-update ang availability.");
                });
            });

            // Delete button
            card.querySelector(".delete-button").addEventListener("click", function() {
                if (confirm("Burahin ang product na ito?")) {
                    remove(ref(db, "products/" + user.uid + "/" + child.key));
                }
            });

            productList.appendChild(card);
        });
    });

});