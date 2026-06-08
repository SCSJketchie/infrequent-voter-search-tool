# Infrequent Voter Lookup Prototype

Static GitHub Pages prototype for searching a pre-filtered voter list.

## Files

- `index.html` — main webpage
- `style.css` — page styling
- `app.js` — CSV loading, search/filtering, and downloads
- `data/infrequent-voters.csv` — source data

## Expected CSV columns

The page expects these column names exactly:

```text
county_desc
full-name
residential-address
precinct_desc
voter_status_desc
ncid
```

## Updating the data

Replace:

```text
data/infrequent-voters.csv
```

with a new CSV using the same column names.

## Local testing

From this folder, run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```
