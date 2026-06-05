const DATA_URL = "data/voters.csv";
const COLUMNS = [
  "county",
  "first_name",
  "last_name",
  "residential_address",
  "city",
  "zip",
  "ncid",
  "status",
  "precinct"
];

const searchInput = document.querySelector("#searchInput");
const countyFilter = document.querySelector("#countyFilter");
const statusFilter = document.querySelector("#statusFilter");
const clearFilters = document.querySelector("#clearFilters");
const resultCount = document.querySelector("#resultCount");
const tableBody = document.querySelector("#resultsTable tbody");
const downloadFiltered = document.querySelector("#downloadFiltered");

let rows = [];
let currentRows = [];
let currentDownloadUrl = null;

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
    console.error(error);
  });

searchInput.addEventListener("input", applyFilters);
countyFilter.addEventListener("change", applyFilters);
statusFilter.addEventListener("change", applyFilters);
clearFilters.addEventListener("click", () => {
  searchInput.value = "";
  countyFilter.value = "";
  statusFilter.value = "";
  applyFilters();
});

downloadFiltered.addEventListener("click", event => {
  if (!currentRows.length) {
    event.preventDefault();
    alert("There are no selected records to download.");
  }
});

function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = splitCSVLine(lines.shift());

  return lines.map(line => {
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
  addOptions(countyFilter, uniqueSorted(data.map(row => row.county)));
  addOptions(statusFilter, uniqueSorted(data.map(row => row.status)));
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

  const filteredRows = rows.filter(row => {
    const matchesSearch = !searchTerm || Object.values(row).some(value =>
      String(value).toLowerCase().includes(searchTerm)
    );

    const matchesCounty = !county || row.county === county;
    const matchesStatus = !status || row.status === status;

    return matchesSearch && matchesCounty && matchesStatus;
  });

  renderTable(filteredRows);
}

function renderTable(data) {
  currentRows = data;
  tableBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  data.forEach(row => {
    const tr = document.createElement("tr");
    COLUMNS.forEach(column => {
      const td = document.createElement("td");
      td.textContent = row[column] ?? "";
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });

  tableBody.appendChild(fragment);
  resultCount.textContent = `${data.length.toLocaleString()} of ${rows.length.toLocaleString()} records shown`;
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
