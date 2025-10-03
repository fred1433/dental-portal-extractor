#!/usr/bin/env python3
"""
GUI Application for UC Benefits Extraction
Clean interface with user-friendly logs
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import logging
from datetime import datetime
from APIScrapper_v3 import UnitedConcordiaPortalScraper
import sys

class CleanLogHandler(logging.Handler):
    """Handler that creates clean, user-friendly log messages"""

    def __init__(self, log_widget):
        super().__init__()
        self.log_widget = log_widget
        self.current_category = None
        self.procedure_count = 0

    def emit(self, record):
        msg = record.getMessage()

        # Filter and simplify messages
        clean_msg = None

        if "OAuth authentication" in msg:
            clean_msg = "🔐 Logging into United Concordia portal..."
        elif "OAuth login successful" in msg:
            clean_msg = "✅ Login successful!"
        elif "Navigating to benefits portal" in msg:
            clean_msg = "🚀 Navigating to benefits portal..."
        elif "SUCCESS: Direct OAM POST successful" in msg:
            clean_msg = "✅ Successfully accessed portal"
        elif "Searching for patient" in msg:
            clean_msg = f"🔍 Searching for patient..."
        elif "Success indicator found" in msg and "member name" in msg:
            clean_msg = "✅ Patient found! Loading benefits data..."
        elif "Extracting benefits summary" in msg:
            clean_msg = "📊 Extracting benefits summary (Network, Patient Info, Policy)..."
        elif "Extracted 5 summary sections" in msg or "Extracted" in msg and "summary sections" in msg:
            clean_msg = "✅ Benefits summary extracted successfully"
        elif "Processing category" in msg:
            import re
            match = re.search(r"category (\d+)/(\d+): '([^']+)'", msg)
            if match:
                num, total, name = match.groups()
                self.current_category = name
                clean_msg = f"\n📁 Category {num}/{total}: {name}"
        elif "Found" in msg and "procedures in target category" in msg:
            import re
            match = re.search(r"Found (\d+) procedures", msg)
            if match:
                count = match.group(1)
                clean_msg = f"   ➜ Found {count} procedures in this category"
        elif "Getting detailed info for" in msg and "(index" in msg:
            import re
            match = re.search(r"for ([A-Z0-9]+) \(index (\d+)\): (.+)", msg)
            if match:
                code, idx, name = match.groups()
                self.procedure_count += 1
                clean_msg = f"   ⚙️  Extracting {code}: {name}"
        elif "✓ Got comprehensive data for" in msg:
            import re
            match = re.search(r"for ([A-Z0-9]+)", msg)
            if match:
                code = match.group(1)
                clean_msg = f"   ✅ {code} complete"
        elif "✓ Category" in msg and "complete:" in msg:
            import re
            match = re.search(r"'([^']+)' complete: (\d+) procedures", msg)
            if match:
                name, count = match.groups()
                clean_msg = f"✅ {name}: {count} procedures extracted\n"
        elif "ALL CATEGORIES EXTRACTION COMPLETE" in msg:
            clean_msg = "\n🎉 ✅ EXTRACTION COMPLETE! All data saved successfully."

        if clean_msg:
            timestamp = datetime.now().strftime('%H:%M:%S')
            self.log_widget.insert(tk.END, f"[{timestamp}] {clean_msg}\n")
            self.log_widget.see(tk.END)
            self.log_widget.update()

class BenefitsExtractorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("UC Benefits Extractor")
        self.root.geometry("800x700")
        self.root.resizable(True, True)

        # Configure style
        style = ttk.Style()
        style.theme_use('clam')

        # Main container
        main_frame = ttk.Frame(root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Configure grid weights
        root.columnconfigure(0, weight=1)
        root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(5, weight=1)

        # Title
        title_label = ttk.Label(main_frame, text="🦷 UC Benefits Data Extractor",
                               font=('Arial', 18, 'bold'))
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))

        # Credentials Section
        cred_frame = ttk.LabelFrame(main_frame, text="Portal Credentials", padding="10")
        cred_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        cred_frame.columnconfigure(1, weight=1)

        ttk.Label(cred_frame, text="Username:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.username_entry = ttk.Entry(cred_frame, width=40)
        self.username_entry.insert(0, "BPKPortalAccess4771")
        self.username_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=5, pady=5)

        ttk.Label(cred_frame, text="Password:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.password_entry = ttk.Entry(cred_frame, show="*", width=40)
        self.password_entry.insert(0, "SmileyTooth4771!")
        self.password_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), padx=5, pady=5)

        # Patient Info Section
        patient_frame = ttk.LabelFrame(main_frame, text="Patient Information", padding="10")
        patient_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        patient_frame.columnconfigure(1, weight=1)

        ttk.Label(patient_frame, text="Member ID:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.member_id_entry = ttk.Entry(patient_frame, width=40)
        self.member_id_entry.insert(0, "00964917")
        self.member_id_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=5, pady=5)

        ttk.Label(patient_frame, text="Date of Birth:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.dob_entry = ttk.Entry(patient_frame, width=40)
        self.dob_entry.insert(0, "02/17/2010")
        self.dob_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), padx=5, pady=5)

        # Progress Section
        self.progress_label = ttk.Label(main_frame, text="Ready to extract",
                                       font=('Arial', 10))
        self.progress_label.grid(row=3, column=0, columnspan=2, pady=(0, 10))

        self.progress_bar = ttk.Progressbar(main_frame, mode='indeterminate')
        self.progress_bar.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))

        # Logs Section
        log_frame = ttk.LabelFrame(main_frame, text="Extraction Logs", padding="10")
        log_frame.grid(row=5, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)

        self.log_text = scrolledtext.ScrolledText(log_frame, height=20, width=70,
                                                  font=('Consolas', 9))
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=6, column=0, columnspan=2, pady=(10, 0))

        self.start_button = ttk.Button(button_frame, text="Start Extraction",
                                       command=self.start_extraction)
        self.start_button.grid(row=0, column=0, padx=5)

        self.cancel_button = ttk.Button(button_frame, text="Cancel",
                                        command=self.cancel_extraction, state='disabled')
        self.cancel_button.grid(row=0, column=1, padx=5)

        # Status
        self.status_label = ttk.Label(main_frame, text="⏱️  Estimated time: 30-40 minutes for all 25 categories",
                                     font=('Arial', 9), foreground='gray')
        self.status_label.grid(row=7, column=0, columnspan=2, pady=(10, 0))

        self.running = False

    def start_extraction(self):
        # Validate inputs
        username = self.username_entry.get().strip()
        password = self.password_entry.get().strip()
        member_id = self.member_id_entry.get().strip()
        dob = self.dob_entry.get().strip()

        if not all([username, password, member_id, dob]):
            messagebox.showerror("Error", "All fields are required!")
            return

        # Disable inputs
        self.start_button.config(state='disabled')
        self.cancel_button.config(state='normal')
        self.running = True

        # Clear logs
        self.log_text.delete(1.0, tk.END)
        self.log_text.insert(tk.END, "🚀 Starting extraction...\n\n")

        # Start progress bar
        self.progress_bar.start()

        # Run extraction in thread
        thread = threading.Thread(target=self.run_extraction,
                                 args=(username, password, member_id, dob))
        thread.daemon = True
        thread.start()

    def run_extraction(self, username, password, member_id, dob):
        try:
            # Setup logging
            log_handler = CleanLogHandler(self.log_text)
            log_handler.setLevel(logging.INFO)

            scraper = UnitedConcordiaPortalScraper()
            scraper.logger.addHandler(log_handler)
            scraper.logger.setLevel(logging.INFO)

            # Run extraction
            self.update_status("Authenticating...")
            scraper.authenticate(username, password)

            self.update_status("Navigating to portal...")
            if not scraper.navigate_to_benefits_portal():
                raise Exception("Failed to navigate to portal")

            self.update_status("Searching for patient...")
            if not scraper.search_patient(member_id, dob):
                raise Exception("Patient not found")

            self.update_status("Extracting benefits data...")
            results = scraper.extract_all_categories_data()

            if results:
                summary = results.get('extraction_summary', {})
                self.update_status("✅ Extraction Complete!")
                messagebox.showinfo(
                    "Success",
                    f"Extraction Complete!\n\n"
                    f"Categories: {summary.get('total_categories_processed', 0)}\n"
                    f"Procedures: {summary.get('total_procedures_extracted', 0)}\n\n"
                    f"Saved to: mypatientbenefitssummary.json"
                )
            else:
                raise Exception("Extraction failed")

        except Exception as e:
            self.log_text.insert(tk.END, f"\n❌ ERROR: {str(e)}\n")
            messagebox.showerror("Error", str(e))
        finally:
            self.progress_bar.stop()
            self.start_button.config(state='normal')
            self.cancel_button.config(state='disabled')
            self.running = False

    def update_status(self, text):
        self.progress_label.config(text=text)
        self.root.update()

    def cancel_extraction(self):
        self.running = False
        self.progress_bar.stop()
        self.start_button.config(state='normal')
        self.cancel_button.config(state='disabled')
        self.log_text.insert(tk.END, "\n⚠️  Extraction cancelled by user\n")

if __name__ == "__main__":
    root = tk.Tk()
    app = BenefitsExtractorGUI(root)
    root.mainloop()
