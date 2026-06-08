# Infrequent Voter Lookup

Static GitHub Pages prototype for searching a county-split infrequent voter list.

## Expected data structure

County CSV files should be placed in:

```text
data/counties/
```

Each county file should have these columns:

```text
county_desc
full-name
residential-address
precinct_desc
voter_status_desc
ncid
```

The site reads the available county list from:

```text
data/counties/counties.json
```

Example:

```json
[
  { "name": "SWAIN", "file": "swain.csv" },
  { "name": "WAKE", "file": "wake.csv" }
]
```

## Updating the data

1. Split the statewide CSV into county CSV files.
2. Put the county CSV files in `data/counties/`.
3. Update `data/counties/counties.json` so each county points to the correct filename.
4. Commit/upload the files to GitHub.

## Local testing

From the project folder, run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```
