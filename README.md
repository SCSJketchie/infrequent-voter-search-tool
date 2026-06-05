# Voter Lookup Prototype

This is a tiny static searchable table prototype.

## Files

- `index.html` — webpage structure
- `style.css` — visual styling
- `app.js` — loads CSV, filters data, renders table
- `data/voters.csv` — sample data

## Local testing note

Because the page uses JavaScript `fetch()` to load the CSV, some browsers may block it when opening `index.html` directly from your computer.

The easiest local test is to run a tiny local web server from this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## GitHub Pages

Upload these files to a GitHub repository, then enable Pages from the repository settings.

Future updates should usually only require replacing `data/voters.csv` with a new file using the same column names.
