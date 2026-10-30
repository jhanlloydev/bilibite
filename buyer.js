import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getDatabase,
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


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


// Connect to Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);


// Get elements from HTML
const mainView = document.getElementById("mainView");
const sellerView = document.getElementById("sellerView");
const foodList = document.getElementById("foodList");
const sellerProductList = document.getElementById("sellerProductList");
const sellerTitle = document.getElementById("sellerTitle");
const sellerAvatar = document.getElementById("sellerAvatar");
const messengerLink = document.getElementById("messengerLink");
const whatsappLink = document.getElementById("whatsappLink");
const noContactMessage = document.getElementById("noContactMessage");
const backButton = document.getElementById("backButton");
const deliveryInfo = document.getElementById("deliveryInfo");
const deliveryList = document.getElementById("deliveryList");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultCount = document.getElementById("resultCount");
const mapLink = document.getElementById("mapLink");
const sellerLocationText = document.getElementById("sellerLocationText");
const locationFilter = document.getElementById("locationFilter");


const DELIVERY_LABELS = {
    lalamove: "🛵 Lalamove",
    pickup: "🏪 Pickup",
    meetup: "🤝 Meetup",
    seller: "🚚 Deliver by Seller"
};


// Lahat ng products: { sellerId: { productId: product } }
let productsData = {};

// Lahat ng contact info: { sellerId: { facebookLink, mobileNumber, location, deliveryMethods } }
let contactsData = {};
let contactsError = false;

// Sinong seller ang nakabukas (null = main page)
let currentSellerId = null;

// Search text at napiling lugar
let searchTerm = "";
let selectedLocation = "";


// Make text safe before putting it inside HTML
function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : text;
    return div.innerHTML;
}


// 09XXXXXXXXX -> 639XXXXXXXXX (kailangan ito ng WhatsApp)
function toWhatsAppNumber(mobile) {
    return "63" + String(mobile).replace(/\D/g, "").replace(/^0/, "");
}


// Tanggapin lang ang http/https links
function safeUrl(url) {
    return /^https?:\/\//i.test(url) ? url : "#";
}


// Gawing pare-pareho ang location para sa filter ("Brgy. San Isidro" = "brgy. san isidro")
function locationKey(location) {
    return String(location || "").trim().toLowerCase().replace(/\s+/g, " ");
}


// Gumawa ng HTML ng delivery tags
function deliveryTagsHTML(methods, className) {
    if (!Array.isArray(methods) || methods.length === 0) return "";

    return methods.map(function(method) {
        return `<span class="${className}">${escapeHTML(DELIVERY_LABELS[method] || method)}</span>`;
    }).join("");
}


// ===== GUMAWA NG PRODUCT CARD =====
function createProductCard(product, sellerId) {

    // Walang "available" field = available (para sa lumang products)
    const isAvailable = product.available !== false;
    const info = contactsData[sellerId] || {};

    const card = document.createElement("div");
    card.className = "product-card" + (isAvailable ? "" : " unavailable");

    card.innerHTML = `
        <div class="card-image">
            <img class="product-photo" src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
            <span class="status-badge ${isAvailable ? "status-available" : "status-unavailable"}">
                ${isAvailable ? "Available" : "Not Available"}
            </span>
        </div>

        <div class="card-body">
            <h3>${escapeHTML(product.name)}</h3>
            <p class="desc">${escapeHTML(product.description)}</p>
            <p class="price">₱${escapeHTML(String(product.price))}</p>

            ${info.location ? `<p class="card-location">📍 ${escapeHTML(info.location)}</p>` : ""}

            <div class="card-delivery">
                ${deliveryTagsHTML(info.deliveryMethods, "mini-tag")}
            </div>

            <p class="seller">
                by <button type="button" class="seller-link">${escapeHTML(product.sellerName || "Seller")}</button>
            </p>
        </div>
    `;

    // Pindutin ang pangalan ng seller o ang photo -> bubukas ang seller page
    const open = function() {
        openSeller(sellerId, product.sellerName);
    };

    card.querySelector(".seller-link").addEventListener("click", open);
    card.querySelector(".product-photo").addEventListener("click", open);

    return card;
}


// ===== LOCATION FILTER OPTIONS =====
function updateLocationOptions() {

    // { key: label } galing sa mga seller na may products
    const found = {};

    Object.keys(productsData).forEach(function(sellerId) {
        const info = contactsData[sellerId];

        if (info && info.location) {
            const key = locationKey(info.location);
            if (key && !found[key]) {
                found[key] = info.location.trim();
            }
        }
    });

    const keys = Object.keys(found).sort(function(a, b) {
        return found[a].localeCompare(found[b]);
    });

    // Kung wala na ang napiling lugar, bumalik sa "Lahat"
    if (selectedLocation && !found[selectedLocation]) {
        selectedLocation = "";
    }

    locationFilter.innerHTML = `<option value="">Lahat ng lugar</option>`;

    keys.forEach(function(key) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = found[key];
        locationFilter.appendChild(option);
    });

    locationFilter.value = selectedLocation;
}


// ===== IPAKITA ANG MGA PRODUCTS =====
function renderMain() {

    foodList.innerHTML = "";

    const keyword = searchTerm.trim().toLowerCase();
    let shown = 0;
    let total = 0;

    Object.keys(productsData).forEach(function(sellerId) {
        const products = productsData[sellerId];
        const info = contactsData[sellerId] || {};

        Object.keys(products).forEach(function(productId) {
            const product = products[productId];
            total++;

            // Filter sa lugar
            if (selectedLocation && locationKey(info.location) !== selectedLocation) return;

            // Search (pangalan ng food, description, seller, lugar)
            const text = (
                (product.name || "") + " " +
                (product.description || "") + " " +
                (product.sellerName || "") + " " +
                (info.location || "")
            ).toLowerCase();

            if (keyword && !text.includes(keyword)) return;

            foodList.appendChild(createProductCard(product, sellerId));
            shown++;
        });
    });

    if (total === 0) {
        foodList.innerHTML = `<p class="empty-message">Wala pang food na naka-post.</p>`;
        resultCount.textContent = "";
        return;
    }

    if (shown === 0) {
        foodList.innerHTML = `<p class="empty-message">Walang nahanap. Subukan ang ibang salita o lugar.</p>`;
    }

    resultCount.textContent = shown + (shown === 1 ? " item" : " items");
}

function renderSellerProducts() {

    sellerProductList.innerHTML = "";

    const products = productsData[currentSellerId];

    if (!products) {
        sellerProductList.innerHTML = `<p class="empty-message">Wala pang binebenta ang seller na ito.</p>`;
        return;
    }

    Object.keys(products).forEach(function(productId) {
        sellerProductList.appendChild(createProductCard(products[productId], currentSellerId));
    });
}


// ===== SEARCH AT FILTER =====
function doSearch() {
    searchTerm = searchInput.value;
    renderMain();
}

searchInput.addEventListener("input", doSearch);
searchButton.addEventListener("click", doSearch);

locationFilter.addEventListener("change", function() {
    selectedLocation = locationFilter.value;
    renderMain();
});


// ===== SELLER PAGE =====
function renderSellerInfo() {

    if (!currentSellerId) return;

    const info = contactsData[currentSellerId];

    // I-reset muna
    messengerLink.style.display = "none";
    whatsappLink.style.display = "none";
    noContactMessage.hidden = true;
    deliveryInfo.hidden = true;
    mapLink.hidden = true;

    if (contactsError) {
        noContactMessage.textContent = "Hindi makuha ang contact info ng seller.";
        noContactMessage.hidden = false;
        return;
    }

    if (!info) {
        noContactMessage.textContent = "Walang contact info ang seller na ito.";
        noContactMessage.hidden = false;
        return;
    }

    if (info.location) {
        sellerLocationText.textContent = info.location;
        mapLink.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(info.location);
        mapLink.hidden = false;
    }

    if (info.facebookLink) {
        messengerLink.href = safeUrl(info.facebookLink);
        messengerLink.style.display = "";
    }

    if (info.mobileNumber) {
        whatsappLink.href = "https://wa.me/" + toWhatsAppNumber(info.mobileNumber);
        whatsappLink.style.display = "";
    }

    if (!info.facebookLink && !info.mobileNumber) {
        noContactMessage.textContent = "Walang contact info ang seller na ito.";
        noContactMessage.hidden = false;
    }

    if (Array.isArray(info.deliveryMethods) && info.deliveryMethods.length > 0) {
        deliveryList.innerHTML = deliveryTagsHTML(info.deliveryMethods, "delivery-tag");
        deliveryInfo.hidden = false;
    }
}

function openSeller(sellerId, sellerName) {

    currentSellerId = sellerId;

    const name = sellerName || "Seller";
    sellerTitle.textContent = name;
    sellerAvatar.textContent = name.trim().charAt(0).toUpperCase() || "S";

    // Palitan ang page
    mainView.hidden = true;
    sellerView.hidden = false;
    window.scrollTo(0, 0);

    renderSellerInfo();
    renderSellerProducts();
}

function closeSeller() {
    currentSellerId = null;
    sellerView.hidden = true;
    mainView.hidden = false;
}

backButton.addEventListener("click", closeSeller);


// ===== REFRESH LAHAT =====
function refreshAll() {
    updateLocationOptions();
    renderMain();

    // Kung nakabukas ang seller page, i-update din (live)
    if (currentSellerId) {
        renderSellerInfo();
        renderSellerProducts();
    }
}


// Check if user is logged in
onAuthStateChanged(auth, function(user) {

    // If user is NOT logged in
    if (!user) {
        window.location.href = "login.html";
        return;
    }


    // Show the client's name
    const clientName = document.getElementById("clientName");

    if (clientName) {
        clientName.textContent = user.displayName || "Client";
    }


    // ===== CART COUNT =====
    const cartCount = document.getElementById("cartCount");
    const cartRef = ref(db, "carts/" + user.uid);

    onValue(cartRef, function(snapshot) {

        let total = 0;

        snapshot.forEach(function(item) {
            total += item.val().quantity || 1;
        });

        if (cartCount) {
            cartCount.textContent = total;
        }
    }, function(error) {
        console.error("Cart error:", error);
    });


    // ===== CONTACT INFO NG LAHAT NG SELLERS =====
    onValue(ref(db, "sellerContacts"), function(snapshot) {

        contactsError = false;
        contactsData = {};

        snapshot.forEach(function(child) {
            const value = child.val() || {};

            // Kunin lang ang kailangan (hindi isinasama ang email)
            contactsData[child.key] = {
                facebookLink: value.facebookLink,
                mobileNumber: value.mobileNumber,
                location: value.location,
                deliveryMethods: value.deliveryMethods
            };
        });

        refreshAll();

    }, function(error) {
        console.error("Contacts error:", error);
        contactsError = true;
        refreshAll();
    });


    // ===== FOODS FROM ALL SELLERS =====
    onValue(ref(db, "products"), function(snapshot) {

        productsData = {};

        snapshot.forEach(function(sellerSnapshot) {
            productsData[sellerSnapshot.key] = sellerSnapshot.val();
        });

        refreshAll();
    });

});