import requests
import re
import json
import time
from bs4 import BeautifulSoup
from urllib.parse import urlencode, urlparse, parse_qs, unquote
import logging

class UnitedConcordiaPortalScraper:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = "https://www.unitedconcordia.com/tuctpi/index.xhtml"
        self.login_url = "https://www.unitedconcordia.com"
        self.current_viewstate = None
        self.is_authenticated = False
        
        self.stored_username = None
        self.stored_password = None
        
        self.scraped_data = {
            'members': [],
            'policy_info': {},
            'procedures': {},
            'service_history': []
        }
        
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
            'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        })
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def save_debug_html(self, content, filename):
        """Save HTML content for debugging"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            self.logger.info(f"Debug HTML saved to {filename}")
        except Exception as e:
            self.logger.error(f"Failed to save debug HTML: {e}")

    def save_debug_json(self, data, filename):
        """Save JSON data for debugging"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            self.logger.info(f"Debug JSON saved to {filename}")
        except Exception as e:
            self.logger.error(f"Failed to save debug JSON: {e}")

    def authenticate(self, username, password):
        """Handle OAuth authentication process"""
        try:
            self.logger.info("Starting OAuth authentication process...")
            
            self.stored_username = username
            self.stored_password = password
            
            login_response = self.session.get('https://www.unitedconcordia.com/login', allow_redirects=True)
            if login_response.status_code != 200:
                raise Exception(f"Failed to access OAuth page: {login_response.status_code}")
            
            self.logger.info(f"Redirected to: {login_response.url}")
            
            soup = BeautifulSoup(login_response.text, 'html.parser')
            enc_form = soup.find('input', {'name': 'enc_post_data'})
            if not enc_form:
                raise Exception("OAuth consent form not found")
            
            oauth_form = enc_form.find_parent('form')
            if not oauth_form:
                raise Exception("OAuth parent form not found")
            
            form_action = oauth_form.get('action')
            enc_data = enc_form.get('value', '')
            
            self.logger.info("Submitting OAuth consent...")
            
            consent_response = self.session.post(
                form_action,
                data={'enc_post_data': enc_data},
                allow_redirects=True
            )
            
            if consent_response.status_code != 200:
                raise Exception(f"OAuth consent failed: {consent_response.status_code}")
            
            self.logger.info(f"After consent: {consent_response.url}")
            
            parsed_url = urlparse(consent_response.url)
            url_params = parse_qs(parsed_url.query)
            
            bmctx = url_params.get('bmctx', [''])[0]
            challenge_url = url_params.get('challenge_url', [''])[0]
            request_id = url_params.get('request_id', [''])[0]
            resource_url = url_params.get('resource_url', [''])[0]
            
            if not challenge_url or not bmctx:
                raise Exception("Missing challenge_url or bmctx in OAuth response")
            
            challenge_url_decoded = unquote(challenge_url)
            
            self.logger.info(f"Submitting credentials to: {challenge_url_decoded}")
            
            auth_data = {
                'username': username,
                'password': password,
                'bmctx': bmctx,
                'request_id': request_id,
                'challenge_url': challenge_url,
                'resource_url': resource_url,
                'authn_try_count': '0',
                'locale': 'en_US',
                'contextType': 'external'
            }
            
            login_response = self.session.post(
                challenge_url_decoded,
                data=auth_data,
                allow_redirects=True,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            self.logger.info(f"After credential submission: {login_response.url}")
            
            if self._verify_login_success(login_response):
                self.is_authenticated = True
                self.logger.info("OAuth login successful")
                return True
            else:
                # Login failed
                raise Exception("Login failed - credentials may be invalid")
                
        except Exception as e:
            self.logger.error(f"OAuth authentication failed: {e}")
            raise

    def _verify_login_success(self, response):
        """Verify if OAuth login was successful"""
        success_url_patterns = ['tuctpi', 'mypatients', 'benefits', 'portal', 'dashboard']
        current_url = response.url.lower()
        
        for pattern in success_url_patterns:
            if pattern in current_url:
                self.logger.info(f"Login success detected by URL pattern: {pattern}")
                return True
        
        if response.status_code == 200 and 'login' not in current_url:
            return True
        
        return False

    def navigate_to_benefits_portal(self):
        """Navigate to the benefits portal"""
        try:
            if not self.is_authenticated:
                raise Exception("Must be authenticated before navigating to benefits portal")
            
            self.logger.info("Navigating to benefits portal...")
            
            portal_urls = [
                "https://www.unitedconcordia.com/tuctpi/index.xhtml",
                "https://www.unitedconcordia.com/tuctpi/subscriber.xhtml"
            ]
            
            for url in portal_urls:
                try:
                    self.logger.info(f"Attempting portal access: {url}")
                    
                    response = self.session.get(url, allow_redirects=False)
                    
                    if response.status_code == 200:
                        if self._is_benefits_portal_page(response.text):
                            self.base_url = url
                            self.logger.info(f"SUCCESS: Direct portal access successful")
                            return True
                    
                    elif response.status_code in [301, 302, 303, 307, 308]:
                        redirect_url = response.headers.get('Location')
                        if redirect_url:
                            if not redirect_url.startswith('http'):
                                parsed_url = urlparse(url)
                                redirect_url = f"{parsed_url.scheme}://{parsed_url.netloc}{redirect_url}"
                            
                            self.logger.info(f"Got redirect to: {redirect_url}")
                            
                            if 'oam' in redirect_url.lower() or 'cdsso' in redirect_url.lower():
                                self.logger.info(f"Detected OAM authentication challenge")
                                if self._handle_oam_authentication(redirect_url):
                                    return True
                        
                except Exception as e:
                    self.logger.warning(f"Portal access failed for {url}: {e}")
                    continue
            
            return False
            
        except Exception as e:
            self.logger.error(f"Navigation failed: {e}")
            raise

    def _is_benefits_portal_page(self, html_content):
        """Check if the current page is the actual benefits portal"""
        content_lower = html_content.lower()
        
        redirect_indicators = [
            'window.location',
            'redirecting to correct login',
            'javascript is required',
            'login-web-root',
            'obrareq.cgi',
            'challenge_url'
        ]
        
        for indicator in redirect_indicators:
            if indicator in content_lower:
                self.logger.info(f"Excluding redirect/login page due to: {indicator}")
                return False
        
        portal_content_indicators = [
            'member id',
            'date of birth',
            'mypatients',
            'subscriber',
            'patient dashboard',
            'benefits information',
            'eligibility',
            'claims status'
        ]
        
        form_indicators = [
            '<input type="text"',
            'placeholder=',
            '<form',
            'submit',
            'search'
        ]
        
        found_portal_content = 0
        found_form_elements = 0
        
        for indicator in portal_content_indicators:
            if indicator in content_lower:
                found_portal_content += 1
        
        for indicator in form_indicators:
            if indicator in content_lower:
                found_form_elements += 1
        
        has_substantial_content = len(content_lower) > 1000
        
        is_portal_page = (
            found_portal_content >= 2 and 
            found_form_elements >= 2 and 
            has_substantial_content
        )
        
        if is_portal_page:
            self.logger.info(f"Portal detected: content={found_portal_content}, forms={found_form_elements}, substantial={has_substantial_content}")
        
        return is_portal_page

    def _handle_oam_authentication(self, redirect_url):
        """Handle Oracle Access Manager authentication challenge"""
        try:
            self.logger.info(f"Processing OAM authentication challenge: {redirect_url}")
            
            oam_response = self.session.get(redirect_url, allow_redirects=True)
            
            if oam_response.status_code != 200:
                self.logger.error(f"OAM challenge request failed: {oam_response.status_code}")
                return False
            
            # Process OAM challenge
            
            content_lower = oam_response.text.lower()
            
            if 'window.location' in content_lower:
                self.logger.info(f"Excluding redirect/login page due to: window.location")
                return self._try_direct_oam_post(redirect_url)
            
            if self._is_benefits_portal_page(oam_response.text):
                self.base_url = oam_response.url
                self.logger.info(f"SUCCESS: Direct OAM POST successful")
                return True
            
            return self._try_direct_oam_post(redirect_url)
            
        except Exception as e:
            self.logger.error(f"OAM authentication handling failed: {e}")
            return False

    def _try_direct_oam_post(self, oam_url):
        """Try direct POST to OAM endpoint with credentials"""
        try:
            self.logger.info("Attempting direct OAM credential submission...")
            
            parsed_oam = urlparse(oam_url)
            oam_base = f"{parsed_oam.scheme}://{parsed_oam.netloc}"
            
            oam_auth_endpoints = [
                f"{oam_base}/oam/server/auth_cred_submit",
                f"{oam_base}/oam/server/obrareq.cgi",
                parsed_oam.geturl()
            ]
            
            credential_formats = [
                {
                    'username': self.stored_username,
                    'password': self.stored_password,
                    'request_id': '',
                    'authn_try_count': '0',
                    'contextType': 'external',
                    'locale': 'en_US'
                },
                {
                    'user': self.stored_username,
                    'password': self.stored_password
                }
            ]
            
            for endpoint in oam_auth_endpoints:
                for creds in credential_formats:
                    try:
                        self.logger.info(f"Trying direct OAM POST: {endpoint}")
                        
                        response = self.session.post(
                            endpoint,
                            data=creds,
                            allow_redirects=True,
                            headers={'Content-Type': 'application/x-www-form-urlencoded'}
                        )
                        
                        if response.status_code == 200:
                            
                            if self._is_benefits_portal_page(response.text):
                                self.base_url = response.url
                                self.logger.info(f"SUCCESS: Direct OAM POST successful")
                                return True
                        
                    except Exception as e:
                        self.logger.debug(f"Direct OAM POST failed: {e}")
                        continue
            
            return False
            
        except Exception as e:
            self.logger.error(f"Direct OAM POST attempt failed: {e}")
            return False

    def search_patient(self, member_id, dob):
        """Search for patient using member ID and DOB"""
        try:
            if not self.is_authenticated:
                raise Exception("Must be authenticated before searching")
            
            self.logger.info(f"Searching for patient: {member_id}")
            
            response = self.session.get(self.base_url)
            if response.status_code != 200:
                raise Exception(f"Could not access portal page: {response.status_code}")
            
            # Verify portal page
            
            if not self._is_benefits_portal_page(response.text):
                raise Exception("Not on the benefits portal page")
            
            soup = BeautifulSoup(response.text, 'html.parser')
            return self._submit_search_form(soup, member_id, dob)
                
        except Exception as e:
            self.logger.error(f"Patient search failed: {e}")
            raise

    def _submit_search_form(self, soup, member_id, dob):
        """Find and submit the search form"""
        search_form = soup.find('form', {'id': 'search'})
        
        if search_form:
            self.logger.info("Found search form by ID")
            
            member_field = search_form.find('input', {'name': 'search:search1'})
            dob_field = search_form.find('input', {'name': 'search:search2'})
            
            if member_field and dob_field:
                self.logger.info(f"Found specific search fields: member={member_field.get('name')}, dob={dob_field.get('name')}")
                return self._perform_search_submission(search_form, member_field, dob_field, member_id, dob)
        
        raise Exception("Could not find suitable search form")

    def _perform_search_submission(self, form, member_field, dob_field, member_id, dob):
        """Perform the actual search form submission"""
        search_data = {}
        
        search_data[member_field.get('name')] = member_id
        search_data[dob_field.get('name')] = dob
        
        for hidden_input in form.find_all('input', {'type': 'hidden'}):
            name = hidden_input.get('name')
            value = hidden_input.get('value', '')
            if name:
                search_data[name] = value
        
        submit_buttons = form.find_all(['input', 'button'], {'type': 'submit'})
        if submit_buttons:
            submit_button = submit_buttons[0]
            if submit_button.get('name'):
                search_data[submit_button.get('name')] = submit_button.get('value', 'Search')
        
        form_action = form.get('action') or self.base_url
        if not form_action.startswith('http'):
            parsed_base = urlparse(self.base_url)
            form_action = f"{parsed_base.scheme}://{parsed_base.netloc}{form_action}"
        
        self.logger.info(f"Submitting search to: {form_action}")
        search_response = self.session.post(form_action, data=search_data)
        
        if search_response.status_code == 200:
            return self._verify_patient_found(search_response.text)
        
        return False

    def _verify_patient_found(self, html_content):
        """Verify if patient search was successful"""
        success_indicators = [
            'member name', 'patient name', 'subscriber name', 'benefit details',
            'coverage', 'allowance', 'claims', 'procedure', 'deductible'
        ]
        
        text_lower = html_content.lower()
        found_indicators = 0
        
        for indicator in success_indicators:
            if indicator in text_lower:
                found_indicators += 1
                self.logger.info(f"Success indicator found: {indicator}")
        
        return found_indicators >= 2

    def extract_viewstate_from_current_page(self):
        """Extract ViewState from current benefits page"""
        try:
            response = self.session.get("https://www.unitedconcordia.com/tuctpi/subscriber.xhtml")
            if response.status_code != 200:
                self.logger.error(f"Could not access current page: {response.status_code}")
                return None
                
            soup = BeautifulSoup(response.text, 'html.parser')
            viewstate_input = soup.find('input', {'name': 'javax.faces.ViewState'})
            if viewstate_input:
                self.current_viewstate = viewstate_input.get('value', '')
                self.logger.info(f"Extracted ViewState: {self.current_viewstate[:50]}...")
                return self.current_viewstate
            else:
                self.logger.warning("ViewState not found")
                return None
        except Exception as e:
            self.logger.error(f"Failed to extract ViewState: {e}")
            return None
    
    ##Getting details from table here
    def _parse_category_procedures(self, xml_response, category_name):
        """Parse procedure data from category expansion response"""
        try:
            procedures = {}

            # Extract ALL CDATA content (there can be multiple sections)
            cdata_matches = re.findall(r'<!\[CDATA\[(.*?)\]\]>', xml_response, re.DOTALL)
            if not cdata_matches:
                self.logger.warning(f"No CDATA sections found for {category_name}")
                return procedures

            self.logger.debug(f"Found {len(cdata_matches)} CDATA sections for {category_name}")

            # Try each CDATA section until we find the procedure table that is NOT hidden
            # Important: The response contains multiple tables with same ID, but only the visible one has the data we want
            procedure_table = None
            for i, cdata_content in enumerate(cdata_matches):
                soup = BeautifulSoup(cdata_content, 'html.parser')
                # Find ALL tables with this ID
                all_tables = soup.find_all('table', {'id': 'benefitDetailAllServiceProceduresList'})

                # Look for the one that is NOT hidden
                for table in all_tables:
                    table_classes = table.get('class', [])
                    if 'hidden' not in table_classes:
                        procedure_table = table
                        self.logger.debug(f"Found VISIBLE procedure table in CDATA section {i+1} for {category_name}")
                        break

                if procedure_table:
                    break

            if not procedure_table:
                self.logger.warning(f"No visible procedure table found in any CDATA section for {category_name}")
                # Save response for debugging
                debug_filename = f"category_expansion_{category_name.replace(' ', '_')}_response.xml"
                self.save_debug_html(xml_response, debug_filename)
                self.logger.info(f"Saved category expansion response to {debug_filename} for inspection")
                return procedures
            
            # Parse each procedure row
            tbody = procedure_table.find('tbody')
            if tbody:
                rows = tbody.find_all('tr')
                
                for row in rows:
                    cells = row.find_all('td')
                    
                    if len(cells) >= 8:
                        # Extract procedure data
                        procedure_code = cells[0].get_text(strip=True)  # D0120, D0140, etc.
                        
                        # Get procedure name from the link
                        procedure_link = cells[1].find('a')
                        if procedure_link:
                            procedure_name = procedure_link.get_text(strip=True).replace('>', '').strip()
                            
                            # Extract JSF ID for detailed view (optional)
                            onclick = procedure_link.get('onclick', '')
                            jsf_match = re.search(r"getElementById\('([^']+)'\)", onclick)
                            detail_jsf_id = jsf_match.group(1) if jsf_match else None
                        else:
                            procedure_name = cells[1].get_text(strip=True)
                            detail_jsf_id = None
                        
                        covered = cells[2].get_text(strip=True)
                        allowance = cells[3].get_text(strip=True)
                        coverage = cells[4].get_text(strip=True)
                        limitation = cells[5].get_text(strip=True)
                        applies_to_deductible = cells[6].get_text(strip=True)
                        applies_to_maximum = cells[7].get_text(strip=True)
                        
                        # Store procedure data
                        procedures[procedure_code] = {
                            'procedure_code': procedure_code,
                            'procedure_name': procedure_name,
                            'category': category_name,
                            'covered': covered,
                            'allowance': allowance,
                            'coverage': coverage,
                            'limitation': limitation,
                            'applies_to_deductible': applies_to_deductible,
                            'applies_to_maximum': applies_to_maximum,
                            'detail_jsf_id': detail_jsf_id
                        }
                        
                        self.logger.info(f"    {procedure_code}: {procedure_name} - Allowance: {allowance}")
            
            return procedures
            
        except Exception as e:
            self.logger.error(f"Failed to parse category procedures: {e}")
            return {}

    def extract_benefits_summary(self):
        """Extract all summary data from the benefits page (Network info, Patient info, Service History, Policy Information)
        Uses flexible extraction - no hardcoded fields, adapts to any new fields added in the future"""
        try:
            self.logger.info("Extracting benefits summary data...")

            # Get the current benefits page HTML
            response = self.session.get("https://www.unitedconcordia.com/tuctpi/subscriber.xhtml")
            if response.status_code != 200:
                self.logger.error(f"Could not access benefits page: {response.status_code}")
                return None

            soup = BeautifulSoup(response.text, 'html.parser')

            summary_data = {}

            # === NETWORK AND GROUP INFORMATION ===
            network_data = {}

            # Your Network
            your_network_div = soup.find('div', id='your-network-individual-network')
            if your_network_div:
                network_data['Your Network'] = your_network_div.get_text(strip=True)

            # Group Network
            group_network_div = soup.find('div', id='policy-info-group-network')
            if group_network_div:
                network_data['Group Network'] = group_network_div.get_text(strip=True)

            # Group / ID, Timely Filing, Policyholder, Claims Address (using flexible pattern matching)
            for div in soup.find_all('div', class_='verticalLine'):
                # Use newline as separator to properly split after <br> tags
                text = div.get_text(separator='\n')

                if 'Group / ID' in text:
                    # Find the line containing "Group / ID" and get the next line
                    lines = text.split('\n')
                    for i, line in enumerate(lines):
                        if 'Group / ID' in line:
                            if i + 1 < len(lines):
                                network_data['Group / ID'] = lines[i + 1].strip()
                            break

                if 'Timely Filing' in text:
                    # Find the line containing "Timely Filing" and get the next line
                    lines = text.split('\n')
                    for i, line in enumerate(lines):
                        if 'Timely Filing' in line:
                            if i + 1 < len(lines):
                                network_data['Timely Filing'] = lines[i + 1].strip()
                            break

                if 'Policyholder' in text:
                    # Find the line containing "Policyholder" and get the next line(s) until "Claims Address"
                    lines = text.split('\n')
                    for i, line in enumerate(lines):
                        if 'Policyholder' in line:
                            if i + 1 < len(lines):
                                # Get all lines until we hit "Claims Address" or end
                                policyholder_lines = []
                                j = i + 1
                                while j < len(lines) and 'Claims Address' not in lines[j]:
                                    if lines[j].strip():
                                        policyholder_lines.append(lines[j].strip())
                                    j += 1
                                network_data['Policyholder'] = ' '.join(policyholder_lines)
                            break

                if 'Claims Address' in text:
                    # Find the line containing "Claims Address" and get the next line(s)
                    lines = text.split('\n')
                    for i, line in enumerate(lines):
                        if 'Claims Address' in line:
                            if i + 1 < len(lines):
                                # Collect all remaining non-empty lines as address
                                address_lines = []
                                j = i + 1
                                while j < len(lines):
                                    if lines[j].strip():
                                        address_lines.append(lines[j].strip())
                                    j += 1
                                network_data['Claims Address'] = '\n'.join(address_lines)
                            break

            if network_data:
                summary_data['Network and Group Information'] = network_data

            # === PATIENT/MEMBER INFORMATION ===
            patient_data = {}

            # Find member information table
            member_info_div = soup.find('div', class_='member-information')
            if member_info_div:
                # Extract table data (Member ID, DOB, Age, Relationship, Other Active Insurance)
                table = member_info_div.find('table')
                if table:
                    rows = table.find_all('tr')
                    for row in rows:
                        cells = row.find_all('td')
                        if len(cells) >= 2:
                            key = cells[0].get_text(strip=True)
                            value = cells[1].get_text(strip=True).replace('\n', ' ')
                            if key:
                                patient_data[key] = value

            # Extract additional fields (Coverage Effective, Member has a qualified medical condition) from the main page
            # These are NOT inside member-information div
            for span in soup.find_all('span', class_='text-muted'):
                text = span.get_text(strip=True)
                if text in ['Coverage Effective', 'Member has a qualified medical condition reported?']:
                    # The structure is: div.col-xs-12 > span + div.row > div (value)
                    # The div.row is a CHILD of the parent, not a sibling
                    parent = span.parent
                    if parent:
                        # Find the div.row that's a child of the parent
                        row_div = parent.find('div', class_='row')
                        if row_div:
                            # Get the value from the div inside the row
                            value_div = row_div.find('div')
                            if value_div:
                                value = value_div.get_text(separator=' ', strip=True).split('|')[0].strip()
                                if value and text:
                                    patient_data[text] = value

            if patient_data:
                summary_data['Patient Information'] = patient_data

            # === POLICY INFORMATION (Deductibles, Coordination, etc.) ===
            # Find Policy Information tables
            policy_tables = soup.find_all('table', {'aria-label': True})
            for table in policy_tables:
                table_name = table.get('aria-label')
                if table_name and ('Deductibles' in table_name or 'Coordination' in table_name or 'Benefits' in table_name):
                    table_data = self._extract_table_data(table)
                    if table_data:
                        summary_data[f"Policy - {table_name}"] = table_data

            # === SERVICE HISTORY ===
            # Look for service history snapshot table
            for table in soup.find_all('table'):
                # Check if table contains service history headers
                headers = [th.get_text(strip=True) for th in table.find_all('th')]
                if any('Date' in h or 'Service' in h or 'Procedure' in h for h in headers):
                    table_data = self._extract_table_data(table)
                    if table_data and len(table_data) > 0:
                        # Check if it's the service history table (not procedure list)
                        if 'Service History' not in summary_data and any('Tooth' in str(headers) or 'Surface' in str(headers) for _ in [1]):
                            summary_data['Service History Snapshot'] = table_data

            return summary_data

        except Exception as e:
            self.logger.error(f"Failed to extract benefits summary: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            return None

    def _extract_table_data(self, table):
        """Extract all data from a table (flexible structure)"""
        data = []

        # Find all rows
        rows = table.find_all('tr')

        # Check if table has headers
        headers = []
        thead = table.find('thead')
        if thead:
            header_cells = thead.find_all(['th', 'td'])
            headers = [cell.get_text(strip=True) for cell in header_cells]

        # Extract data rows
        tbody = table.find('tbody') or table
        data_rows = tbody.find_all('tr')

        for row in data_rows:
            cells = row.find_all(['td', 'th'])
            if cells:
                if headers and len(cells) == len(headers):
                    # Use headers as keys
                    row_data = {}
                    for header, cell in zip(headers, cells):
                        row_data[header] = cell.get_text(strip=True)
                    data.append(row_data)
                else:
                    # No headers or mismatch - use positional keys
                    row_data = {}
                    for i, cell in enumerate(cells):
                        row_data[f"Column_{i+1}"] = cell.get_text(strip=True)
                    data.append(row_data)

        return data if data else None

    def _find_category_sections(self, soup):
        """Helper function to extract category sections from page HTML"""
        category_sections = []
        hash_links = soup.find_all('table')
        for table in hash_links:
            table_id = table.get('id', '')
            onclick = table.get('onclick', '')

            if re.match(r'j_id_n8:j_id_n9:\d+:j_id_na', table_id) and 'jsf.ajax.request' in onclick:
                category_text = ""
                is_expanded = False
                rows = table.find_all('tr')
                for row in rows:
                    td = row.find('td')
                    if td:
                        text = td.get_text(strip=True)
                        if 'glyphicon-plus' in str(td):
                            category_text = re.sub(r'[+\-−]', '', text).strip()
                            is_expanded = False
                            break
                        elif 'glyphicon-minus' in str(td):
                            category_text = re.sub(r'[+\-−]', '', text).strip()
                            is_expanded = True
                            break

                if category_text:
                    category_sections.append({
                        'name': category_text,
                        'jsf_id': table_id,
                        'form_name': table_id.split(':')[0] if table_id else 'j_id_n8',
                        'is_expanded': is_expanded
                    })
        return category_sections

    def extract_all_categories_data(self):
        """Extract comprehensive procedure data for ALL categories"""
        try:
            self.logger.info("=== EXTRACTING ALL CATEGORIES DATA ===")

            # STEP 1: Extract benefits summary data FIRST (before expanding any categories)
            self.logger.info("STEP 1: Extracting benefits summary (Network, Patient Info, Service History, Policy Info)...")
            benefits_summary = self.extract_benefits_summary()
            if benefits_summary:
                self.logger.info(f"✓ Extracted {len(benefits_summary)} summary sections")
            else:
                self.logger.warning("⚠ Could not extract benefits summary")

            # Get current ViewState
            if not self.extract_viewstate_from_current_page():
                raise Exception("Could not extract ViewState")

            # Get the main benefits page to find all category sections
            response = self.session.get("https://www.unitedconcordia.com/tuctpi/subscriber.xhtml")
            if response.status_code != 200:
                raise Exception(f"Could not access benefits page: {response.status_code}")

            soup = BeautifulSoup(response.text, 'html.parser')

            # Find all procedure category sections using helper function
            category_sections = self._find_category_sections(soup)

            self.logger.info(f"Found {len(category_sections)} categories to process")

            # TESTING MODE: Only process first 2 categories to test benefits_summary extraction
            # Set to None to process all categories
            TEST_MODE_MAX_CATEGORIES = None

            if TEST_MODE_MAX_CATEGORIES:
                category_sections = category_sections[:TEST_MODE_MAX_CATEGORIES]
                self.logger.info(f"⚠ TEST MODE: Only processing first {TEST_MODE_MAX_CATEGORIES} categories")

            # Process each category - organize procedures by category
            procedures_by_category = {}
            total_processed = 0

            for category_index, category in enumerate(category_sections):
                self.logger.info(f"\n{'='*60}")
                self.logger.info(f"Processing category {category_index + 1}/{len(category_sections)}: '{category['name']}'")
                self.logger.info(f"{'='*60}")

                # CRITICAL: Reset view state before processing each new category (except the first)
                # This ensures we're at the benefits view, not stuck on a procedure detail page
                if category_index > 0:
                    self.logger.info(f"Resetting to benefits view before processing category '{category['name']}'")
                    self._click_back_to_benefits_view()
                    # Removed sleep - API call provides natural delay

                    # IMPORTANT: After reset, refresh the category info from the current page
                    # because JSF IDs may have changed
                    self.logger.info(f"Refreshing category list after reset")
                    response = self.session.get("https://www.unitedconcordia.com/tuctpi/subscriber.xhtml")
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        category_sections = self._find_category_sections(soup)
                        if category_index < len(category_sections):
                            category = category_sections[category_index]
                            self.logger.info(f"Updated JSF ID for '{category['name']}': {category['jsf_id']}")

                # Extract data for this category - pass the category info directly
                category_result = self.extract_single_category_data(
                    target_category_index=category_index,
                    category_info=category
                )

                if category_result and category_result.get('procedures'):
                    category_procedures = category_result['procedures']
                    # Store procedures under category name
                    procedures_by_category[category['name']] = {
                        'category_index': category_index,
                        'procedure_count': len(category_procedures),
                        'procedures': category_procedures
                    }
                    total_processed += len(category_procedures)
                    self.logger.info(f"✓ Category '{category['name']}' complete: {len(category_procedures)} procedures")
                else:
                    self.logger.warning(f"✗ No procedures found in category '{category['name']}'")
                    # Still add the category with empty procedures
                    procedures_by_category[category['name']] = {
                        'category_index': category_index,
                        'procedure_count': 0,
                        'procedures': {}
                    }

                # No sleep needed between categories - each has many API calls already

            # Create final comprehensive results
            final_results = {
                'benefits_summary': benefits_summary or {},  # Summary data from default page
                'extraction_summary': {
                    'total_categories_processed': len(category_sections),
                    'total_procedures_extracted': total_processed,
                    'categories': [cat['name'] for cat in category_sections],
                    'extraction_method': 'All categories comprehensive extraction',
                    'extraction_date': time.strftime('%Y-%m-%d %H:%M:%S')
                },
                'procedures_by_category': procedures_by_category
            }

            # Save with comprehensive filename
            filename = 'mypatientbenefitssummary.json'
            self.save_debug_json(final_results, filename)

            self.logger.info(f"\n{'='*60}")
            self.logger.info(f"✓ ALL CATEGORIES EXTRACTION COMPLETE!")
            self.logger.info(f"  Total categories: {len(category_sections)}")
            self.logger.info(f"  Total procedures: {total_processed}")
            self.logger.info(f"  Saved to: {filename}")
            self.logger.info(f"{'='*60}")

            return final_results

        except Exception as e:
            self.logger.error(f"All categories extraction failed: {e}")
            return None

    def extract_single_category_data(self, target_category_index=0, category_info=None):
        """Extract comprehensive procedure data for a single category only"""
        try:
            self.logger.info("=== EXTRACTING SINGLE CATEGORY DATA ===")

            # Use provided category_info if available (from extract_all_categories_data)
            if category_info:
                target_category = category_info
                self.logger.info(f"Using provided category info: '{target_category['name']}'")
                # Skip the page reload - use the category info directly
            else:
                # Get current ViewState
                if not self.extract_viewstate_from_current_page():
                    raise Exception("Could not extract ViewState")

                # Get the main benefits page to find all category sections
                response = self.session.get("https://www.unitedconcordia.com/tuctpi/subscriber.xhtml")
                if response.status_code != 200:
                    raise Exception(f"Could not access benefits page: {response.status_code}")

                soup = BeautifulSoup(response.text, 'html.parser')

                # Find all procedure category sections
                category_sections = []
                hash_links = soup.find_all('table')
                for table in hash_links:
                    table_id = table.get('id', '')
                    onclick = table.get('onclick', '')

                    if re.match(r'j_id_n8:j_id_n9:\d+:j_id_na', table_id) and 'jsf.ajax.request' in onclick:
                        category_text = ""
                        is_expanded = False
                        rows = table.find_all('tr')
                        for row in rows:
                            td = row.find('td')
                            if td:
                                text = td.get_text(strip=True)
                                if 'glyphicon-plus' in str(td):
                                    category_text = re.sub(r'[+\-−]', '', text).strip()
                                    is_expanded = False
                                    break
                                elif 'glyphicon-minus' in str(td):
                                    category_text = re.sub(r'[+\-−]', '', text).strip()
                                    is_expanded = True
                                    break

                        if category_text:
                            category_sections.append({
                                'name': category_text,
                                'jsf_id': table_id,
                                'form_name': table_id.split(':')[0] if table_id else 'j_id_n8',
                                'is_expanded': is_expanded
                            })

                if target_category_index >= len(category_sections):
                    raise Exception(f"Target category index {target_category_index} out of range. Found {len(category_sections)} categories")

                # Get the target category
                target_category = category_sections[target_category_index]

            self.logger.info(f"Processing ONLY category {target_category_index + 1}: '{target_category['name']}'")

            # ALWAYS expand target category via API to get fresh data (even if appears expanded)
            self.logger.info(f"Expanding category via API: {target_category['name']}")
            payload = {
                f"{target_category['form_name']}_SUBMIT": "1",
                "javax.faces.ViewState": self.current_viewstate,
                "javax.faces.behavior.event": "click",
                "javax.faces.partial.event": "click",
                "javax.faces.source": target_category['jsf_id'],
                "javax.faces.partial.ajax": "true",
                "javax.faces.partial.execute": target_category['jsf_id'],
                "javax.faces.partial.render": "errorContainer printSelectionForm printSelectionChooserModalFooter servicesGroup benefitsDetailsSearch:hiddenTriggerForLoadingAllowances",
                target_category['form_name']: target_category['form_name']
            }

            api_response = self.session.post(
                "https://www.unitedconcordia.com/tuctpi/subscriber.xhtml",
                data=payload,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Faces-Request': 'partial/ajax'
                }
            )

            if api_response.status_code != 200:
                raise Exception(f"Failed to expand target category: {api_response.status_code}")

            self.logger.info(f"✓ Category expanded successfully via API")

            # Update ViewState from API response
            viewstate_match = re.search(r'<update id="j_id__v_0:javax\.faces\.ViewState:\d+"><!\[CDATA\[(.*?)\]\]></update>', api_response.text, re.DOTALL)
            if viewstate_match:
                self.current_viewstate = viewstate_match.group(1).strip()
                self.logger.info(f"  Updated ViewState after expansion")

            # Debug files disabled per user request - not needed anymore

            # Parse procedures DYNAMICALLY from API response
            basic_procedures = self._parse_category_procedures(api_response.text, target_category['name'])

            if not basic_procedures:
                raise Exception(f"No procedures found in category '{target_category['name']}'")

            self.logger.info(f"Found {len(basic_procedures)} procedures in target category")

            # Get detailed information for ALL procedures in the target category using index-based navigation
            comprehensive_procedures = {}
            processed_count = 0

            # Convert to list to get indexed access
            procedures_list = list(basic_procedures.items())

            for index, (proc_code, proc_data) in enumerate(procedures_list):
                self.logger.info(f"Getting detailed info for {proc_code} (index {index}): {proc_data.get('procedure_name', 'N/A')}")

                # CRITICAL: Click "Back to Benefits View" before navigating to next procedure
                # This resets JSF state and prevents getting stuck on first procedure
                if index > 0:
                    self.logger.info(f"  Clicking 'Back to Benefits View' to reset state before navigating to {proc_code}")
                    self._click_back_to_benefits_view()
                    # Removed unnecessary sleep - the API call itself takes time

                # Use index-based JSF ID from HAR analysis
                index_based_jsf_id = f"j_id_n8:j_id_n9:{target_category_index}:j_id_ni:{index}:j_id_nm"
                self.logger.info(f"  Using index-based JSF ID: {index_based_jsf_id}")

                # Get detailed information using correct index-based navigation
                detailed_info = self.get_comprehensive_procedure_detail(proc_code, index_based_jsf_id)

                if detailed_info:
                    # CRITICAL: Verify the returned data matches the requested procedure
                    verified_code = detailed_info.get('verified_procedure_code')

                    if verified_code and verified_code != proc_code:
                        self.logger.error(f"  ✗ DATA MISMATCH: Requested {proc_code} but got {verified_code} - DISCARDING detailed data")
                        # Store only procedure code and name for failed cases
                        unique_key = f"{proc_code}_{proc_data.get('procedure_name', 'Unknown').replace(' ', '_')}"
                        comprehensive_procedures[unique_key] = {
                            'procedure_code': proc_code,
                            'procedure_name': proc_data.get('procedure_name', 'Unknown')
                        }
                        self.logger.warning(f"  Using basic data only for {proc_code} due to mismatch")
                    else:
                        # Only store procedure code, name, and detailed data (no basic/JSF fields)
                        comprehensive_data = {
                            'procedure_code': proc_code,
                            'procedure_name': proc_data.get('procedure_name', 'Unknown'),
                            **detailed_info  # Detailed data from individual procedure call
                        }

                        # Remove JSF-related and unnecessary fields
                        fields_to_remove = ['verified_procedure_code', 'basic_allowance', 'basic_coverage',
                                          'detail_jsf_id', 'jsf_components']
                        for field in fields_to_remove:
                            comprehensive_data.pop(field, None)

                        unique_key = f"{proc_code}_{proc_data.get('procedure_name', 'Unknown').replace(' ', '_')}"
                        comprehensive_procedures[unique_key] = comprehensive_data
                        processed_count += 1

                        self.logger.info(f"  ✓ Got comprehensive data for {proc_code}")
                else:
                    # Store only procedure code and name for failed cases
                    unique_key = f"{proc_code}_{proc_data.get('procedure_name', 'Unknown').replace(' ', '_')}"
                    comprehensive_procedures[unique_key] = {
                        'procedure_code': proc_code,
                        'procedure_name': proc_data.get('procedure_name', 'Unknown')
                    }
                    self.logger.warning(f"  ✗ Failed to get detailed data for {proc_code}, keeping basic data")

                # No sleep needed - each API call already has natural delay

            # Create final comprehensive results
            final_results = {
                'extraction_summary': {
                    'target_category': target_category['name'],
                    'target_category_index': target_category_index,
                    'total_procedures_in_category': len(basic_procedures),
                    'procedures_with_detailed_data': processed_count,
                    'extraction_method': f'Single category focus: {target_category["name"]}',
                    'extraction_date': time.strftime('%Y-%m-%d %H:%M:%S')
                },
                'procedures': comprehensive_procedures
            }

            # Don't save individual category files - only save the final combined file

            self.logger.info(f"✓ Single category extraction complete for '{target_category['name']}'!")
            self.logger.info(f"  Total procedures in category: {len(comprehensive_procedures)}")
            self.logger.info(f"  With detailed data: {processed_count}")

            return final_results

        except Exception as e:
            self.logger.error(f"Single category extraction failed: {e}")
            return None

    def parse_procedure_detail_from_full_page(self, html_content, procedure_code):
        """Parse procedure details from the full benefits page"""
        try:
            self.logger.info(f"    Parsing procedure details from full page for {procedure_code}")

            soup = BeautifulSoup(html_content, 'html.parser')

            detailed_data = {
                'procedure_details': {},
                'cost_share': '',
                'related_procedures': [],
                'service_history': [],
                'policy_details': [],
                'procedure_dictionary': {},
                'jsf_components': {}
            }

            # Find the procedure panel
            procedure_panel = soup.find('div', {'id': 'benefitProcedurePanel'})
            if not procedure_panel:
                self.logger.warning(f"    No procedure panel found for {procedure_code}")
                return detailed_data

            # Verify this is the correct procedure
            procedure_header = procedure_panel.find('h2', class_='h4')
            if procedure_header and procedure_code in procedure_header.get_text():
                self.logger.info(f"    ✓ Confirmed procedure panel shows {procedure_code}")
            else:
                self.logger.warning(f"    ✗ Procedure panel may not be showing {procedure_code}")

            # Extract procedure details table
            self._extract_procedure_details_table(procedure_panel, detailed_data)

            # Extract cost share information
            self._extract_cost_share_info(procedure_panel, detailed_data)

            # Extract service history
            self._extract_service_history(procedure_panel, detailed_data)

            # Extract policy details
            self._extract_policy_details(procedure_panel, detailed_data)

            # Extract procedure dictionary
            self._extract_procedure_dictionary(procedure_panel, detailed_data)

            # Extract related procedures and look for "More..." button
            self._extract_related_procedures_with_more_button(procedure_panel, detailed_data, procedure_code)

            self.logger.info(f"    Parsed {len(detailed_data['related_procedures'])} related procedures, {len(detailed_data['service_history'])} service history entries")

            return detailed_data

        except Exception as e:
            self.logger.error(f"Failed to parse procedure details for {procedure_code}: {e}")
            return {}

    def get_comprehensive_procedure_detail(self, procedure_code, jsf_id, max_retries=3):
        """Get ALL detailed information for a specific procedure with verification"""
        try:
            self.logger.info(f"    Requesting detailed info for {procedure_code} with JSF ID: {jsf_id}")

            form_name = jsf_id.split(':')[0]

            # Step 1: Get basic procedure detail with retry logic
            for attempt in range(max_retries):
                payload = {
                    f"{form_name}_SUBMIT": "1",
                    "javax.faces.ViewState": self.current_viewstate,
                    "javax.faces.behavior.event": "action",
                    "javax.faces.partial.event": "click",
                    "javax.faces.source": jsf_id,
                    "javax.faces.partial.ajax": "true",
                    "javax.faces.partial.execute": jsf_id,
                    "javax.faces.partial.render": "ben-summary-2",
                    form_name: form_name
                }

                self.logger.info(f"    Making POST request for {procedure_code} (attempt {attempt + 1}/{max_retries})")
                response = self.session.post("https://www.unitedconcordia.com/tuctpi/subscriber.xhtml", data=payload)

                if response.status_code != 200:
                    self.logger.error(f"Failed to get procedure detail: {response.status_code}")
                    return None

                # Save debug file for individual procedure responses to troubleshoot duplicate data
                # self.save_debug_html(response.text, f"detail_{procedure_code}_attempt{attempt + 1}_response.xml")

                # Update ViewState
                viewstate_match = re.search(r'<update id="j_id__v_0:javax\.faces\.ViewState:\d+"><!\[CDATA\[(.*?)\]\]></update>', response.text, re.DOTALL)
                if viewstate_match:
                    self.current_viewstate = viewstate_match.group(1).strip()
                    self.logger.info(f"    Updated ViewState for {procedure_code}")
                else:
                    self.logger.warning(f"    No ViewState update found for {procedure_code}")

                # CRITICAL: Verify we got the correct procedure in the response
                returned_proc_code = self._extract_procedure_code_from_response(response.text)

                if returned_proc_code == procedure_code:
                    self.logger.info(f"    ✓ Verified: Response contains correct procedure {procedure_code}")
                    break
                else:
                    self.logger.warning(f"    ✗ Mismatch: Expected {procedure_code}, got {returned_proc_code} (attempt {attempt + 1})")
                    if attempt < max_retries - 1:
                        self.logger.info(f"    Retrying with longer delay...")
                        time.sleep(3)  # Longer delay before retry
                    else:
                        self.logger.error(f"    Failed to get correct procedure after {max_retries} attempts")
                        return None

            # Parse the detailed information
            detailed_data = self.parse_comprehensive_procedure_response(response.text, procedure_code)

            # Add the verified procedure code to the data
            detailed_data['verified_procedure_code'] = returned_proc_code

            # Step 2: Expand "More..." button for related procedures if it exists
            more_button_jsf_id = detailed_data.get('jsf_components', {}).get('more_button')
            if more_button_jsf_id:
                self.logger.info(f"  Expanding 'More...' button for {procedure_code}")
                expanded_related = self.expand_more_related_procedures(more_button_jsf_id, procedure_code)

                if expanded_related:
                    detailed_data['related_procedures'] = expanded_related

            return detailed_data

        except Exception as e:
            self.logger.error(f"Failed to get comprehensive procedure detail: {e}")
            return None

    def _extract_procedure_code_from_response(self, xml_content):
        """Extract the actual procedure code from the response to verify correct navigation"""
        try:
            # Look for the procedure header like: <h2 class="h4">D0120: Periodic Evaluation</h2>
            cdata_match = re.search(r'<!\[CDATA\[(.*?)\]\]>', xml_content, re.DOTALL)
            if cdata_match:
                html_content = cdata_match.group(1)
                # Extract procedure code from header
                header_match = re.search(r'<h2[^>]*>(D\d{4}):', html_content)
                if header_match:
                    return header_match.group(1)
            return None
        except Exception as e:
            self.logger.error(f"Failed to extract procedure code from response: {e}")
            return None

    def _click_back_to_benefits_view(self):
        """Click 'Back to Benefits View' button to reset JSF state between procedure navigations"""
        try:
            # Based on HAR analysis: j_id_oo:j_id_op is the "Back to Benefits View" button
            payload = {
                "j_id_oo_SUBMIT": "1",
                "javax.faces.ViewState": self.current_viewstate,
                "javax.faces.behavior.event": "action",
                "javax.faces.partial.event": "click",
                "javax.faces.source": "j_id_oo:j_id_op",
                "javax.faces.partial.ajax": "true",
                "javax.faces.partial.execute": "j_id_oo:j_id_op",
                "javax.faces.partial.render": "ben-summary-2",
                "j_id_oo": "j_id_oo"
            }

            response = self.session.post(
                "https://www.unitedconcordia.com/tuctpi/subscriber.xhtml",
                data=payload,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Faces-Request': 'partial/ajax'
                }
            )

            if response.status_code == 200:
                # Update ViewState
                viewstate_match = re.search(r'<update id="j_id__v_0:javax\.faces\.ViewState:\d+"><!\[CDATA\[(.*?)\]\]></update>', response.text, re.DOTALL)
                if viewstate_match:
                    self.current_viewstate = viewstate_match.group(1).strip()
                    self.logger.info(f"    ✓ Successfully clicked 'Back to Benefits View' and updated ViewState")
                    return True
                else:
                    self.logger.warning(f"    Back navigation succeeded but ViewState not updated")
                    return True
            else:
                self.logger.error(f"    Failed to click 'Back to Benefits View': {response.status_code}")
                return False

        except Exception as e:
            self.logger.error(f"Failed to click back button: {e}")
            return False

    def parse_comprehensive_procedure_response(self, xml_content, procedure_code):
        """Parse ALL sections from the procedure detail response"""
        try:
            self.logger.info(f"    Parsing response for {procedure_code}")

            # Extract CDATA content
            cdata_match = re.search(r'<!\[CDATA\[(.*?)\]\]>', xml_content, re.DOTALL)
            if not cdata_match:
                self.logger.warning(f"    No CDATA found in response for {procedure_code}")
                return {}

            html_content = cdata_match.group(1)
            soup = BeautifulSoup(html_content, 'html.parser')

            self.logger.info(f"    Parsing HTML content for {procedure_code}, length: {len(html_content)}")
            
            detailed_data = {
                'procedure_details': {},
                'cost_share': '',
                'related_procedures': [],
                'service_history': [],
                'policy_details': [],
                'procedure_dictionary': {},
                'jsf_components': {}
            }
            
            # 1. Extract Procedure Details Table
            self._parse_procedure_details_table(soup, detailed_data)
            
            # 2. Extract Cost Share
            self._parse_cost_share_table(soup, detailed_data)
            
            # 3. Extract Related Procedures (with JSF IDs)
            self._parse_related_procedures(soup, detailed_data)
            
            # 4. Extract Service History
            self._parse_service_history(soup, detailed_data)
            
            # 5. Extract Additional Policy Details
            self._parse_policy_details(soup, detailed_data)
            
            # 6. Extract Procedure Dictionary
            self._parse_procedure_dictionary(soup, detailed_data)
            
            # 7. Extract JSF Component IDs (for navigation)
            self._parse_jsf_components(soup, detailed_data)
            
            return detailed_data
            
        except Exception as e:
            self.logger.error(f"Failed to parse comprehensive procedure response: {e}")
            return {}

    def _parse_procedure_details_table(self, soup, detailed_data):
        """Parse the main procedure details table"""
        try:
            table = soup.find('table', {'id': 'procedureDetailInfoTable1'})
            if table:
                tbody = table.find('tbody')
                if tbody:
                    row = tbody.find('tr')
                    if row:
                        cells = row.find_all('td')
                        if len(cells) >= 6:
                            detailed_data['procedure_details'] = {
                                'covered': cells[0].get_text(strip=True),
                                'allowance': cells[1].get_text(separator=' ', strip=True).replace('\n', ' '),
                                'coverage': cells[2].get_text(separator=' ', strip=True).replace('\n', ' '),
                                'limitations': cells[3].get_text(strip=True),
                                'applies_to_deductible': cells[4].get_text(strip=True),
                                'applies_to_maximum': cells[5].get_text(strip=True)
                            }
        except Exception as e:
            self.logger.error(f"Failed to parse procedure details table: {e}")

    def _parse_cost_share_table(self, soup, detailed_data):
        """Parse the cost share table"""
        try:
            table = soup.find('table', {'id': 'procedureDetailInfoTable2'})
            if table:
                tbody = table.find('tbody')
                if tbody:
                    cell = tbody.find('td')
                    if cell:
                        detailed_data['cost_share'] = cell.get_text(separator=' ', strip=True).replace('\n', ' ')
        except Exception as e:
            self.logger.error(f"Failed to parse cost share table: {e}")

    def _parse_related_procedures(self, soup, detailed_data):
        """Parse related procedures (text only, no JSF IDs)"""
        try:
            related_section = soup.find('div', {'id': 'proc-related-procedures'})
            if related_section:
                procedure_links = related_section.find_all('a', href='#')
                for link in procedure_links:
                    text = link.get_text(strip=True)

                    # Check if it's a procedure link (starts with D followed by 4 digits)
                    if re.match(r'D\d{4}', text):
                        detailed_data['related_procedures'].append(
                            text.replace('>', '').strip()
                        )
                
                # Look for "More..." button (check for nested text containing "More...")
                more_buttons = related_section.find_all('a')
                more_button = None
                for btn in more_buttons:
                    btn_text = btn.get_text(strip=True)
                    if 'more' in btn_text.lower() and '...' in btn_text:
                        more_button = btn
                        break

                if more_button and more_button.get('onclick'):
                    jsf_id_match = re.search(r"getElementById\('([^']+)'\)", more_button.get('onclick'))
                    if jsf_id_match:
                        detailed_data['jsf_components']['more_button'] = jsf_id_match.group(1)
                        self.logger.info(f"    Found 'More...' button with JSF ID: {jsf_id_match.group(1)}")
                else:
                    # Debug: Show all links in the related section
                    all_links = related_section.find_all('a')
                    self.logger.debug(f"    No 'More...' button found. Available links: {[link.get_text(strip=True) for link in all_links]}")
        except Exception as e:
            self.logger.error(f"Failed to parse related procedures: {e}")

    def _parse_service_history(self, soup, detailed_data):
        """Parse procedure service history"""
        try:
            history_table = soup.find('table', {'id': 'procedureServiceHistoryPanelList'})
            if history_table:
                tbody = history_table.find('tbody')
                if tbody:
                    rows = tbody.find_all('tr')
                    for row in rows:
                        cells = row.find_all('td')
                        if len(cells) >= 4:
                            detailed_data['service_history'].append({
                                'date_of_service': cells[0].get_text(strip=True),
                                'procedure': cells[1].get_text(strip=True),
                                'tooth': cells[2].get_text(strip=True),
                                'surface': cells[3].get_text(strip=True)
                            })
        except Exception as e:
            self.logger.error(f"Failed to parse service history: {e}")

    def _parse_policy_details(self, soup, detailed_data):
        """Parse additional policy details"""
        try:
            policy_section = soup.find('div', {'id': 'policyDetails'})
            if policy_section:
                table = policy_section.find('table')
                if table:
                    tbody = table.find('tbody')
                    if tbody:
                        rows = tbody.find_all('tr')
                        for row in rows:
                            cells = row.find_all('td')
                            if len(cells) >= 2:
                                detailed_data['policy_details'].append({
                                    'policy_type': cells[0].get_text(strip=True),
                                    'description': cells[1].get_text(strip=True)
                                })
        except Exception as e:
            self.logger.error(f"Failed to parse policy details: {e}")

    def _parse_procedure_dictionary(self, soup, detailed_data):
        """Parse procedure dictionary"""
        try:
            dictionary_section = soup.find('div', {'id': 'proc-dictionary'})
            if dictionary_section:
                table = dictionary_section.find('table')
                if table:
                    rows = table.find_all('tr')
                    for row in rows:
                        cells = row.find_all('td')
                        if len(cells) >= 2:
                            key = cells[0].get_text(strip=True)
                            
                            # Get value from span if it exists, otherwise from cell
                            value_span = cells[1].find('span')
                            value = value_span.get_text(strip=True) if value_span else cells[1].get_text(strip=True)
                            
                            if key and value:
                                detailed_data['procedure_dictionary'][key] = value
        except Exception as e:
            self.logger.error(f"Failed to parse procedure dictionary: {e}")

    def _parse_jsf_components(self, soup, detailed_data):
        """Parse JSF component IDs for navigation"""
        try:
            # Find "Back to Benefits View" button
            back_button = soup.find('a', string=re.compile('Back to Benefits'))
            if back_button and back_button.get('onclick'):
                jsf_id_match = re.search(r"getElementById\('([^']+)'\)", back_button.get('onclick'))
                if jsf_id_match:
                    detailed_data['jsf_components']['back_button'] = jsf_id_match.group(1)
        except Exception as e:
            self.logger.error(f"Failed to parse JSF components: {e}")

    def expand_more_related_procedures(self, more_jsf_id, procedure_code):
        """Expand the 'More...' button to get all related procedures"""
        try:
            self.logger.info(f"    Expanding More button for {procedure_code}")

            form_name = more_jsf_id.split(':')[0]
            payload = {
                f"{form_name}_SUBMIT": "1",
                "javax.faces.ViewState": self.current_viewstate,
                "javax.faces.behavior.event": "action",
                "javax.faces.partial.event": "click",
                "javax.faces.source": more_jsf_id,
                "javax.faces.partial.ajax": "true",
                "javax.faces.partial.execute": more_jsf_id,
                "javax.faces.partial.render": "proc-related-procedures",
                form_name: form_name
            }

            response = self.session.post(
                "https://www.unitedconcordia.com/tuctpi/subscriber.xhtml",
                data=payload,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Faces-Request': 'partial/ajax'
                }
            )
            
            if response.status_code == 200:
                # Update ViewState
                viewstate_match = re.search(r'<update id="j_id__v_0:javax\.faces\.ViewState:\d+"><!\[CDATA\[(.*?)\]\]></update>', response.text, re.DOTALL)
                if viewstate_match:
                    self.current_viewstate = viewstate_match.group(1).strip()
                
                # Parse expanded related procedures
                cdata_match = re.search(r'<!\[CDATA\[(.*?)\]\]>', response.text, re.DOTALL)
                if cdata_match:
                    html_content = cdata_match.group(1)
                    soup = BeautifulSoup(html_content, 'html.parser')
                    
                    expanded_procedures = []
                    procedure_links = soup.find_all('a', href='#')
                    for link in procedure_links:
                        text = link.get_text(strip=True)

                        # Check if it's a procedure link (starts with D followed by 4 digits)
                        if re.match(r'D\d{4}', text):
                            expanded_procedures.append(
                                text.replace('>', '').strip()
                            )
                    
                    # Process expanded related procedures without saving debug files
                    self.logger.info(f"    Found {len(expanded_procedures)} expanded related procedures")
                    return expanded_procedures
            
            return []
            
        except Exception as e:
            self.logger.error(f"Failed to expand more related procedures: {e}")
            return []
    
if __name__ == "__main__":
    scraper = UnitedConcordiaPortalScraper()

    try:
        username = "BPKPortalAccess4771"
        password = "SmileyTooth4771!"

        scraper.authenticate(username, password)

        if scraper.navigate_to_benefits_portal():
            print("Successfully navigated to benefits portal!")

            member_id = "00964917"
            dob = "02/17/2010"

            if scraper.search_patient(member_id, dob):
                print("Patient found! Starting comprehensive extraction...")

                print("\n" + "="*60)
                print("COMPREHENSIVE PROCEDURE DATA EXTRACTION - ALL CATEGORIES")
                print("="*60)

                # Extract comprehensive data for ALL categories
                results = scraper.extract_all_categories_data()
                
                if results:
                    procedures = results.get('procedures', {})
                    summary = results.get('extraction_summary', {})
                    
                    print(f"\n✓ SUCCESS! Comprehensive extraction complete!")
                    print(f"Target Category: {summary.get('target_category', 'N/A')}")
                    print(f"Category Index: {summary.get('target_category_index', 0)}")
                    print(f"Total procedures in this category: {summary.get('total_procedures_in_category', 0)}")
                    print(f"Procedures with detailed data: {summary.get('procedures_with_detailed_data', 0)}")

                    # Show detailed examples for ALL procedures in the category
                    print(f"\n--- ALL PROCEDURES IN CATEGORY '{summary.get('target_category', 'N/A')}' ---")
                    for i, (proc_code, proc_data) in enumerate(procedures.items(), 1):
                        print(f"\n=== Procedure {i}/{len(procedures)} ===")
                        print(f"\n{proc_code}: {proc_data.get('procedure_name', 'N/A')}")
                        print(f"Category: {proc_data.get('category', 'N/A')}")
                        
                        # Basic data
                        print(f"Allowance: {proc_data.get('allowance', 'N/A')}")
                        print(f"Coverage: {proc_data.get('coverage', 'N/A')}")
                        
                        # Detailed data
                        proc_details = proc_data.get('procedure_details', {})
                        if proc_details:
                            print(f"Detailed Allowance: {proc_details.get('allowance', 'N/A')}")
                        
                        print(f"Cost Share: {proc_data.get('cost_share', 'N/A')}")
                        
                        # Related procedures
                        related = proc_data.get('related_procedures', [])
                        print(f"Related Procedures: {len(related)} found")
                        
                        # Service history
                        history = proc_data.get('service_history', [])
                        print(f"Service History: {len(history)} entries")
                        
                        # Policy details
                        policy = proc_data.get('policy_details', [])
                        print(f"Policy Details: {len(policy)} entries")
                        
                        # Procedure dictionary
                        dictionary = proc_data.get('procedure_dictionary', {})
                        print(f"Dictionary Entries: {len(dictionary)} items")
                        
                        if dictionary:
                            print("  Sample dictionary entries:")
                            for key, value in list(dictionary.items())[:3]:
                                print(f"    {key}: {value}")
                    
                    category_name = summary.get('target_category', 'Unknown').replace(' ', '_')
                    print(f"\n📄 Complete patient benefits summary saved to: mypatientbenefitssummary.json")
                    
                else:
                    print("✗ Comprehensive extraction failed")
                    
            else:
                print("Patient search failed.")
        else:
            print("Failed to navigate to benefits portal")
            
    except Exception as e:
        print(f"Scraping failed: {e}")
        import traceback
        traceback.print_exc()