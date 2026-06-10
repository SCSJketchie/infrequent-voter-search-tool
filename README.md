# Infrequent Voter Lookup

Static GitHub Pages prototype for searching a county-split infrequent voter list.

## Expected data structure

County CSV files should be stored in:

```text
data/counties/
```

The county manifest should be stored at:

```text
data/counties/counties.json
```

Each county CSV should use these columns:

```text
county_desc
full-name
res_street_address
res_city_desc
zip_code
```

## Updating data

1. Split the statewide file into county CSV files.
2. Generate/update `data/counties/counties.json`.
3. Upload the updated county CSVs and JSON file to GitHub.

The webpage lets users select one or more counties, load those records, search/filter by the loaded data, and download either the full statewide file assembled from county files or the currently selected/filtered results.


## Current interaction notes

- Search applies only to the `full-name` column.
- The only dropdown filter is City / Town, based on `res_city_desc`.
- Search and filters update results automatically as users type or change selections.
- Clear counties clears county selections, loaded records, results, filters, and search text.
