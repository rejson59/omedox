const SUPABASE_URL = 'https://gyzfqhvduxsmwauxuvjp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_k1QAtDopGpDozPPI2MccIA_NIl5hGQj';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTY DOM ---
const cardsGrid = document.getElementById('cardsGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

const formModal = document.getElementById('formModal');
const openFormBtn = document.getElementById('openFormBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const createCardForm = document.getElementById('createCardForm');

const viewModal = document.getElementById('viewModal');

// --- POBIERANIE I WYŚWIETLANIE KART ---
async function fetchProfiles(searchQuery = '') {
    cardsGrid.innerHTML = '<p class="text-cyan-500 animate-pulse col-span-full text-center py-10">Ładowanie bazy dancyh...</p>';
    
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    
    if (searchQuery) {
        query = query.ilike('ip_address', `%${searchQuery}%`);
    }

    const { data, error } = await query.limit(50); // Ładujemy 50 najnowszych

    if (error) {
        console.error('Błąd pobierania:', error);
        cardsGrid.innerHTML = '<p class="text-red-500 col-span-full">Błąd ładowania danych.</p>';
        return;
    }

    cardsGrid.innerHTML = '';
    
    if (data.length === 0) {
        cardsGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center py-10">Brak dowodów w bazie. Stwórz pierwszy!</p>';
        return;
    }

    data.forEach(profile => {
        const card = document.createElement('div');
        // Karta na siatce (w 3 kolumnach)
        card.className = 'glass-panel rounded-xl p-4 cursor-pointer card-hover flex gap-4 items-center';
        card.onclick = () => showFullCard(profile);
        
        card.innerHTML = `
            <img src="${profile.photo_url}" alt="Foto" class="w-24 h-24 rounded-lg object-cover border-2 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            <div class="overflow-hidden">
                <h3 class="text-xl font-bold text-fuchsia-400 truncate uppercase">${profile.name}</h3>
                <p class="text-sm text-cyan-200 mt-1">IP: <span class="text-white">${profile.ip_address}</span></p>
                <p class="text-xs text-gray-400 mt-1 truncate">LOK: ${profile.location}</p>
            </div>
        `;
        cardsGrid.appendChild(card);
    });
}

// --- WIDOK PEŁNOEKRANOWY ---
function showFullCard(profile) {
    viewModal.innerHTML = `
        <div class="glass-panel p-8 rounded-2xl w-full max-w-2xl relative" onclick="event.stopPropagation()">
            <button onclick="closeViewModal(event)" class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
            <div class="flex flex-col md:flex-row gap-8">
                <img src="${profile.photo_url}" class="w-48 h-64 object-cover rounded-xl border-4 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                <div class="flex-1 space-y-4">
                    <h2 class="text-4xl font-bold neon-text uppercase">${profile.name}</h2>
                    <div class="grid grid-cols-2 gap-4 text-sm mt-4">
                        <div class="bg-gray-900/50 p-2 rounded border border-cyan-900"><span class="text-cyan-500">PŁEĆ:</span><br>${profile.gender}</div>
                        <div class="bg-gray-900/50 p-2 rounded border border-cyan-900"><span class="text-cyan-500">WIEK:</span><br>${profile.age}</div>
                        <div class="bg-gray-900/50 p-2 rounded border border-cyan-900 col-span-2"><span class="text-fuchsia-500">ADRES IP:</span><br><span class="text-lg">${profile.ip_address}</span></div>
                        <div class="bg-gray-900/50 p-2 rounded border border-cyan-900 col-span-2"><span class="text-cyan-500">ZAMIESZKANIE:</span><br>${profile.location}</div>
                        <div class="bg-gray-900/50 p-2 rounded border border-cyan-900 col-span-2"><span class="text-cyan-500">INFO/SOCIAL:</span><br>${profile.socials}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    viewModal.classList.remove('hidden');
}

function closeViewModal(e) {
    if (e.target === viewModal || e.target.tagName.toLowerCase() === 'button') {
        viewModal.classList.add('hidden');
    }
}

// --- TWORZENIE KARTY (FORMULARZ) ---
openFormBtn.onclick = () => formModal.classList.remove('hidden');
closeFormBtn.onclick = () => formModal.classList.add('hidden');

createCardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerText = 'Przesyłanie...';
    submitBtn.disabled = true;

    const file = document.getElementById('f_photo').files[0];
    const fileName = `${Date.now()}_${file.name}`;

    try {
        // 1. Upload zdjęcia do Supabase Storage
        const { data: imgData, error: imgError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file);

        if (imgError) throw imgError;

        // Pobranie publicznego linku
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        const photoUrl = publicUrlData.publicUrl;

        // 2. Przygotowanie danych (wstawienie "Brak info" tam gdzie pusto)
        const getValue = (id) => document.getElementById(id).value.trim() || 'Brak info';

        const newProfile = {
            photo_url: photoUrl,
            name: getValue('f_name'),
            gender: getValue('f_gender'),
            age: getValue('f_age'),
            ip_address: document.getElementById('f_ip').value.trim(), // Wymagane
            location: getValue('f_location'),
            socials: getValue('f_socials')
        };

        // 3. Wrzucenie do bazy danych
        const { error: dbError } = await supabase.from('profiles').insert([newProfile]);
        if (dbError) throw dbError;

        // Reset i odświeżenie
        createCardForm.reset();
        formModal.classList.add('hidden');
        fetchProfiles(); // Odśwież listę
        
    } catch (error) {
        console.error(error);
        alert('Wystąpił błąd podczas tworzenia karty. Sprawdź konsole.');
    } finally {
        submitBtn.innerText = 'Wygeneruj Kartę';
        submitBtn.disabled = false;
    }
});

// --- WYSZUKIWANIE ---
searchBtn.onclick = () => fetchProfiles(searchInput.value.trim());
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchProfiles(searchInput.value.trim());
});

// ZAINICJOWANIE STRONY
fetchProfiles();
