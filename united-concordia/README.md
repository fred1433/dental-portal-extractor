# United Concordia Data Extractor

Automated extraction of United Concordia dental benefits data.

## 🚀 Usage

```bash
# Activate virtual environment
source ../.venv/bin/activate

# Run scraper
python uc_scraper_final.py
```

## 📁 Structure

```
united-concordia/
├── uc_scraper_final.py         # Main scraper (Playwright)
├── parse_uc_html_enhanced.py   # HTML → JSON parser
├── normalize_json_structure.py # Normalization (optional)
├── DATA/                       # Extracted data
└── .uc-session/               # Persistent session
```

## 🔧 Workflow

1. **Scraper** captures HTML with expanded accordions
2. **Parser** extracts all data to JSON
3. **Normalization** (optional) standardizes structure
4. Ready JSON files in `DATA/`

## ✅ Captured Data

- Patient information
- Complete Group ID
- Timely Filing
- Other Insurance
- 822 procedures with prices and limitations
- Service history
- Policy details

## 📊 Output Format

Structured and normalized JSON, ready for:
- Form filling
- Database import
- Comparative analysis
