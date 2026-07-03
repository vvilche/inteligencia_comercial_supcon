// --- Global State ---
let substationsData = [];
let plantsData = [];
let industrialsData = [];
let rankedOwners = [];
let sitrData = [];
let solarData = [];

// Pagination states
let subCurrentPage = 1;
const subItemsPerPage = 20;
let plantCurrentPage = 1;
const plantItemsPerPage = 20;
let indCurrentPage = 1;
const indItemsPerPage = 20;
let sitrCurrentPage = 1;
const sitrItemsPerPage = 20;
let solarCurrentPage = 1;
const solarItemsPerPage = 20;

// Chart references (for destroying/updating)
let priorityChart = null;
let plantTypeChart = null;

// --- Load Data on Start ---
document.addEventListener("DOMContentLoaded", async () => {
    initTabNavigation();
    showLoadingState();
    
    try {
        // Fetch JSON data in parallel
        const [subsRes, plantsRes, indRes, sitrRes, solarRes] = await Promise.all([
            fetch('all_chile_substations.json'),
            fetch('all_chile_power_plants.json'),
            fetch('all_chile_industrial_plants.json'),
            fetch('catastro_pmgd_sitr_87.json'),
            fetch('catastro_completo_solar_738.json')
        ]);
        
        if (!subsRes.ok || !plantsRes.ok || !indRes.ok || !sitrRes.ok || !solarRes.ok) {
            throw new Error("Error al descargar los archivos JSON del servidor.");
        }
        
        substationsData = await subsRes.json();
        plantsData = await plantsRes.json();
        industrialsData = await indRes.json();
        sitrData = await sitrRes.json();
        solarData = await solarRes.json();
        
        console.log(`Loaded ${substationsData.length} substations, ${plantsData.length} plants, ${industrialsData.length} industrial plants, ${sitrData.length} SITR projects, and ${solarData.length} Solar projects.`);
        
        // Process SUPCON rankings
        processRankings();
        
        // Render UI Components
        renderStats();
        initOverviewCharts();
        renderRankingsTable();
        renderSubstationsTable();
        renderPlantsTable();
        renderIndustriesTable();
        renderSitrTable();
        renderSolarTable();
        populateHoldingDropdowns();
        populateRegionDropdown();
        renderTargetSubstations();
        
        // Add event listeners for filters & searches
        initFilters();
        
    } catch (error) {
        console.error("Initialization error:", error);
        showErrorState(error.message);
    }
});

// --- Tab Navigation Setup ---
function initTabNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");
    const sections = document.querySelectorAll(".tab-section");
    const pageTitle = document.getElementById("page-title");
    
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            // Remove active classes
            navButtons.forEach(b => b.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));
            
            // Add active to current
            btn.classList.add("active");
            const tabId = btn.getAttribute("data-tab");
            document.getElementById(`tab-${tabId}`).classList.add("active");
            
            // Update Header Title
            switch(tabId) {
                case "overview":
                    pageTitle.innerText = "Panel de Inteligencia Comercial";
                    break;
                case "rankings":
                    pageTitle.innerText = "Ranking de Oportunidades SUPCON";
                    break;
                case "substations":
                    pageTitle.innerText = "Catastro de Subestaciones (CEN)";
                    break;
                case "plants":
                    pageTitle.innerText = "Catastro de Centrales Generadoras";
                    break;
                case "industries":
                    pageTitle.innerText = "Catastro de Plantas Industriales";
                    break;
                case "sitr":
                    pageTitle.innerText = "Catastro SITR (87 affected)";
                    break;
                case "solar-pmgd":
                    pageTitle.innerText = "Catastro Solar Completo (738)";
                    break;
                case "insights":
                    pageTitle.innerText = "Foco y Plan Estratégico";
                    break;
                case "playbook":
                    pageTitle.innerText = "Playbook & Herramientas de Venta";
                    initPlaybookTab();
                    break;
            }
        });
    });
}

// --- Loading and Error Indicators ---
function showLoadingState() {
    document.getElementById("count-subs").innerText = "...";
    document.getElementById("count-plants").innerText = "...";
    document.getElementById("count-targets").innerText = "...";
    document.getElementById("count-greenfields").innerText = "...";
    document.getElementById("count-industrials").innerText = "...";
}

function showErrorState(msg) {
    alert(`Error de carga: ${msg}\n\nPor favor ejecuta el servidor local con: python3 server.py`);
}

// --- Process SUPCON Client Rankings ---
function processRankings() {
    const normalizationMapping = {
        "CELULOSA ARAUCO": "CELULOSA ARAUCO Y CONSTITUCIÓN S.A.",
        "ARAUCO": "CELULOSA ARAUCO Y CONSTITUCIÓN S.A.",
        "ARAUCO BIOENERGÍA": "CELULOSA ARAUCO Y CONSTITUCIÓN S.A.",
        "CMPC": "CMPC PULP SPA.",
        "FORESTAL MININCO": "CMPC PULP SPA.",
        "NESTLÉ": "NESTLÉ CHILE S.A.",
        "NESTLE": "NESTLÉ CHILE S.A.",
        "CCU": "COMPAÑÍA DE CERVECERÍAS UNIDAS S.A. (CCU)",
        "CERVECERIAS UNIDAS": "COMPAÑÍA DE CERVECERÍAS UNIDAS S.A. (CCU)",
        "VIÑA SAN PEDRO": "COMPAÑÍA DE CERVECERÍAS UNIDAS S.A. (CCU)",
        "SOPROLE": "SOPROLE S.A.",
        "CAROZZI": "CAROZZI S.A.",
        "ENAP": "EMPRESA NACIONAL DEL PETRÓLEO (ENAP)",
        "EMPRESA NACIONAL DEL PETROLEO": "EMPRESA NACIONAL DEL PETRÓLEO (ENAP)",
        "PETROLEO": "EMPRESA NACIONAL DEL PETRÓLEO (ENAP)",
        "METHANEX": "METHANEX CHILE S.A.",
        "ENAEX": "ENAEX S.A.",
        "SQM": "SOCIEDAD QUÍMICA Y MINERA DE CHILE (SQM)",
        "SOCIEDAD QUIMICA Y MINERA": "SOCIEDAD QUÍMICA Y MINERA DE CHILE (SQM)",
        "OXIQUIM": "OXIQUIM S.A.",
        "DOW": "DOW QUÍMICA CHILE S.A.",
        "MELON": "MELÓN S.A.",
        "POLPAICO": "POLPAICO S.A.",
        "CBB": "CEMENTOS BÍO BÍO S.A. (CBB)",
        "CEMENTOS BIO": "CEMENTOS BÍO BÍO S.A. (CBB)",
        "CAP": "COMPAÑÍA SIDERÚRGICA HUACHIPATO S.A. (CAP)",
        "HUACHIPATO": "COMPAÑÍA SIDERÚRGICA HUACHIPATO S.A. (CAP)",
        "GERDAU": "GERDAU AZA S.A.",
        "AZA": "GERDAU AZA S.A.",
        "MASISA": "MASISA S.A.",
        "MINERA ESCONDIDA": "MINERA ESCONDIDA LTDA.",
        "CODELCO": "CODELCO CHILE",
        "COLLAHUASI": "COMPAÑÍA DOÑA INÉS DE COLLAHUASI SCM",
        "ANTOFAGASTA MINERALS": "ANTOFAGASTA MINERALS S.A. (AMSA)",
        "PELAMBRES": "ANTOFAGASTA MINERALS S.A. (AMSA)",
        "TECK": "TECK RESOURCES CHILE",
        "GLENCORE": "GLENCORE CHILE",
        "ALTONORTE": "GLENCORE CHILE",
        "LUNDIN": "LUNDIN MINING CHILE",
        "CANDELARIA": "LUNDIN MINING CHILE"
    };

    const normalizeOwner = (name) => {
        if (!name) return "OTROS";
        const nameUpper = name.toUpperCase().trim();
        for (const [key, value] of Object.entries(normalizationMapping)) {
            if (nameUpper.includes(key)) {
                return value;
            }
        }
        return nameUpper;
    };

    const erncKeywords = ["solar", "fv", "wind", "eolica", "eólico", "fotovoltaica", "bess", "baterias", "baterías"];
    
    const isErnc = (plant) => {
        const tipo = plant.central_tipo_nombre;
        if (tipo === "Solares" || tipo === "Eólicas") return true;
        const nameLower = (plant.nombre || "").toLowerCase();
        return erncKeywords.some(kw => nameLower.includes(kw));
    };
    
    const companyScores = {};
    
    // Process industrial plants first to seed owners
    industrialsData.forEach(ind => {
        const owner = normalizeOwner(ind.empresa);
        if (!companyScores[owner]) {
            companyScores[owner] = { name: owner, thermo: 0, hydro: 0, ernc: 0, sub_no_scada: 0, ind_plants: 0, score: 0 };
        }
        companyScores[owner].ind_plants += 1;
    });

    // Process power plants
    plantsData.forEach(p => {
        const owner = normalizeOwner(p.propietario_nombre);
        if (owner === "OTROS") return;
        
        if (!companyScores[owner]) {
            companyScores[owner] = { name: owner, thermo: 0, hydro: 0, ernc: 0, sub_no_scada: 0, ind_plants: 0, score: 0 };
        }
        
        if (p.central_tipo_nombre === "Termoeléctricas") {
            companyScores[owner].thermo += 1;
        } else if (p.central_tipo_nombre === "Hidroeléctricas") {
            companyScores[owner].hydro += 1;
        } else if (isErnc(p)) {
            companyScores[owner].ernc += 1;
        }
    });
    
    // Process substations
    substationsData.forEach(s => {
        const owner = normalizeOwner(s.propietario_nombre);
        if (owner === "OTROS") return;
        
        if (!companyScores[owner]) {
            companyScores[owner] = { name: owner, thermo: 0, hydro: 0, ernc: 0, sub_no_scada: 0, ind_plants: 0, score: 0 };
        }
        
        if (!s.flag_scada) {
            companyScores[owner].sub_no_scada += 1;
        }
    });
    
    // Calculate final scores
    for (const owner in companyScores) {
        const item = companyScores[owner];
        
        // Priority Scoring Formula
        item.score = (
            item.thermo * 5 +
            item.hydro * 3 +
            item.ernc * 2 +
            item.sub_no_scada * 1 +
            item.ind_plants * 10
        );
    }
    
    // Convert to array and sort
    rankedOwners = Object.values(companyScores).sort((a, b) => b.score - a.score);
}

// --- Render Quick Statistics Cards ---
function renderStats() {
    document.getElementById("count-subs").innerText = substationsData.length.toLocaleString();
    document.getElementById("count-plants").innerText = plantsData.length.toLocaleString();
    document.getElementById("count-industrials").innerText = industrialsData.length.toLocaleString();
    
    // Counts targets with score > 30
    const criticalCount = rankedOwners.filter(o => o.score >= 30).length;
    document.getElementById("count-targets").innerText = criticalCount;
    
    // Count greenfield substations (no SCADA and no comms)
    const greenfields = substationsData.filter(s => !s.flag_scada && !s.flag_equipocom).length;
    document.getElementById("count-greenfields").innerText = greenfields;
}

// --- Render Chart.js Displays ---
function initOverviewCharts() {
    // 1. Priority Scores Bar Chart (Top 10 Targets)
    const top10 = rankedOwners.slice(0, 10);
    const ctxPriority = document.getElementById("chart-priority-scores").getContext("2d");
    
    if (priorityChart) priorityChart.destroy();
    
    priorityChart = new Chart(ctxPriority, {
        type: 'bar',
        data: {
            labels: top10.map(item => item.name.length > 20 ? item.name.substring(0, 18) + '...' : item.name),
            datasets: [{
                label: 'Priority Score',
                data: top10.map(item => item.score),
                backgroundColor: 'rgba(14, 165, 233, 0.45)',
                borderColor: '#0ea5e9',
                borderWidth: 1.5,
                borderRadius: 4,
                hoverBackgroundColor: 'rgba(14, 165, 233, 0.7)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b', font: { family: 'Inter' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { family: 'Inter', size: 10 } }
                }
            }
        }
    });

    // 2. Power Plant Types (Pie/Donut Chart)
    const typesCount = {};
    plantsData.forEach(p => {
        const t = p.central_tipo_nombre || "Otros";
        typesCount[t] = (typesCount[t] || 0) + 1;
    });

    const ctxTypes = document.getElementById("chart-plant-types").getContext("2d");
    
    if (plantTypeChart) plantTypeChart.destroy();
    
    plantTypeChart = new Chart(ctxTypes, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typesCount),
            datasets: [{
                data: Object.values(typesCount),
                backgroundColor: [
                    '#0ea5e9', // Solares
                    '#10b981', // Hidroeléctricas
                    '#f97316', // Termoeléctricas
                    '#a855f7', // Eólicas
                    '#64748b'  // Otros / Geotermia
                ],
                borderWidth: 2,
                borderColor: '#0f1524'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
                },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1
                }
            },
            cutout: '65%'
        }
    });
}

// --- Render Tab rankings Table ---
function renderRankingsTable(filterQuery = "") {
    const tbody = document.getElementById("body-rankings");
    tbody.innerHTML = "";
    
    let filtered = rankedOwners;
    if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        filtered = rankedOwners.filter(item => item.name.toLowerCase().includes(q));
    }
    
    filtered.forEach((item, index) => {
        const tr = document.createElement("tr");
        const indBadge = item.ind_plants > 0 ? `<span class="badge ind"><i class="fa-solid fa-industry"></i> ${item.ind_plants} Plantas</span>` : '<span style="color:#64748b;">0</span>';
        
        tr.innerHTML = `
            <td><span class="text-bold">#${index + 1}</span></td>
            <td><span class="text-bold">${item.name}</span></td>
            <td style="text-align: center;">${item.thermo}</td>
            <td style="text-align: center;">${item.hydro}</td>
            <td style="text-align: center;">${item.ernc}</td>
            <td style="text-align: center;">${item.sub_no_scada}</td>
            <td style="text-align: center;">${indBadge}</td>
            <td style="text-align: center;"><span class="badge score">${item.score}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Render Tab Substations Table ---
function renderSubstationsTable() {
    const tbody = document.getElementById("body-substations");
    tbody.innerHTML = "";
    
    // Get search & filter values
    const query = document.getElementById("sub-search").value.toLowerCase();
    const filterScada = document.getElementById("sub-filter-scada").value;
    const filterCom = document.getElementById("sub-filter-com").value;
    
    // Apply filters
    let filtered = substationsData.filter(s => {
        const matchesSearch = s.nombre.toLowerCase().includes(query) || 
                              s.codigo.toLowerCase().includes(query) || 
                              s.nemotecnico.toLowerCase().includes(query) ||
                              (s.propietario_nombre || "").toLowerCase().includes(query);
                              
        const matchesScada = filterScada === "all" ||
                             (filterScada === "si" && s.flag_scada) ||
                             (filterScada === "no" && !s.flag_scada);
                             
        const matchesCom = filterCom === "all" ||
                           (filterCom === "si" && s.flag_equipocom) ||
                           (filterCom === "no" && !s.flag_equipocom);
                           
        return matchesSearch && matchesScada && matchesCom;
    });
    
    // Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / subItemsPerPage) || 1;
    if (subCurrentPage > totalPages) subCurrentPage = totalPages;
    
    const startIndex = (subCurrentPage - 1) * subItemsPerPage;
    const endIndex = Math.min(startIndex + subItemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);
    
    // Populate Table
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">No se encontraron subestaciones con los filtros seleccionados.</td></tr>`;
    } else {
        pageItems.forEach(s => {
            const tr = document.createElement("tr");
            const scadaBadge = s.flag_scada ? '<span class="badge si"><i class="fa-solid fa-check"></i> Sí</span>' : '<span class="badge no"><i class="fa-solid fa-xmark"></i> No</span>';
            const comBadge = s.flag_equipocom ? '<span class="badge si"><i class="fa-solid fa-check"></i> Sí</span>' : '<span class="badge no"><i class="fa-solid fa-xmark"></i> No</span>';
            
            tr.innerHTML = `
                <td>${s.id}</td>
                <td><span class="text-bold">${s.nombre}</span></td>
                <td>${s.codigo}</td>
                <td><code>${s.nemotecnico}</code></td>
                <td>${s.propietario_nombre || 'N/A'}</td>
                <td style="text-align: center;">${scadaBadge}</td>
                <td style="text-align: center;">${comBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    // Render Pagination Control
    renderPagination("pagination-substations", subCurrentPage, totalPages, totalItems, startIndex, endIndex, (newPage) => {
        subCurrentPage = newPage;
        renderSubstationsTable();
    });
}

// --- Render Tab Power Plants Table ---
function renderPlantsTable() {
    const tbody = document.getElementById("body-plants");
    tbody.innerHTML = "";
    
    // Get search & filter values
    const query = document.getElementById("plant-search").value.toLowerCase();
    const filterType = document.getElementById("plant-filter-type").value;
    const filterRegion = document.getElementById("plant-filter-region").value;
    
    // Apply filters
    let filtered = plantsData.filter(p => {
        const matchesSearch = p.nombre.toLowerCase().includes(query) || 
                              p.nemotecnico.toLowerCase().includes(query) ||
                              (p.propietario_nombre || "").toLowerCase().includes(query);
                              
        const matchesType = filterType === "all" || p.central_tipo_nombre === filterType;
        const matchesRegion = filterRegion === "all" || p.region_nombre === filterRegion;
                           
        return matchesSearch && matchesType && matchesRegion;
    });
    
    // Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / plantItemsPerPage) || 1;
    if (plantCurrentPage > totalPages) plantCurrentPage = totalPages;
    
    const startIndex = (plantCurrentPage - 1) * plantItemsPerPage;
    const endIndex = Math.min(startIndex + plantItemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);
    
    // Populate Table
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">No se encontraron centrales generadoras con los filtros seleccionados.</td></tr>`;
    } else {
        pageItems.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.id}</td>
                <td><span class="text-bold">${p.nombre}</span></td>
                <td><span class="text-bold" style="color:var(--accent-blue);">${p.central_tipo_nombre || 'N/A'}</span></td>
                <td>${p.propietario_nombre || 'N/A'}</td>
                <td><code>${p.nemotecnico}</code></td>
                <td>${p.region_nombre || 'N/A'}</td>
                <td>${p.comuna_nombre || 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    // Render Pagination Control
    renderPagination("pagination-plants", plantCurrentPage, totalPages, totalItems, startIndex, endIndex, (newPage) => {
        plantCurrentPage = newPage;
        renderPlantsTable();
    });
}

// --- Render Tab Industrial Plants Table ---
function renderIndustriesTable() {
    const tbody = document.getElementById("body-industries");
    tbody.innerHTML = "";
    
    const query = document.getElementById("ind-search").value.toLowerCase();
    const filterSector = document.getElementById("ind-filter-sector").value;
    
    let filtered = industrialsData.filter(ind => {
        const matchesSearch = ind.nombre.toLowerCase().includes(query) || 
                              ind.empresa.toLowerCase().includes(query) || 
                              ind.comuna.toLowerCase().includes(query) ||
                              ind.region.toLowerCase().includes(query);
                              
        const matchesSector = filterSector === "all" || ind.sector === filterSector;
        
        return matchesSearch && matchesSector;
    });
    
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / indItemsPerPage) || 1;
    if (indCurrentPage > totalPages) indCurrentPage = totalPages;
    
    const startIndex = (indCurrentPage - 1) * indItemsPerPage;
    const endIndex = Math.min(startIndex + indItemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);
    
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-muted);">No se encontraron plantas industriales con los filtros seleccionados.</td></tr>`;
    } else {
        pageItems.forEach(ind => {
            const tr = document.createElement("tr");
            
            // Generate colored badge for industrial sector
            let sectorClass = "ind";
            if (ind.sector.includes("Alimentos")) sectorClass = "alimentos";
            else if (ind.sector.includes("Química")) sectorClass = "quimica";
            else if (ind.sector.includes("Cemento")) sectorClass = "cemento";
            else if (ind.sector.includes("Siderúrgica")) sectorClass = "siderurgica";
            else if (ind.sector.includes("Forestal")) sectorClass = "forestal";
            else if (ind.sector.includes("Minería")) sectorClass = "mineria";
            
            tr.innerHTML = `
                <td>${ind.id}</td>
                <td>
                    <span class="text-bold">${ind.nombre}</span>
                    <br><small style="color:var(--color-text-secondary);">${ind.justificacion}</small>
                </td>
                <td><span class="text-bold">${ind.empresa}</span></td>
                <td><span class="badge ${sectorClass}">${ind.sector}</span></td>
                <td>${ind.region}</td>
                <td>${ind.comuna}</td>
                <td><code style="color:var(--accent-blue);">${ind.oportunidad_supcon}</code></td>
                <td><small>${ind.subestacion_conexion}</small></td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    renderPagination("pagination-industries", indCurrentPage, totalPages, totalItems, startIndex, endIndex, (newPage) => {
        indCurrentPage = newPage;
        renderIndustriesTable();
    });
}

// --- Dynamic Region Population ---
function populateRegionDropdown() {
    const dropdown = document.getElementById("plant-filter-region");
    const regions = [...new Set(plantsData.map(p => p.region_nombre).filter(Boolean))].sort();
    
    regions.forEach(reg => {
        const opt = document.createElement("option");
        opt.value = reg;
        opt.innerText = reg;
        dropdown.appendChild(opt);
    });
}

// --- Render Table Pagination Controls ---
function renderPagination(containerId, currentPage, totalPages, totalItems, startIndex, endIndex, onPageChange) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    
    // Info text
    const infoText = document.createElement("div");
    infoText.innerHTML = totalItems > 0 
        ? `Mostrando <span class="text-bold">${startIndex + 1}</span> a <span class="text-bold">${endIndex}</span> de <span class="text-bold">${totalItems}</span> registros`
        : `Mostrando 0 registros`;
        
    container.appendChild(infoText);
    
    // Button group
    const btnGroup = document.createElement("div");
    btnGroup.className = "pagination-btn-group";
    
    // Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => onPageChange(currentPage - 1));
    btnGroup.appendChild(prevBtn);
    
    // Page indicators (simplified)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let p = startPage; p <= endPage; p++) {
        const pBtn = document.createElement("button");
        pBtn.className = `page-btn ${p === currentPage ? 'active' : ''}`;
        pBtn.innerText = p;
        pBtn.addEventListener("click", () => onPageChange(p));
        btnGroup.appendChild(pBtn);
    }
    
    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => onPageChange(currentPage + 1));
    btnGroup.appendChild(nextBtn);
    
    container.appendChild(btnGroup);
}

// --- Render Target Substations List (Insights) ---
function renderTargetSubstations() {
    const listContainer = document.getElementById("target-substations-list");
    listContainer.innerHTML = "";
    
    // 10 top physical targets from report
    const targets = [
        { id: 213, nombre: "S/E PLANTA CONSTITUCION", owner: "CELULOSA ARAUCO", region: "Maule", details: "Cogeneradora a biomasa. Conexión industrial sin SCADA.", tag: "DCS + SAS" },
        { id: 214, nombre: "S/E PLANTA ARAUCO", owner: "CELULOSA ARAUCO", region: "Biobío", details: "Gran caldera/cogeneradora sin telecontrol oficial.", tag: "DCS + SAS" },
        { id: 215, nombre: "S/E PLANTA VALDIVIA", owner: "CELULOSA ARAUCO", region: "Los Ríos", details: "Interconexión industrial forestal de alto impacto.", tag: "DCS + SAS" },
        { id: 248, nombre: "TAP OFF MARIA DOLORES", owner: "CMPC PULP SPA", region: "Biobío", details: "Tap-off crítico industrial sin SCADA ni equipos de comunicación.", tag: "Telecom + SAS" },
        { id: 227, nombre: "S/E LAS TORTOLAS", owner: "ALFA TRANSMISORA", region: "Metropolitana", details: "Subestación dedicada a flotación de Anglo American. Sin SCADA.", tag: "SAS Greenfield" },
        { id: 234, nombre: "S/E MINERO", owner: "ALFA TRANSMISORA", region: "Coquimbo", details: "Subestación dedicada a consumos mineros en cordillera.", tag: "SAS Greenfield" },
        { id: 222, nombre: "S/E CENTRAL CANDELARIA", owner: "COLBÚN S.A.", region: "Metropolitana", details: "Falta SCADA local reportado en central de respaldo.", tag: "SCADA / RTU" },
        { id: 229, nombre: "S/E CENTRAL SAN IGNACIO", owner: "COLBÚN S.A.", region: "Biobío", details: "Generación convencional aislada sin enlace directo.", tag: "SCADA / RTU" },
        { id: 230, nombre: "S/E CENTRAL QUILLECO", owner: "COLBÚN S.A.", region: "Biobío", details: "Central hidráulica de pasada sin telecontrol activo.", tag: "DCS Hidro + SAS" },
        { id: 232, nombre: "S/E CENTRAL LOS PINOS", owner: "COLBÚN S.A.", region: "Biobío", details: "Conexión de generación de pasada sin SCADA.", tag: "SAS Greenfield" }
    ];
    
    targets.forEach(t => {
        const el = document.createElement("div");
        el.className = "target-item";
        el.innerHTML = `
            <div class="target-item-left">
                <h4>${t.nombre}</h4>
                <div class="target-item-meta">Propietario: <strong>${t.owner}</strong> | Región: ${t.region}</div>
                <div class="target-item-reason">${t.details}</div>
            </div>
            <div class="badge ind">${t.tag}</div>
        `;
        listContainer.appendChild(el);
    });
}

// --- Filters & Search Listeners ---
function initFilters() {
    // Rankings Search
    document.getElementById("rankings-search").addEventListener("input", (e) => {
        renderRankingsTable(e.target.value);
    });
    
    // Substations Filters
    document.getElementById("sub-search").addEventListener("input", () => {
        subCurrentPage = 1;
        renderSubstationsTable();
    });
    document.getElementById("sub-filter-scada").addEventListener("change", () => {
        subCurrentPage = 1;
        renderSubstationsTable();
    });
    document.getElementById("sub-filter-com").addEventListener("change", () => {
        subCurrentPage = 1;
        renderSubstationsTable();
    });
    
    // Power Plants Filters
    document.getElementById("plant-search").addEventListener("input", () => {
        plantCurrentPage = 1;
        renderPlantsTable();
    });
    document.getElementById("plant-filter-type").addEventListener("change", () => {
        plantCurrentPage = 1;
        renderPlantsTable();
    });
    document.getElementById("plant-filter-region").addEventListener("change", () => {
        plantCurrentPage = 1;
        renderPlantsTable();
    });

    // Industrial Plants Filters
    document.getElementById("ind-search").addEventListener("input", () => {
        indCurrentPage = 1;
        renderIndustriesTable();
    });
    document.getElementById("ind-filter-sector").addEventListener("change", () => {
        indCurrentPage = 1;
        renderIndustriesTable();
    });

    // SITR Filters
    document.getElementById("sitr-search").addEventListener("input", () => {
        sitrCurrentPage = 1;
        renderSitrTable();
    });
    document.getElementById("sitr-filter-holding").addEventListener("change", () => {
        sitrCurrentPage = 1;
        renderSitrTable();
    });
    document.getElementById("sitr-filter-solution").addEventListener("change", () => {
        sitrCurrentPage = 1;
        renderSitrTable();
    });

    // Solar Filters
    document.getElementById("solar-search").addEventListener("input", () => {
        solarCurrentPage = 1;
        renderSolarTable();
    });
    document.getElementById("solar-filter-holding").addEventListener("change", () => {
        solarCurrentPage = 1;
        renderSolarTable();
    });
    document.getElementById("solar-filter-solution").addEventListener("change", () => {
        solarCurrentPage = 1;
        renderSolarTable();
    });
    
    // Global Header Search Bar
    document.getElementById("global-search").addEventListener("input", (e) => {
        const val = e.target.value;
        const activeTab = document.querySelector(".nav-btn.active").getAttribute("data-tab");
        
        if (activeTab === "rankings") {
            document.getElementById("rankings-search").value = val;
            renderRankingsTable(val);
        } else if (activeTab === "substations") {
            document.getElementById("sub-search").value = val;
            subCurrentPage = 1;
            renderSubstationsTable();
        } else if (activeTab === "plants") {
            document.getElementById("plant-search").value = val;
            plantCurrentPage = 1;
            renderPlantsTable();
        } else if (activeTab === "industries") {
            document.getElementById("ind-search").value = val;
            indCurrentPage = 1;
            renderIndustriesTable();
        } else if (activeTab === "sitr") {
            document.getElementById("sitr-search").value = val;
            sitrCurrentPage = 1;
            renderSitrTable();
        } else if (activeTab === "solar-pmgd") {
            document.getElementById("solar-search").value = val;
            solarCurrentPage = 1;
            renderSolarTable();
        } else if (activeTab === "overview") {
            // Redirect to rankings and search if user is on overview
            document.querySelector('.nav-btn[data-tab="rankings"]').click();
            document.getElementById("rankings-search").value = val;
            renderRankingsTable(val);
        }
    });
}

// --- Dynamic holding dropdowns & rendering for new tabs ---
function populateHoldingDropdowns() {
    const sitrHoldingSelect = document.getElementById("sitr-filter-holding");
    const solarHoldingSelect = document.getElementById("solar-filter-holding");
    
    // Populate SITR holdings
    const sitrHoldings = [...new Set(sitrData.map(d => d.Holding).filter(Boolean))].sort();
    const sitrIdx = sitrHoldings.indexOf("Independent / Other SpA");
    if (sitrIdx > -1) {
        sitrHoldings.splice(sitrIdx, 1);
        sitrHoldings.push("Independent / Other SpA");
    }
    sitrHoldings.forEach(h => {
        const opt = document.createElement("option");
        opt.value = h;
        opt.innerText = h;
        sitrHoldingSelect.appendChild(opt);
    });
    
    // Populate Solar holdings
    const solarHoldings = [...new Set(solarData.map(d => d.Holding).filter(Boolean))].sort();
    const solarIdx = solarHoldings.indexOf("Independent / Other SpA");
    if (solarIdx > -1) {
        solarHoldings.splice(solarIdx, 1);
        solarHoldings.push("Independent / Other SpA");
    }
    solarHoldings.forEach(h => {
        const opt = document.createElement("option");
        opt.value = h;
        opt.innerText = h;
        solarHoldingSelect.appendChild(opt);
    });
}

function renderSitrTable() {
    const tbody = document.getElementById("body-sitr");
    tbody.innerHTML = "";
    
    const query = document.getElementById("sitr-search").value.toLowerCase();
    const filterHolding = document.getElementById("sitr-filter-holding").value;
    const filterSolution = document.getElementById("sitr-filter-solution").value;
    
    let filtered = sitrData.filter(d => {
        const matchesSearch = d.Parque.toLowerCase().includes(query) ||
                              d.Propietario.toLowerCase().includes(query) ||
                              d.Subestacion.toLowerCase().includes(query) ||
                              d.Holding.toLowerCase().includes(query) ||
                              d.Region.toLowerCase().includes(query) ||
                              d.Comuna.toLowerCase().includes(query);
                             
        const matchesHolding = filterHolding === "all" || d.Holding === filterHolding;
        const matchesSolution = filterSolution === "all" || d.Solucion_Recomendada === filterSolution;
        
        return matchesSearch && matchesHolding && matchesSolution;
    });
    
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / sitrItemsPerPage) || 1;
    if (sitrCurrentPage > totalPages) sitrCurrentPage = totalPages;
    
    const startIndex = (sitrCurrentPage - 1) * sitrItemsPerPage;
    const endIndex = Math.min(startIndex + sitrItemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);
    
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--color-text-muted);">No se encontraron parques con los filtros seleccionados.</td></tr>`;
    } else {
        pageItems.forEach(d => {
            const tr = document.createElement("tr");
            
            let solClass = "cemento";
            if (d.Solucion_Recomendada === "SUPCON") solClass = "mineria";
            else if (d.Solucion_Recomendada === "NovaTech Orion") solClass = "quimica";
            else if (d.Solucion_Recomendada === "Software-Only") solClass = "alimentos";
            
            const corpCell = `
                <strong>${d.Contacto_Corp_Nombre}</strong><br>
                <small style="color: var(--accent-blue);">${d.Contacto_Corp_Cargo}</small><br>
                <small style="color: var(--color-text-secondary);">${d.Contacto_Corp_Detalle}</small>
            `;
            
            const plantCell = `
                <strong>${d.Contacto_Planta_Nombre}</strong><br>
                <small style="color: var(--accent-blue);">${d.Contacto_Planta_Cargo}</small><br>
                <small style="color: var(--color-text-secondary);">${d.Contacto_Planta_Detalle}</small>
            `;
            
            tr.innerHTML = `
                <td><span class="text-bold">${d.Parque}</span></td>
                <td style="text-align: center;"><span class="text-bold">${d.MW.toFixed(1)}</span></td>
                <td>${d.Subestacion}</td>
                <td><small>${d.Propietario}</small></td>
                <td><span class="text-bold">${d.Holding}</span></td>
                <td><span class="badge ${solClass}">${d.Solucion_Recomendada}</span></td>
                <td><small>${d.Region} / ${d.Comuna}</small></td>
                <td>${corpCell}</td>
                <td>${plantCell}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    renderPagination("pagination-sitr", sitrCurrentPage, totalPages, totalItems, startIndex, endIndex, (newPage) => {
        sitrCurrentPage = newPage;
        renderSitrTable();
    });
}

function renderSolarTable() {
    const tbody = document.getElementById("body-solar-pmgd");
    tbody.innerHTML = "";
    
    const query = document.getElementById("solar-search").value.toLowerCase();
    const filterHolding = document.getElementById("solar-filter-holding").value;
    const filterSolution = document.getElementById("solar-filter-solution").value;
    
    let filtered = solarData.filter(d => {
        const matchesSearch = d.Parque.toLowerCase().includes(query) ||
                              d.Propietario.toLowerCase().includes(query) ||
                              d.Subestacion.toLowerCase().includes(query) ||
                              d.Holding.toLowerCase().includes(query) ||
                              d.Region.toLowerCase().includes(query) ||
                              d.Comuna.toLowerCase().includes(query);
                             
        const matchesHolding = filterHolding === "all" || d.Holding === filterHolding;
        const matchesSolution = filterSolution === "all" || d.Solucion_Recomendada === filterSolution;
        
        return matchesSearch && matchesHolding && matchesSolution;
    });
    
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / solarItemsPerPage) || 1;
    if (solarCurrentPage > totalPages) solarCurrentPage = totalPages;
    
    const startIndex = (solarCurrentPage - 1) * solarItemsPerPage;
    const endIndex = Math.min(startIndex + solarItemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);
    
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--color-text-muted);">No se encontraron parques con los filtros seleccionados.</td></tr>`;
    } else {
        pageItems.forEach(d => {
            const tr = document.createElement("tr");
            
            let solClass = "cemento";
            if (d.Solucion_Recomendada === "SUPCON") solClass = "mineria";
            else if (d.Solucion_Recomendada === "NovaTech Orion") solClass = "quimica";
            else if (d.Solucion_Recomendada === "Software-Only") solClass = "alimentos";
            
            const corpCell = `
                <strong>${d.Contacto_Corp_Nombre}</strong><br>
                <small style="color: var(--accent-blue);">${d.Contacto_Corp_Cargo}</small><br>
                <small style="color: var(--color-text-secondary);">${d.Contacto_Corp_Detalle}</small>
            `;
            
            const plantCell = `
                <strong>${d.Contacto_Planta_Nombre}</strong><br>
                <small style="color: var(--accent-blue);">${d.Contacto_Planta_Cargo}</small><br>
                <small style="color: var(--color-text-secondary);">${d.Contacto_Planta_Detalle}</small>
            `;
            
            tr.innerHTML = `
                <td><span class="text-bold">${d.Parque}</span></td>
                <td style="text-align: center;"><span class="text-bold">${d.MW.toFixed(1)}</span></td>
                <td>${d.Subestacion}</td>
                <td><small>${d.Propietario}</small></td>
                <td><span class="text-bold">${d.Holding}</span></td>
                <td><span class="badge ${solClass}">${d.Solucion_Recomendada}</span></td>
                <td><small>${d.Region} / ${d.Comuna}</small></td>
                <td>${corpCell}</td>
                <td>${plantCell}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    renderPagination("pagination-solar-pmgd", solarCurrentPage, totalPages, totalItems, startIndex, endIndex, (newPage) => {
        solarCurrentPage = newPage;
        renderSolarTable();
    });
}

// --- Sales Playbook Tab Initialization ---
const playbookTemplates = {
    "email-a": `Asunto: Plan de Trabajo ConectaCEN (Plazo 15 Julio) - Plantilla de Cumplimiento PMGD [Nombre de la Empresa]

Estimado/a [Nombre del Contacto],

Espero que se encuentre muy bien.

Le escribo directamente debido a la proximidad del vencimiento del plazo establecido por el Coordinador Eléctrico Nacional (CEN) en su Oficio DE 03474-26. Como es de su conocimiento, todas las empresas coordinadas PMGD deben presentar su Plan de Trabajo en la plataforma ConectaCEN a más tardar este 15 de julio de 2026 para la adecuación y extracción automática de registros oscilográficos (SLRP / COMTRADE).

Sabemos que este requerimiento añade una carga administrativa y operativa importante a su equipo. Por esta razón, desde el departamento de ingeniería de SUPCON Chile, hemos preparado una Plantilla del Plan de Trabajo Técnico que cumple 100% con los estándares de la norma. 

Queremos poner a su disposición este borrador de forma gratuita para que su equipo pueda presentarlo a tiempo en ConectaCEN y evitar observaciones o multas regulatorias.

Adicionalmente, hemos diseñado tres esquemas de solución tecnológica (desde opciones basadas 100% en software hasta gabinetes integrados llave en mano con Master Clock GPS incorporado) que permiten ejecutar este plan optimizando al máximo su presupuesto de inversión (CAPEX).

¿Tendría disponibilidad para una breve videollamada de 10 minutos este [Día de la semana] a las [Hora, ej: 11:00 am] para hacerle llegar la plantilla y revisar cuál alternativa técnica se adapta mejor a sus parques?

Quedo atento a su confirmación para enviarle la invitación.

Atentamente,

[Tu Nombre]
[Tu Cargo]
SUPCON Chile
[Tu Teléfono / Email]`,

    "email-b": `Asunto: Solución al requisito de sincronización UTC (GPS-100) e Integración SITR para [Nombre del Parque/Empresa]

Estimado/a [Nombre del Contacto],

Me dirijo a usted como responsable de la operación del parque [Nombre del Parque PMGD]. 

Como bien sabe, el cumplimiento del Oficio SITR (DE 03450) y la automatización COMTRADE (DE 03474) del CEN imponen un desafío crítico: la estampa de tiempo de las oscilografías y la telemedida deben estar sincronizadas estrictamente con el huso UTC ±00:00 mediante un receptor de GPS Master Clock local físicamente cableado a los relés (protocolos IRIG-B o NTP/PTP). 

La falta de esta sincronización o la caída del canal de datos (que exige un SLA de disponibilidad mensual del 99.5%) es el principal motivo de rechazo por parte de los auditores del Coordinador.

En SUPCON Chile hemos desarrollado el Gabinete GIR-800, una solución integrada de automatización que resuelve estos tres puntos en un solo paso:
1. Servidor de Tiempo Master Clock GPS-100 integrado de alta precisión.
2. Extracción autónoma de oscilografías desde relés multimarcas (SEL, ABB, Siemens, etc.) mediante nuestra RTU-8100 y almacenamiento en servidor SFTP local seguro para el SLRP.
3. Gateway SITR integrado con conectividad celular redundante Dual-SIM para garantizar el 99.5% de disponibilidad.

Esto le evita tener que integrar componentes de múltiples marcas y reduce drásticamente el tiempo de aprobación de la ingeniería ante el CEN y las distribuidoras (como CGE).

¿Le parecería bien que coordinemos una llamada técnica esta semana para revisar las características de sus relés y mostrarle cómo el GIR-800 simplifica esta integración?

Atentamente,

[Tu Nombre]
SUPCON Chile
[Contacto]`,

    "email-c": `Asunto: Optimización de Ingresos PMGD y Almacenamiento BESS (Nuevo Decreto 1 de 2026)

Estimado/a [Nombre del Contacto],

Le escribo para conversar sobre las oportunidades de optimización financiera de su portafolio de proyectos PMGD bajo el nuevo escenario regulatorio del Decreto N° 1 de 2026 (modificación al DS 88).

La transición hacia el Precio Básico de Energía (PBE) estructurado en 6 bloques horarios cambia las reglas del juego. Aquellos proyectos solares que inyectan toda su energía durante el bloque "Solar Peak" (12:00 a 16:00 hrs) se enfrentan a precios marginales cercanos a cero y a severos recortes (curtailment) por congestión de redes zonales.

La integración de sistemas de almacenamiento BESS es hoy la vía más rentable para capturar el valor máximo en las horas de demanda punta (20:00 a 00:00 hrs). Sin embargo, esto requiere una tecnología de control de planta avanzada.

Nuestra solución, el Gabinete GIR-800 de SUPCON, no solo resuelve las exigencias obligatorias de telemedida (SITR) y oscilografías (SLRP/COMTRADE) exigidas por el CEN para este año, sino que ya viene equipado de fábrica con:
*   Controlador de Planta PPC-1000 homologado por el CEN.
*   Sistema de Gestión de Energía EMS-2000 "BESS-Ready", diseñado para automatizar las curvas de carga/descarga de baterías maximizando los ingresos según las bandas horarias del nuevo decreto.

Nos gustaría presentarle un modelamiento financiero simplificado de cómo la tecnología de control SUPCON puede elevar la tasa interna de retorno (TIR) de sus activos en Chile.

¿Tiene disponibilidad para una reunión de 15 minutos el próximo [Día] a las [Hora]?

Atentamente,

[Tu Nombre]
[Tu Cargo]
SUPCON Chile`,

    "cen-letter": `CARTA FORMATO: DECLARACIÓN DE INICIO DE TRABAJOS Y PRESENTACIÓN DE PLAN DE CUMPLIMIENTO
(El cliente debe copiar esto en hoja con membrete de su empresa y subirlo en PDF al portal ConectaCEN)

Santiago, [Día] de [Mes] de 2026

Señores
Coordinador Eléctrico Nacional (CEN)
Unidad de Monitoreo de Protecciones y Sistemas de Información
PRESENTE

Referencia: Presentación de Plan de Trabajo para Adecuación y Extracción de Registros Oscilográficos (Oficio Circular DE 03474-26) y/o Telemedida SITR (Oficio DE 03450-26).
Instalación: PMGD [Nombre del Parque / Proyecto]
Empresa Coordinada: [Nombre del Propietario / SpA]

De nuestra consideración:

Por medio de la presente, y en representación de la empresa coordinada [Nombre del Propietario / SpA], titular del proyecto de generación distribuida "PMGD [Nombre del Parque / Proyecto]", ubicado en la comuna de [Comuna], Región de [Región], venimos en dar cumplimiento a lo instruido en el Oficio Circular de la referencia.

Declaramos bajo juramento que hemos iniciado las gestiones técnicas para la adecuación de nuestra instalación a las exigencias normativas relativas a:

1.  La estandarización de nuestros registros de fallas según el estándar IEEE C37.111-2013 (COMTRADE), incluyendo la correcta nomenclatura de canales analógicos y binarios de acuerdo con las directivas del Coordinador.
2.  La habilitación del sistema de sincronización horaria local mediante receptor GPS con estampa de tiempo UTC ±00:00.
3.  La implementación del sistema de extracción automática de oscilografías hacia un repositorio centralizado seguro (servidor SFTP externo al relé) para consulta remota por el sistema SLRP del Coordinador.

Para la ejecución de estas tareas de ingeniería, integración de hardware y automatización de comunicaciones, nuestra empresa ha seleccionado a la firma tecnológica SUPCON Chile como nuestro partner tecnológico e integrador principal del proyecto.

Adjunto a esta comunicación, presentamos en la plataforma ConectaCEN el cronograma detallado de hitos y actividades (Plan de Trabajo Técnico), estimando cumplir con las pruebas de validación local y pruebas punto a punto con el Coordinador dentro de los plazos establecidos en el régimen transitorio de la instrucción.

Sin otro particular, saluda atentamente a ustedes,

__________________________________________
[Nombre del Representante Legal o Gerente]
[RUT del Firmante]
[Cargo]
[Nombre de la Empresa Propietaria / SpA]
[Email de Contacto]
[Teléfono de Contacto]`
};

let activeEmailTab = "email-a";

function initPlaybookTab() {
    // Populate templates initially
    const emailBox = document.getElementById("email-template-content");
    const letterBox = document.getElementById("cen-letter-content");
    if (emailBox) emailBox.innerText = playbookTemplates[activeEmailTab];
    if (letterBox) letterBox.innerText = playbookTemplates["cen-letter"];

    // Email Template Switchers
    const emailTabs = document.querySelectorAll(".playbook-tab-btn");
    emailTabs.forEach(btn => {
        btn.addEventListener("click", () => {
            emailTabs.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeEmailTab = btn.getAttribute("data-email");
            const box = document.getElementById("email-template-content");
            if (box) box.innerText = playbookTemplates[activeEmailTab];
        });
    });

    // Copy Buttons Event Listeners
    setupCopyButton("btn-copy-email", "email-template-content", '<i class="fa-solid fa-copy"></i> Copiar Correo');
    setupCopyButton("btn-copy-letter", "cen-letter-content", '<i class="fa-solid fa-copy"></i> Copiar Carta Borrador');
}

function setupCopyButton(btnId, targetId, originalHtml) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    // Remove existing event listener to avoid duplicate setups
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener("click", async () => {
        const textToCopy = document.getElementById(targetId).innerText;
        try {
            await navigator.clipboard.writeText(textToCopy);
            newBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> ¡Copiado!';
            newBtn.classList.add("copied");
            setTimeout(() => {
                newBtn.innerHTML = originalHtml;
                newBtn.classList.remove("copied");
            }, 2000);
        } catch (err) {
            console.error("No se pudo copiar el texto: ", err);
        }
    });
}
