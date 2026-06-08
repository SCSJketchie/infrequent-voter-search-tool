const DATA_URL = "data/infrequent-voters.csv";
const COLUMNS = [
  "county_desc",
  "full-name",
  "residential-address",
  "precinct_desc",
  "voter_status_desc",
  "ncid"
];
const COLUMN_LABELS = {
  "county_desc": "County",
  "full-name": "Full Name",
  "residential-address": "Residential Address",
  "precinct_desc": "Precinct",
  "voter_status_desc": "Voter Status",
  "ncid": "NCID"
};
const MAX_DISPLAY_ROWS = 1000;

const searchInput = document.querySelector("#searchInput");
const countyFilter = document.querySelector("#countyFilter");
const statusFilter = document.querySelector("#statusFilter");
const precinctFilter = document.querySelector("#precinctFilter");
const clearFilters = document.querySelector("#clearFilters");
const resultCount = document.querySelector("#resultCount");
const displayNote = document.querySelector("#displayNote");
const tableBody = document.querySelector("#resultsTable tbody");
const downloadFiltered = document.querySelector("#downloadFiltered");

let rows = [];
let currentRows = [];
let currentDownloadUrl = null;
let debounceTimer = null;

fetch(DATA_URL)
  .then(response => {
    if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);
    return response.text();
  })
  .then(csvText => {
    rows = parseCSV(csvText);
    populateFilters(rows);
    renderTable(rows);
  })
  .catch(error => {
    resultCount.textContent = "Data could not be loaded.";
    displayNote.textContent = "Check that data/infrequent-voters.csv exists and that the site is being served from a web server, not opened directly as a file.";
    console.error(error);
  });

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilters, 150);
});
countyFilter.addEventListener("change", applyFilters);
statusFilter.addEventListener("change", applyFilters);
precinctFilter.addEventListener("change", applyFilters);
clearFilters.addEventListener("click", () => {
  searchInput.value = "";
  countyFilter.value = "";
  statusFilter.value = "";
  precinctFilter.value = "";
  applyFilters();
});

downloadFiltered.addEventListener("click", event => {
  if (!currentRows.length) {
    event.preventDefault();
    alert("There are no selected records to download.");
  }
});

function parseCSV(csvText) {
  const lines = csvText.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = splitCSVLine(lines.shift());

  return lines
    .filter(line => line.trim() !== "")
    .map(line => {
      const values = splitCSVLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    });
}

function splitCSVLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function populateFilters(data) {
  addOptions(countyFilter, uniqueSorted(data.map(row => row["county_desc"])));
  addOptions(statusFilter, uniqueSorted(data.map(row => row["voter_status_desc"])));
  addOptions(precinctFilter, uniqueSorted(data.map(row => row["precinct_desc"])));
}

function addOptions(selectElement, options) {
  options.forEach(optionValue => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    selectElement.appendChild(option);
  });
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function applyFilters() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const county = countyFilter.value;
  const status = statusFilter.value;
  const precinct = precinctFilter.value;

  const filteredRows = rows.filter(row => {
    const matchesSearch = !searchTerm || COLUMNS.some(column =>
      String(row[column] ?? "").toLowerCase().includes(searchTerm)
    );

    const matchesCounty = !county || row["county_desc"] === county;
    const matchesStatus = !status || row["voter_status_desc"] === status;
    const matchesPrecinct = !precinct || row["precinct_desc"] === precinct;

    return matchesSearch && matchesCounty && matchesStatus && matchesPrecinct;
  });

  renderTable(filteredRows);
}

function renderTable(data) {
  currentRows = data;
  tableBody.innerHTML = "";

  const visibleRows = data.slice(0, MAX_DISPLAY_ROWS);
  const fragment = document.createDocumentFragment();

  visibleRows.forEach(row => {
    const tr = document.createElement("tr");
    COLUMNS.forEach(column => {
      const td = document.createElement("td");
      td.textContent = row[column] ?? "";
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });

  tableBody.appendChild(fragment);
  resultCount.textContent = `${data.length.toLocaleString()} of ${rows.length.toLocaleString()} records selected`;

  if (data.length > MAX_DISPLAY_ROWS) {
    displayNote.textContent = `Showing the first ${MAX_DISPLAY_ROWS.toLocaleString()} selected records. The selected download includes all ${data.length.toLocaleString()} selected records.`;
  } else {
    displayNote.textContent = "";
  }

  updateFilteredDownload(data);
}

function updateFilteredDownload(data) {
  if (currentDownloadUrl) {
    URL.revokeObjectURL(currentDownloadUrl);
  }

  const csv = convertRowsToCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  currentDownloadUrl = URL.createObjectURL(blob);

  downloadFiltered.href = currentDownloadUrl;
  downloadFiltered.download = "selected-voter-list.csv";
  downloadFiltered.classList.toggle("disabled", data.length === 0);
  downloadFiltered.setAttribute("aria-disabled", data.length === 0 ? "true" : "false");
}

function convertRowsToCSV(data) {
  const headerLine = COLUMNS.join(",");
  const dataLines = data.map(row =>
    COLUMNS.map(column => escapeCSVValue(row[column] ?? "")).join(",")
  );

  return [headerLine, ...dataLines].join("\n");
}

function escapeCSVValue(value) {
  const stringValue = String(value);
  const needsQuotes = /[",\n\r]/.test(stringValue);
  const escapedValue = stringValue.replaceAll('"', '""');

  return needsQuotes ? `"${escapedValue}"` : escapedValue;
}
