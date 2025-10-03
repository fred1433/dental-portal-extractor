# UC Benefits Automator

Automated extraction of comprehensive patient benefits data from United Concordia dental insurance portal.

## 🚀 Quick Start

### Run Extraction (Tkinter GUI)
```bash
./run_gui.sh
```

Or run directly:
```bash
python3 gui_extractor.py
```

This will:
- Launch a user-friendly graphical interface
- Enter portal credentials (username/password)
- Enter patient information (member ID and DOB)
- Show live extraction logs with real-time progress
- Display categories processed, procedures extracted, and current status
- Save results to `mypatientbenefitssummary.json`

## 📋 Features

### ✅ Comprehensive Data Extraction
- **25 procedure categories** fully extracted
- **817+ procedures** with detailed information
- **Benefits summary** including:
  - Network and Group Information
  - Patient Information (Member ID, DOB, Age, Coverage Effective, etc.)
  - Policy Information (Deductibles, Maximums, Coordination rules)
  - Service History Snapshot

### ✅ Structured JSON Output
- Organized by category (`procedures_by_category`)
- Each category is collapsible/expandable in JSON viewers
- Includes procedure details, cost share, related procedures, service history, policy details

### ✅ User-Friendly GUI
- Clean Tkinter-based graphical interface
- Real-time progress bar and status updates
- Live log streaming in scrollable text area
- Categories and procedures count tracking
- Easy input forms for credentials and patient data
- Status indicators (Authenticating, Extracting, Complete)

## 📁 Project Structure

```
uc-benefits-automator/
├── APIScrapper_v3.py          # Main scraper engine
├── gui_extractor.py           # Tkinter GUI application
├── run_gui.sh                 # GUI launcher script
├── requirements.txt           # Python dependencies
├── README.md                  # This file
├── .env                       # Environment variables (credentials)
├── .gitignore                 # Git ignore rules
└── mypatientbenefitssummary.json  # Output file (generated)
```

## 🔧 Setup

### Prerequisites
- Python 3.8+
- Tkinter (usually included with Python)

### Install Dependencies

1. Create a virtual environment:
```bash
python3 -m venv venv
```

2. Activate the virtual environment:
```bash
source venv/bin/activate
```

3. Install required packages:
```bash
pip install -r requirements.txt
```

## 📊 Output Format

The extraction generates `mypatientbenefitssummary.json` with the following structure:

```json
{
  "benefits_summary": {
    "Network and Group Information": { ... },
    "Patient Information": { ... },
    "Policy - Deductibles and Maximums": [ ... ],
    "Policy - Coordination and Other Benefits": [ ... ],
    "Service History Snapshot": [ ... ]
  },
  "extraction_summary": {
    "total_categories_processed": 25,
    "total_procedures_extracted": 817,
    "extraction_date": "2025-10-01 17:58:48"
  },
  "procedures_by_category": {
    "Preventive Exams": {
      "category_index": 0,
      "procedure_count": 10,
      "procedures": { ... }
    },
    "Xrays": { ... },
    ...
  }
}
```

## ⏱️ Performance

- **Full extraction**: ~30-40 minutes for all 25 categories
- **Per category**: ~1-2 minutes depending on procedure count
- **No sleep delays**: Optimized for speed

## 🛠️ Usage

### Default Credentials (Pre-filled in GUI)
The GUI provides defaults for easy testing:
- Username: `BPKPortalAccess4771`
- Password: `SmileyTooth4771!`
- Member ID: `00964917`
- DOB: `02/17/2010`

You can modify these values in the GUI for different patients.

### Running the GUI
```bash
# Make the launcher executable (first time only)
chmod +x run_gui.sh

# Launch the GUI
./run_gui.sh
```

## 📝 Notes

- **Flexible Patient Search**: Enter any member ID and DOB in the GUI - values are not hardcoded
- Extraction time varies based on network speed and server response
- All API calls include proper ViewState management for JSF framework
- Supports flexible field extraction (no hardcoded fields)
- Automatically handles category navigation and procedure detail expansion

## 🔒 Security

- Credentials can be stored in `.env` file (not committed to version control)
- `.gitignore` configured to exclude sensitive files
- HTTPS communication with United Concordia portal
- Session-based authentication

---

**Last Updated**: October 2025
