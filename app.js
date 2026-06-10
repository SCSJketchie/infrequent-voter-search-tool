const COUNTY_MANIFEST = "data/counties/counties.json";
const COUNTY_BASE_PATH = "data/counties/";
const PAGE_SIZE = 100;

const columns = [
  "county_desc",
  "full-name",
  "res_street_address",
  "res_city_desc",
  "zip_code"
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
  cityFilter: document.getElementById("cityFilter"),
  downloadStatewide: document.getElementById("downloadStatewide"),
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
    els.downloadStatewide.disabled = false;
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
  resetLoadedData();
});

els.loadCounties.addEventListener("click", loadSelectedCounties);
els.globalSearch.addEventListener("input", debounce(applyFilters, 250));
els.cityFilter.addEventListener("change", applyFilters);
els.downloadStatewide.addEventListener("click", downloadStatewideCsv);
els.downloadFiltered.addEventListener("click", () => downloadCsv(filteredRows, "selected-filtered-voter-list.csv"));
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

  els.globalSearch.value = "";
  els.cityFilter.innerHTML = '<option value="">All cities/towns</option>';
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

function resetLoadedData() {
  loadedRows = [];
  filteredRows = [];
  currentPage = 1;

  els.globalSearch.value = "";
  els.cityFilter.innerHTML = '<option value="">All cities/towns</option>';
  setControlsEnabled(false);

  els.tbody.innerHTML = "";
  els.resultCount.textContent = "No counties loaded.";
  els.pageInfo.textContent = "Page 0 of 0";
  els.prevPage.disabled = true;
  els.nextPage.disabled = true;

  els.loadStatus.textContent = `${countyManifest.length} county file(s) available.`;
  setProgress("County selections cleared. No voter records are currently loaded.", "success");
}

function debounce(fn, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
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
  [els.globalSearch, els.cityFilter, els.downloadFiltered].forEach(el => {
    el.disabled = !enabled;
  });
}

function populateFilterOptions() {
  fillSelect(els.cityFilter, "res_city_desc", "All cities/towns");
}

function fillSelect(select, field, defaultLabel) {
  const values = Array.from(new Set(loadedRows.map(r => r[field]).filter(Boolean))).sort();
  select.innerHTML = `<option value="">${defaultLabel}</option>` +
    values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
}

function applyFilters() {
  const search = els.globalSearch.value.trim().toLowerCase();
  const city = els.cityFilter.value;

  filteredRows = loadedRows.filter(row => {
    if (city && row.res_city_desc !== city) return false;

    if (search) {
      const name = (row["full-name"] || "").toLowerCase();
      if (!name.includes(search)) return false;
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
      <td>${escapeHtml(row["res_street_address"])}</td>
      <td>${escapeHtml(row.res_city_desc)}</td>
      <td>${escapeHtml(row.zip_code)}</td>
    </tr>
  `).join("");

  els.resultCount.textContent = `${filteredRows.length.toLocaleString()} matching record(s) from ${loadedRows.length.toLocaleString()} loaded record(s).`;
  els.pageInfo.textContent = `Page ${filteredRows.length ? currentPage : 0} of ${filteredRows.length ? totalPages : 0}`;
  els.prevPage.disabled = currentPage <= 1;
  els.nextPage.disabled = currentPage >= totalPages || filteredRows.length === 0;
}

async function downloadStatewideCsv() {
  if (!countyManifest.length) {
    alert("County list is not loaded yet.");
    return;
  }

  const originalLabel = els.downloadStatewide.textContent;
  els.downloadStatewide.disabled = true;
  els.downloadStatewide.textContent = "Preparing statewide download...";
  setProgress("Preparing full statewide voter list download...", "loading");

  try {
    const chunks = [];

    for (let i = 0; i < countyManifest.length; i++) {
      const county = countyManifest[i];
      const countyLabel = toTitleCase(county.name);
      setProgress(`Adding ${countyLabel} to statewide download (${i + 1} of ${countyManifest.length})...`, "loading");

      const text = await fetchText(COUNTY_BASE_PATH + county.file);

      if (i === 0) {
        chunks.push(text.trimEnd());
      } else {
        chunks.push(stripHeaderRow(text).trimEnd());
      }

      await nextFrame();
    }

    const csv = chunks.filter(Boolean).join("\n");
    downloadBlob(csv, "full-statewide-voter-list.csv");
    setProgress("Full statewide voter list download is ready.", "success");
  } catch (error) {
    console.error(error);
    setProgress(`Statewide download failed: ${error.message}`, "error");
  } finally {
    els.downloadStatewide.disabled = false;
    els.downloadStatewide.textContent = originalLabel;
  }
}

function stripHeaderRow(text) {
  const newlineIndex = text.indexOf("\n");
  if (newlineIndex === -1) return "";
  return text.slice(newlineIndex + 1);
}

function downloadBlob(text, filename) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadCsv(rows, filename) {
  if (!rows.length) {
    alert("No records to download.");
    return;
  }

  const csv = [columns.join(",")]
    .concat(rows.map(row => columns.map(col => csvEscape(row[col] || "")).join(",")))
    .join("\n");

  downloadBlob(csv, filename);
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
