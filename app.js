const COUNTY_MANIFEST = "data/counties/counties.json";
const COUNTY_BASE_PATH = "data/counties/";
const PAGE_SIZE = 100;

const columns = [
  "county_desc",
  "full-name",
  "residential-address",
  "precinct_desc",
  "voter_status_desc",
  "ncid"
];

let countyManifest = [];
let loadedRows = [];
let filteredRows = [];
let currentPage = 1;

const els = {
  countySearch: document.getElementById("countySearch"),
  countyList: document.getElementById("countyList"),
  selectAllCounties: document.getElementById("selectAllCounties"),
  clearCounties: document.getElementById("clearCounties"),
  loadCounties: document.getElementById("loadCounties"),
  loadStatus: document.getElementById("loadStatus"),
  loadProgress: document.getElementById("loadProgress"),
  globalSearch: document.getElementById("globalSearch"),
  statusFilter: document.getElementById("statusFilter"),
  precinctFilter: document.getElementById("precinctFilter"),
  downloadLoaded: document.getElementById("downloadLoaded"),
  downloadFiltered: document.getElementById("downloadFiltered"),
  resultCount: document.getElementById("resultCount"),
  tbody: document.querySelector("#resultsTable tbody"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageInfo: document.getElementById("pageInfo")
};

init();

async function init() {
  try {
    const response = await fetch(COUNTY_MANIFEST);
    if (!response.ok) throw new Error(`Could not load ${COUNTY_MANIFEST}`);
    countyManifest = await response.json();
    renderCountyList();
    els.loadStatus.textContent = `${countyManifest.length} county file(s) available.`;
    setProgress(`Ready. ${countyManifest.length} county file(s) available.`, "success");
  } catch (error) {
    els.loadStatus.textContent = "Could not load county list. Check data/counties/counties.json.";
    setProgress("Could not load county list. Check data/counties/counties.json.", "error");
    console.error(error);
  }
}

function renderCountyList() {
  const term = els.countySearch.value.trim().toLowerCase();
  const counties = countyManifest.filter(c => c.name.toLowerCase().includes(term));

  els.countyList.innerHTML = counties.map(c => `
    <label class="county-option">
      <input type="checkbox" value="${escapeHtml(c.file)}" data-name="${escapeHtml(c.name)}">
      <span>${escapeHtml(toTitleCase(c.name))}</span>
    </label>
  `).join("");
}

els.countySearch.addEventListener("input", renderCountyList);

els.selectAllCounties.addEventListener("click", () => {
  els.countyList.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = true);
});

els.clearCounties.addEventListener("click", () => {
  els.countyList.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = false);
});

els.loadCounties.addEventListener("click", loadSelectedCounties);
els.globalSearch.addEventListener("input", applyFilters);
els.statusFilter.addEventListener("change", applyFilters);
els.precinctFilter.addEventListener("change", applyFilters);
els.downloadLoaded.addEventListener("click", () => downloadCsv(loadedRows, "loaded-voter-list.csv"));
els.downloadFiltered.addEventListener("click", () => downloadCsv(filteredRows, "selected-voter-list.csv"));
els.prevPage.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderTable(); } });
els.nextPage.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  if (currentPage < totalPages) { currentPage++; renderTable(); }
});

async function loadSelectedCounties() {
  const selected = Array.from(els.countyList.querySelectorAll("input[type='checkbox']:checked"))
    .map(cb => ({ file: cb.value, name: cb.dataset.name }));

  if (selected.length === 0) {
    alert("Select at least one county first.");
    setProgress("Select at least one county, then click Load selected counties.");
    return;
  }

  setControlsEnabled(false);
  loadedRows = [];
  filteredRows = [];
  currentPage = 1;
  els.tbody.innerHTML = "";
  els.resultCount.textContent = "Loading selected county file(s)...";
  setProgress(`Preparing to load ${selected.length} county file(s)...`, "loading");

  try {
    for (let i = 0; i < selected.length; i++) {
      const county = selected[i];
      const countyLabel = toTitleCase(county.name);
      els.loadStatus.textContent = `Loading ${countyLabel}...`;
      setProgress(`Loading ${countyLabel} (${i + 1} of ${selected.length})...`, "loading");

      const text = await fetchText(COUNTY_BASE_PATH + county.file);
      const rows = parseCsv(text);
      // Avoid spreading very large arrays; older Safari can throw a RangeError.
      for (const row of rows) {
        loadedRows.push(row);
      }

      setProgress(`Loaded ${countyLabel}: ${rows.length.toLocaleString()} record(s). Total loaded so far: ${loadedRows.length.toLocaleString()}.`, "loading");
      await nextFrame();
    }

    populateFilterOptions();
    setControlsEnabled(true);
    applyFilters();
    const doneMessage = `Loaded ${loadedRows.length.toLocaleString()} voter record(s) from ${selected.length} county file(s).`;
    els.loadStatus.textContent = doneMessage;
    setProgress(doneMessage, "success");
  } catch (error) {
    console.error(error);
    const errorMessage = `A county file failed to load: ${error.message}`;
    els.loadStatus.textContent = errorMessage;
    setProgress(errorMessage, "error");
    els.resultCount.textContent = "Load failed.";
  }
}

function setProgress(message, state = "") {
  if (!els.loadProgress) return;
  els.loadProgress.textContent = message;
  els.loadProgress.classList.remove("is-loading", "is-error", "is-success");
  if (state) els.loadProgress.classList.add(`is-${state}`);
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return await response.text();
}

function setControlsEnabled(enabled) {
  [els.globalSearch, els.statusFilter, els.precinctFilter, els.downloadLoaded, els.downloadFiltered].forEach(el => {
    el.disabled = !enabled;
  });
}

function populateFilterOptions() {
  fillSelect(els.statusFilter, "voter_status_desc", "All statuses");
  fillSelect(els.precinctFilter, "precinct_desc", "All precincts");
}

function fillSelect(select, field, defaultLabel) {
  const values = Array.from(new Set(loadedRows.map(r => r[field]).filter(Boolean))).sort();
  select.innerHTML = `<option value="">${defaultLabel}</option>` +
    values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
}

function applyFilters() {
  const search = els.globalSearch.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const precinct = els.precinctFilter.value;

  filteredRows = loadedRows.filter(row => {
    if (status && row.voter_status_desc !== status) return false;
    if (precinct && row.precinct_desc !== precinct) return false;

    if (search) {
      const haystack = columns.map(col => row[col] || "").join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredRows.slice(start, start + PAGE_SIZE);

  els.tbody.innerHTML = pageRows.map(row => `
    <tr>
      <td>${escapeHtml(row.county_desc)}</td>
      <td>${escapeHtml(row["full-name"])}</td>
      <td>${escapeHtml(row["residential-address"])}</td>
      <td>${escapeHtml(row.precinct_desc)}</td>
      <td>${escapeHtml(row.voter_status_desc)}</td>
      <td>${escapeHtml(row.ncid)}</td>
    </tr>
  `).join("");

  els.resultCount.textContent = `${filteredRows.length.toLocaleString()} matching record(s) from ${loadedRows.length.toLocaleString()} loaded record(s).`;
  els.pageInfo.textContent = `Page ${filteredRows.length ? currentPage : 0} of ${filteredRows.length ? totalPages : 0}`;
  els.prevPage.disabled = currentPage <= 1;
  els.nextPage.disabled = currentPage >= totalPages || filteredRows.length === 0;
}

function downloadCsv(rows, filename) {
  if (!rows.length) {
    alert("No records to download.");
    return;
  }

  const csv = [columns.join(",")]
    .concat(rows.map(row => columns.map(col => csvEscape(row[col] || "")).join(",")))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift();
  if (!headers) return [];

  return rows.map(values => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    return obj;
  });
}

function csvEscape(value) {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toTitleCase(value = "") {
  return String(value).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
