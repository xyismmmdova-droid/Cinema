// ==================== CONFIGURATION ====================
const API_KEY = '347d82ea465848c0e545ed15f4366554'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_POSTER = 'https://image.tmdb.org/t/p/w500';
const IMG_BACKDROP = 'https://image.tmdb.org/t/p/original';

let favorites = JSON.parse(localStorage.getItem('mflix_favs')) || [];

// ==================== DOM ELEMENTS ====================
const elements = {
    trendingList: document.getElementById('trendingList'),
    popularMoviesList: document.getElementById('popularMoviesList'),
    nowPlayingList: document.getElementById('nowPlayingList'),
    popularTVList: document.getElementById('popularTVList'),
    favoritesList: document.getElementById('favoritesList'),
    favBadge: document.getElementById('favBadge'),
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    loader: document.getElementById('loader'),
    alertBox: document.getElementById('alertBox'),
    heroBanner: document.getElementById('heroBanner'),
    favSection: document.getElementById('favSection')
};

// ==================== INITIALIZE ====================
window.addEventListener('load', () => {
    loadAllContent();
    setHeroBanner();
    updateFavBadge();
});

async function loadAllContent() {
    showLoader(true);
    try {
        await Promise.all([
            fetchData(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=az-AZ`, elements.trendingList, true),
            fetchData(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=az-AZ`, elements.popularMoviesList),
            fetchData(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=az-AZ`, elements.nowPlayingList),
            fetchData(`${BASE_URL}/tv/popular?api_key=${API_KEY}&language=az-AZ`, elements.popularTVList, false, true)
        ]);
        
        // Slider düymələrini kontent gəldikdən sonra əlavə et
        ['trendingList', 'popularMoviesList', 'nowPlayingList', 'popularTVList'].forEach(addSliderButtons);
    } catch (err) {
        showAlert("Məlumat yüklənərkən xəta baş verdi.");
    } finally {
        showLoader(false);
    }
}

// ==================== CORE FUNCTIONS ====================
async function fetchData(url, container, isTrending = false, isTV = false) {
    const res = await fetch(url);
    const data = await res.json();
    let items = data.results;

    if (isTrending) {
        items = items.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
    }
    
    renderItems(items, container, isTV);
}

function renderItems(items, container, isTV = false) {
    if (!items || items.length === 0) {
        container.innerHTML = `<p class="text-muted ps-4">Heç nə tapılmadı.</p>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const title = item.title || item.name || "Adsız";
        const date = item.release_date || item.first_air_date || "";
        const id = item.id;
        const mediaType = item.media_type || (isTV ? 'tv' : 'movie');
        
        let poster = 'https://via.placeholder.com/220x330/111/fff?text=No+Image';
        if (item.poster_path) poster = `${IMG_POSTER}${item.poster_path}`;
        else if (item.backdrop_path) poster = `${IMG_POSTER}${item.backdrop_path}`;

        const favIcon = isFavorite(id) ? 'fas fa-check text-success' : 'fas fa-plus';

        return `
            <div class="movie-card">
                <img src="${poster}" alt="${title}" 
                     onerror="this.src='https://via.placeholder.com/220x330/111/fff?text=Xəta'" 
                     onclick="openDetails(${id}, '${mediaType}')">
                <div class="card-actions">
                    <button class="btn-circle" onclick="event.stopImmediatePropagation(); toggleFavorite(${id}, '${title.replace(/'/g, "\\'")}', '${item.poster_path || ''}', '${mediaType}')">
                        <i class="${favIcon}"></i>
                    </button>
                    <button class="btn-circle" onclick="event.stopImmediatePropagation(); openDetails(${id}, '${mediaType}', true)">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
                <div class="movie-info">
                    <h6 class="text-truncate mb-0">${title}</h6>
                    <small class="text-muted">${date ? date.substring(0,4) : 'N/A'}</small>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== HERO BANNER ====================
async function setHeroBanner() {
    try {
        // Trend olan filmləri çəkirik
        const res = await fetch(`${BASE_URL}/trending/movie/day?api_key=${API_KEY}&language=az-AZ`);
        const data = await res.json();
        
        // 1. "Michael" filmini siyahıdan çıxarırıq (adında michael olanları sil)
        const filteredMovies = data.results.filter(m => !m.title.toLowerCase().includes('michael'));

        // 2. Siyahıdan təsadüfi bir film seçirik (0-dan filteredMovies.length-ə qədər)
        const randomIndex = Math.floor(Math.random() * filteredMovies.length);
        const movie = filteredMovies[randomIndex];

        // 3. HTML elementlərini tapırıq
        const banner = document.getElementById('heroBanner');
        const titleEl = document.getElementById('bannerTitle');
        const descEl = document.getElementById('bannerDesc');

        // 4. Məlumatları tətbiq edirik
        if (movie) {
            banner.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.9)), url(${IMG_BACKDROP}${movie.backdrop_path})`;
            titleEl.innerText = movie.title;
            descEl.innerText = (movie.overview || "Təsvir mövcud deyil.").substring(0, 160) + '...';

            // Düymə funksiyalarını yeniləyirik
            document.getElementById('infoBtn').onclick = () => openDetails(movie.id, 'movie');
            document.getElementById('playBtn').onclick = () => openDetails(movie.id, 'movie', true);
        }
        
    } catch (e) { 
        console.error("Banner yüklənmə xətası:", e); 
    }
}

// ==================== FAVORITES SYSTEM ====================
function toggleFavorite(id, title, posterPath, mediaType) {
    const index = favorites.findIndex(f => f.id === id);
    
    if (index > -1) {
        favorites.splice(index, 1);
        showToast("Siyahıdan silindi", "bg-danger");
    } else {
        favorites.push({ id, title, poster_path: posterPath, media_type: mediaType });
        showToast("Sevimlilərə əlavə edildi!", "bg-success");
    }

    localStorage.setItem('mflix_favs', JSON.stringify(favorites));
    updateFavBadge();
    
    // Əgər sevimlilər bölməsindəyiksə, dərhal yenilə
    if (!elements.favSection.classList.contains('d-none')) {
        renderItems(favorites, elements.favoritesList);
    } else {
        // Mövcud listlərdə iconu yeniləmək üçün (isteğe bağlı)
        loadAllContent(); 
    }
}

function isFavorite(id) {
    return favorites.some(f => f.id === id);
}

function updateFavBadge() {
    elements.favBadge.innerText = favorites.length;
}

// ==================== NAVIGATION ====================
function showHome() {
    elements.favSection.classList.add('d-none');
    document.querySelectorAll('.row-section').forEach(s => s.classList.remove('d-none'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showMovies() {
    showHome();
    document.getElementById('popularMoviesRow').scrollIntoView({ behavior: 'smooth' });
}

function showTVShows() {
    showHome();
    document.getElementById('popularTVRow').scrollIntoView({ behavior: 'smooth' });
}

function showFavoritesPage() {
    elements.favSection.classList.remove('d-none');
    renderItems(favorites, elements.favoritesList);
    addSliderButtons('favoritesList');
    elements.favSection.scrollIntoView({ behavior: 'smooth' });
}

// ==================== MODAL & DETAILS ====================
async function openDetails(id, mediaType, playTrailer = false) {
    try {
        const res = await fetch(`${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}&language=az-AZ&append_to_response=videos`);
        const item = await res.json();
        const modal = new bootstrap.Modal(document.getElementById('movieModal'));

        document.getElementById('modalTitle').innerText = item.title || item.name;
        document.getElementById('modalOverview').innerText = item.overview || "Məlumat yoxdur.";
        document.getElementById('modalRating').innerText = `${item.vote_average.toFixed(1)} ★`;
        document.getElementById('modalImg').src = item.poster_path ? `${IMG_POSTER}${item.poster_path}` : 'https://via.placeholder.com/300x450';

        const trailerBox = document.getElementById('trailerBox');
        const trailerVid = document.getElementById('trailerVideo');
        const trailer = item.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));

        if (playTrailer && trailer) {
            trailerBox.classList.remove('d-none');
            trailerVid.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
        } else {
            trailerBox.classList.add('d-none');
            trailerVid.src = '';
        }

        modal.show();
        
        // Modal bağlananda videonu dayandır
        document.getElementById('movieModal').addEventListener('hidden.bs.modal', () => {
            trailerVid.src = '';
        });
    } catch (err) { showToast("Xəta baş verdi", "bg-danger"); }
}

// ==================== SEARCH ====================
elements.searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = elements.searchInput.value.trim();
    if (!query) return;

    showLoader(true);
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=az-AZ`);
        const data = await res.json();
        const filtered = data.results.filter(i => i.media_type !== 'person');

        document.getElementById('trendingRow').querySelector('h3').innerText = `"${query}" üçün nəticələr`;
        renderItems(filtered, elements.trendingList);
        window.scrollTo({ top: 400, behavior: 'smooth' });
    } catch (err) { showAlert("Axtarışda xəta!"); }
    showLoader(false);
});

// ==================== UTILS ====================
function showLoader(show) {
    elements.loader.classList.toggle('d-none', !show);
}

function showToast(msg, bg) {
    const toast = document.getElementById('actionToast');
    document.getElementById('toastMsg').innerText = msg;
    toast.className = `toast align-items-center text-white border-0 ${bg}`;
    new bootstrap.Toast(toast).show();
}

function showAlert(msg) {
    elements.alertBox.innerText = msg;
    elements.alertBox.classList.remove('d-none');
    setTimeout(() => elements.alertBox.classList.add('d-none'), 3000);
}

function addSliderButtons(containerId) {
    const container = document.getElementById(containerId);
    const parent = container.parentElement;
    if (parent.querySelector('.slider-btn')) return;

    const leftBtn = document.createElement('button');
    leftBtn.className = 'slider-btn left';
    leftBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    leftBtn.onclick = () => container.scrollBy({ left: -window.innerWidth * 0.7, behavior: 'smooth' });

    const rightBtn = document.createElement('button');
    rightBtn.className = 'slider-btn right';
    rightBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    rightBtn.onclick = () => container.scrollBy({ left: window.innerWidth * 0.7, behavior: 'smooth' });

    parent.appendChild(leftBtn);
    parent.appendChild(rightBtn);
}