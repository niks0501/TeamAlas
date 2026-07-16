const API_KEY = "live_V1dCv4fnrGy38cwRls4rPZMr0lGCtKisQt9ZwatL0zPyOMIhdssWFyOaoTbMRyjW";
const BASE_URL = "https://api.thecatapi.com/v1";

// State variables used throughout the app
let currentCatId = null;
let currentCatUrl = null;
let currentCatBreed = null;
let upvoteCount = 0;
let downvoteCount = 0;
let breedsData = [];

// DOM element references
const dom = {
    errorMessage: null,
    breedSelect: null,
    catImage: null,
    currentCatLabel: null,
    currentBreedLabel: null,
    breedName: null,
    breedTemperament: null,
    breedLifeSpan: null,
    breedOrigin: null,
    voteUpCount: null,
    voteDownCount: null,
    favoritesGallery: null,
    refreshFavorites: null,
    fullScreenOverlay: null,
    fullScreenImage: null,
};

function showError(message) {
    dom.errorMessage.textContent = message;
    dom.errorMessage.classList.remove("hidden");
}

function clearError() {
    dom.errorMessage.textContent = "";
    dom.errorMessage.classList.add("hidden");
}

function getSelectedMediaType() {
    const selected = document.querySelector('input[name="media-type"]:checked');
    return selected ? selected.value : "all";
}

function getSelectedBreedId() {
    return dom.breedSelect.value || null;
}

function updateBreedDetails(breed) {
    if (!breed) {
        dom.breedName.textContent = "Random selection uses no breed facts.";
        dom.breedTemperament.textContent = "Choose a breed to view its temperament.";
        dom.breedLifeSpan.textContent = "Select a breed for lifespan details.";
        dom.breedOrigin.textContent = "Origin country will appear here.";
        dom.currentBreedLabel.textContent = "Random Cat";
        return;
    }

    dom.breedName.textContent = breed.name;
    dom.breedTemperament.textContent = breed.temperament || "No temperament details available.";
    dom.breedLifeSpan.textContent = breed.life_span || "No lifespan details available.";
    dom.breedOrigin.textContent = breed.origin || "Unknown origin.";
    dom.currentBreedLabel.textContent = breed.name;
}

function updateVotingStats() {
    dom.voteUpCount.textContent = upvoteCount;
    dom.voteDownCount.textContent = downvoteCount;
}

async function fetchBreeds() {
    try {
        const response = await fetch(`${BASE_URL}/breeds`, {
            headers: { "x-api-key": API_KEY }
        });

        if (!response.ok) throw new Error("Could not load breed list.");

        breedsData = await response.json();
        dom.breedSelect.innerHTML = "<option value=\"\">Random Cat</option>" + breedsData.map(breed => {
            return `<option value="${breed.id}">${breed.name}</option>`;
        }).join("");
    } catch (error) {
        console.error("Error fetching breeds:", error);
        showError("Unable to load breed selector. Please refresh the page.");
    }
}

function buildSearchUrl({ breedId = null, mimeType = "all" } = {}) {
    const url = new URL(`${BASE_URL}/images/search`);
    url.searchParams.set("limit", "1");

    if (breedId) {
        url.searchParams.set("breed_ids", breedId);
    }

    if (mimeType === "gif") {
        url.searchParams.set("mime_types", "gif");
    } else if (mimeType === "static") {
        url.searchParams.set("mime_types", "jpg,png");
    }

    return url.toString();
}

async function fetchRandomCat() {
    clearError();

    const breedId = getSelectedBreedId();
    const mediaType = getSelectedMediaType();
    const url = buildSearchUrl({ breedId, mimeType: mediaType });

    try {
        const response = await fetch(url, {
            headers: { "x-api-key": API_KEY }
        });

        if (!response.ok) throw new Error("Failed to fetch a new cat image.");

        const data = await response.json();
        if (!data || data.length === 0) throw new Error("No cats returned from the API.");

        const cat = data[0];
        currentCatId = cat.id;
        currentCatUrl = cat.url;
        dom.catImage.src = cat.url;
        dom.catImage.alt = `Image of ${cat.breeds?.[0]?.name || "a cat"}`;
        dom.currentCatLabel.textContent = `Now showing ${breedId ? "a breed image" : "a random cat"}`;

        currentCatBreed = cat.breeds?.[0] || breedsData.find((breed) => breed.id === breedId) || null;
        updateBreedDetails(currentCatBreed);
    } catch (error) {
        console.error("Error fetching cat:", error);
        showError("Oops! We couldn't load a cat picture. Please try again.");
    }
}

async function favoriteCurrentCat() {
    clearError();
    if (!currentCatId) {
        showError("No cat is loaded yet to add to favorites.");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/favourites`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            },
            body: JSON.stringify({ image_id: currentCatId })
        });

        if (!response.ok) throw new Error("Could not favorite this image.");

        const createdFavorite = await response.json();
        renderFavoriteThumbnail({
            id: createdFavorite.id,
            image: { id: currentCatId, url: currentCatUrl }
        });

        fetchRandomCat();
    } catch (error) {
        console.error("Error favoriting cat:", error);
        showError("Could not save this cat to favorites. Please try again.");
    }
}

async function loadFavorites() {
    try {
        const response = await fetch(`${BASE_URL}/favourites`, {
            headers: { "x-api-key": API_KEY }
        });

        if (!response.ok) throw new Error("Could not load favorites.");

        const favorites = await response.json();
        dom.favoritesGallery.innerHTML = "";

        if (!favorites.length) {
            dom.favoritesGallery.innerHTML = `<p class=\"col-span-full rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500\">Your favorites gallery is empty. Add some cats and they'll appear here.</p>`;
            return;
        }

        favorites.forEach(renderFavoriteThumbnail);
    } catch (error) {
        console.error("Error loading favorites:", error);
        showError("Unable to load favorites at this time.");
    }
}

function renderFavoriteThumbnail(favorite) {
    const imageUrl = favorite.image?.url || favorite.url;
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 p-0 shadow-sm transition hover:-translate-y-1 hover:shadow-lg";
    thumb.style.minHeight = "10rem";
    thumb.innerHTML = `
        <img src="${imageUrl}" alt="Favorite cat thumbnail" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent p-3 text-left text-sm text-white">
            ${favorite.image?.id || favorite.id}
        </span>
    `;

    thumb.addEventListener("click", () => {
        toggleFullscreen(true, imageUrl);
    });

    dom.favoritesGallery.appendChild(thumb);
}

async function voteCurrentCat(value) {
    clearError();
    if (!currentCatId) {
        showError("Please load a cat first before voting.");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/votes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            },
            body: JSON.stringify({ image_id: currentCatId, value })
        });

        if (!response.ok) throw new Error("Could not send vote.");

        if (value === 1) {
            upvoteCount += 1;
        } else {
            downvoteCount += 1;
        }

        updateVotingStats();
        await fetchRandomCat();
    } catch (error) {
        console.error("Error sending vote:", error);
        showError("Unable to register your vote. Please try again.");
    }
}

function toggleFullscreen(show, imageUrl = "") {
    if (show) {
        dom.fullScreenImage.src = imageUrl;
        dom.fullScreenOverlay.classList.add("active");
    } else {
        dom.fullScreenOverlay.classList.remove("active");
        dom.fullScreenImage.src = "";
    }
}

function wireEvents() {
    dom.breedSelect.addEventListener("change", fetchRandomCat);
    document.querySelectorAll('input[name="media-type"]').forEach((input) => {
        input.addEventListener("change", fetchRandomCat);
    });

    dom.refreshFavorites.addEventListener("click", loadFavorites);
    document.getElementById("next-button").addEventListener("click", fetchRandomCat);
    document.getElementById("favorite-button").addEventListener("click", favoriteCurrentCat);
    document.getElementById("upvote-button").addEventListener("click", () => voteCurrentCat(1));
    document.getElementById("downvote-button").addEventListener("click", () => voteCurrentCat(0));
    dom.fullScreenOverlay.addEventListener("click", () => toggleFullscreen(false));
}

function initializeDom() {
    dom.errorMessage = document.getElementById("error-message");
    dom.breedSelect = document.getElementById("breed-select");
    dom.catImage = document.getElementById("cat-image");
    dom.currentCatLabel = document.getElementById("current-cat-label");
    dom.currentBreedLabel = document.getElementById("current-breed-label");
    dom.breedName = document.getElementById("breed-name");
    dom.breedTemperament = document.getElementById("breed-temperament");
    dom.breedLifeSpan = document.getElementById("breed-life-span");
    dom.breedOrigin = document.getElementById("breed-origin");
    dom.voteUpCount = document.getElementById("vote-up-count");
    dom.voteDownCount = document.getElementById("vote-down-count");
    dom.favoritesGallery = document.getElementById("favorites-gallery");
    dom.refreshFavorites = document.getElementById("refresh-favorites");
    dom.fullScreenOverlay = document.getElementById("fullscreen-overlay");
    dom.fullScreenImage = document.getElementById("fullscreen-image");
}

async function initializeApp() {
    initializeDom();
    wireEvents();
    await fetchBreeds();
    await fetchRandomCat();
    await loadFavorites();
    updateVotingStats();
}

document.addEventListener("DOMContentLoaded", initializeApp);
