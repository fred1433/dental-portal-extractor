import asyncio
import threading
import tkinter as tk
from tkinter import ttk, messagebox, filedialog, scrolledtext
from playwright.async_api import async_playwright
import re
import traceback
import os
import json
from datetime import datetime
import httpx


class GuardianAutomationApp:
    def __init__(self, root):
        self.root = root
        root.title("Guardian Eligibility Data Collector")

        # ---- Credentials + MFA ----
        ttk.Label(root, text="Guardian Username:").grid(row=0, column=0, sticky="w")
        self.uname_var = tk.StringVar()
        ttk.Entry(root, textvariable=self.uname_var).grid(row=0, column=1, sticky="ew")

        ttk.Label(root, text="Guardian Password:").grid(row=1, column=0, sticky="w")
        self.pwd_var = tk.StringVar()
        ttk.Entry(root, textvariable=self.pwd_var, show="*").grid(row=1, column=1, sticky="ew")

        ttk.Label(root, text="MFA Method:").grid(row=2, column=0, sticky="w")
        self.mfa_var = tk.StringVar(value="Email")
        ttk.Combobox(root, textvariable=self.mfa_var, values=["Email", "Text/Voice"], state="readonly").grid(row=2, column=1, sticky="ew")

        self.start_btn = ttk.Button(root, text="Start Login (Headless)", command=self.start)
        self.start_btn.grid(row=3, column=0, columnspan=2, pady=10, sticky="ew")

        self.status = tk.Text(root, width=72, height=12)
        self.status.grid(row=4, column=0, columnspan=2, pady=8, sticky="nsew")

        ttk.Label(root, text="Enter OTP:").grid(row=5, column=0, sticky="w")
        self.otp_var = tk.StringVar()
        self.otp_entry = ttk.Entry(root, textvariable=self.otp_var)
        self.otp_entry.grid(row=5, column=1, sticky="ew")
        self.otp_entry.config(state="disabled")

        self.otp_btn = ttk.Button(root, text="Submit OTP", command=self.enter_otp)
        self.otp_btn.grid(row=6, column=0, columnspan=2, sticky="ew")
        self.otp_btn.config(state="disabled")

        # ---- Search mode ----
        ttk.Label(root, text="Search by:").grid(row=7, column=0, sticky="w")
        self.search_mode_var = tk.StringVar(value="Patient info")
        self.search_mode_combo = ttk.Combobox(
            root, textvariable=self.search_mode_var, values=["Patient info", "Member ID"], state="readonly"
        )
        self.search_mode_combo.grid(row=7, column=1, sticky="ew")

        # ---- Patient info frame ----
        self.frame_patient = ttk.Frame(root)
        self.frame_patient.grid(row=8, column=0, columnspan=2, sticky="ew", pady=(4, 0))

        ttk.Label(self.frame_patient, text="Patient Last Name:").grid(row=0, column=0, sticky="w")
        self.patient_last_var = tk.StringVar()
        ttk.Entry(self.frame_patient, textvariable=self.patient_last_var).grid(row=0, column=1, sticky="ew")

        ttk.Label(self.frame_patient, text="Patient DOB (MM/DD/YYYY):").grid(row=1, column=0, sticky="w")
        self.patient_dob_var = tk.StringVar()
        ttk.Entry(self.frame_patient, textvariable=self.patient_dob_var).grid(row=1, column=1, sticky="ew")

        ttk.Label(self.frame_patient, text="Relationship:").grid(row=2, column=0, sticky="w")
        self.patient_rel_var = tk.StringVar(value="Self")
        ttk.Combobox(self.frame_patient, textvariable=self.patient_rel_var,
                     values=["Self", "Son", "Daughter", "Spouse"], state="readonly").grid(row=2, column=1, sticky="ew")

        # ---- Member ID frame (no group/division inputs) ----
        self.frame_member = ttk.Frame(root)
        self.frame_member.grid(row=8, column=0, columnspan=2, sticky="ew", pady=(4, 0))

        ttk.Label(self.frame_member, text="Member ID (token):").grid(row=0, column=0, sticky="w")
        self.member_id_var = tk.StringVar()
        ttk.Entry(self.frame_member, textvariable=self.member_id_var).grid(row=0, column=1, sticky="ew")

        ttk.Label(self.frame_member, text="Full Name (First Last):").grid(row=1, column=0, sticky="w")
        self.full_name_var = tk.StringVar()
        ttk.Entry(self.frame_member, textvariable=self.full_name_var).grid(row=1, column=1, sticky="ew")

        self.frame_member.grid_remove()

        def on_mode_change(_evt=None):
            if self.search_mode_var.get() == "Patient info":
                self.frame_member.grid_remove()
                self.frame_patient.grid()
            else:
                self.frame_patient.grid_remove()
                self.frame_member.grid()
        self.search_mode_combo.bind("<<ComboboxSelected>>", on_mode_change)

        # ---- Actions / Results ----
        self.eligibility_btn = ttk.Button(root, text="Run Eligibility Extraction", command=self.eligibility_search)
        self.eligibility_btn.grid(row=9, column=0, columnspan=2, pady=10, sticky="ew")
        self.eligibility_btn.config(state="disabled")

        self.view_btn = ttk.Button(root, text="View Eligibility JSON", command=self.view_json)
        self.view_btn.grid(row=10, column=0, sticky="ew")
        self.view_btn.grid_remove()

        self.download_btn = ttk.Button(root, text="Download JSON", command=self.download_json)
        self.download_btn.grid(row=10, column=1, sticky="ew")
        self.download_btn.grid_remove()

        # layout weights
        root.grid_columnconfigure(1, weight=1)
        root.grid_rowconfigure(4, weight=1)
        self.frame_patient.columnconfigure(1, weight=1)
        self.frame_member.columnconfigure(1, weight=1)

        # runtime
        self.loop = asyncio.new_event_loop()
        self.pw_manager = None
        self.browser = None
        self.context = None
        self.page = None
        self.eligibility_json = None
        self.eligibility_responses = []
        self.auth_state_path = os.path.join(os.path.expanduser("~"), ".guardian_auth_state.json")

    # ================== utils ==================
    def log(self, msg):
        self.status.insert(tk.END, msg + "\n")
        self.status.see(tk.END)
        self.status.update()

    async def _cookie_header(self) -> str:
        cookies = await self.context.cookies("https://www.guardiananytime.com")
        return "; ".join(f"{c['name']}={c['value']}" for c in cookies)

    def _digits(self, s: str) -> str:
        return re.sub(r"[^0-9]", "", s or "")

    def _norm_name(self, s: str) -> str:
        s = (s or "").upper().strip()
        s = re.sub(r"[^A-Z ]+", "", s)
        s = re.sub(r"\s+", " ", s)
        return s

    def _rel_code(self, rel_str: str) -> str:
        m = {"self": "Self", "son": "S", "daughter": "D", "spouse": "SP"}
        return m.get((rel_str or "").strip().lower(), rel_str or "Self")

    # ---- pickers ----
    def _pick_member_by_dob(self, rows, dob: str):
        want = self._digits(dob)
        for block in rows or []:
            for member in block.get("member_dependent", []) or []:
                if self._digits(member.get("date_of_birth", "")) == want:
                    self.log(f"✓ Found member: {member.get('first_name')} {member.get('last_name')} DOB: {member.get('date_of_birth')}")
                    return member
        for r in rows or []:
            if self._digits(r.get("date_of_birth", "")) == want:
                return r
        return None

    def _iter_member_search_candidates(self, ms_json: dict):
        if not isinstance(ms_json, dict):
            return
        for b in ms_json.get("multiple_patient_search_res") or []:
            for m in b.get("member_dependent", []) or []:
                yield m
        for m in ms_json.get("member_dependent", []) or []:
            yield m
        if {"first_name", "last_name"} & set(ms_json.keys()):
            yield ms_json

    def _pick_member_by_full_name(self, ms_json: dict, full_name: str):
        want = self._norm_name(full_name)
        best = None
        count = 0
        for c in self._iter_member_search_candidates(ms_json):
            count += 1
            fn = self._norm_name(c.get("first_name") or c.get("patient_first_name") or "")
            ln = self._norm_name(c.get("last_name")  or c.get("patient_last_name")  or "")
            name = (fn + " " + ln).strip()
            if name == want:
                self.log(f"✓ Exact match: {c.get('first_name')} {c.get('last_name')}")
                return c
            if not best and fn and ln:
                best = c
        self.log(f"DEBUG: candidates seen = {count}")
        if best:
            self.log(f"✓ Using best available: {best.get('first_name')} {best.get('last_name')}")
        return best

    # ---- group/identifier helpers ----
    def _extract_group_from_rows(self, rows):
        # scan block-level and dependent-level for any plausible group key
        keys = ("group_policy_number", "plan_group_number", "group_id")
        for block in rows or []:
            for k in keys:
                v = block.get(k)
                if v: return v
            for m in block.get("member_dependent", []) or []:
                for k in keys:
                    v = m.get(k)
                    if v: return v
        return None

    def _pool_fields_from_rows(self, rows):
        pool = []
        for block in rows or []:
            for m in block.get("member_dependent", []) or []:
                pool.append(m)
        return pool

    def _backfill_member_fields(self, member: dict, rows):
        needed = {
            "group_policy_number": None,
            "identifier": None,
            "first_name": None,
            "last_name": None,
            "relationship": None,
            "date_of_birth": None,
        }
        pool = self._pool_fields_from_rows(rows)
        ident = member.get("identifier") or member.get("member_id") or member.get("subscriber_id") or ""

        for k in list(needed.keys()):
            if member.get(k):
                continue
            match = None
            if ident:
                for c in pool:
                    if (c.get("identifier") == ident) or (c.get("member_id") == ident) or (c.get("subscriber_id") == ident):
                        match = c; break
            if not match:
                for c in pool:
                    if (c.get("first_name") == member.get("first_name") and
                        c.get("last_name")  == member.get("last_name")):
                        match = c; break
            if match and match.get(k):
                member[k] = match.get(k)

        # final try: pull group from any sibling if still missing
        if not member.get("group_policy_number"):
            g = self._extract_group_from_rows(rows)
            if g: member["group_policy_number"] = g

    def _extract_identifier_from_rows_or_member(self, rows, member):
        ident = member.get("identifier") or member.get("member_id") or member.get("subscriber_id")
        if ident:
            return ident
        # try block-level input_identifier from the same response
        for block in rows or []:
            if block.get("input_identifier"):
                return block["input_identifier"]
        return None

    async def _enrich_group_by_identifier(self, client: httpx.AsyncClient, identifier: str):
        """
        Try to re-query by identifier to fetch a record that includes group number.
        """
        tries = [
            ("/gaprovider/api/multiple-patient/search", [{"identifier": identifier}]),
            ("/gaprovider/api/multiple-patient/search", [{"input_identifier": identifier}]),
        ]
        for path, payload in tries:
            self.log(f"ℹ️ Re-query for group via {path} using identifier")
            r = await client.post(path, json=payload)
            if r.status_code < 400:
                try:
                    j = r.json()
                except Exception:
                    continue
                rows = j.get("multiple_patient_search_res") or []
                g = self._extract_group_from_rows(rows)
                if g:
                    return g, j
        return None, None

    # ---- PPO payload ----
    def _ppo_from_member_generic(self, member: dict, dob: str) -> dict:
        payload = {
            "group_policy_number": member.get("group_policy_number")
                                   or member.get("plan_group_number")
                                   or member.get("group_id")
                                   or "",
            "patient_relation_to_member": member.get("relationship") or "",
            "patient_identifier": member.get("identifier")
                                   or member.get("member_id")
                                   or member.get("subscriber_id")
                                   or "",
            "patient_date_of_birth": dob,
            "patient_first_name": member.get("first_name") or member.get("patient_first_name") or "",
            "patient_last_name":  member.get("last_name")  or member.get("patient_last_name")  or "",
        }
        return {k: v for k, v in payload.items() if v}

    # ================== network taps (optional debug) ==================
    async def _capture_response(self, response):
        try:
            url_l = response.url.lower()
            ctype = (response.headers.get("content-type") or "").lower()
            if "application/json" in ctype and "/gaprovider/api/dental-vob/ppo" in url_l:
                j = await response.json()
                self.eligibility_responses.append({"url": response.url, "status": response.status, "json": j, "timestamp": datetime.now().isoformat()})
                self.log(f"📥 captured PPO response: {response.url}")
        except:
            pass

    async def _capture_requestfinished(self, request):
        try:
            url_l = request.url.lower()
            if "/gaprovider/api/dental-vob/ppo" in url_l:
                resp = await request.response()
                if resp:
                    j = await resp.json()
                    self.eligibility_responses.append({"url": request.url, "status": resp.status, "json": j, "timestamp": datetime.now().isoformat()})
                    self.log(f"📥 captured PPO (requestfinished): {request.url}")
        except:
            pass

    def _attach_network_hooks(self):
        def handle_response(response): asyncio.create_task(self._capture_response(response))
        def handle_requestfinished(request): asyncio.create_task(self._capture_requestfinished(request))
        self.page.on("response", handle_response)
        self.page.on("requestfinished", handle_requestfinished)
        self.context.on("response", handle_response)
        self.context.on("requestfinished", handle_requestfinished)

    # ================== playwright lifecycle ==================
    async def ensure_browser(self):
        if self.browser and self.page:
            return
        self.pw_manager = await async_playwright().start()
        self.browser = await self.pw_manager.chromium.launch(headless=True)
        storage_state = self.auth_state_path if os.path.exists(self.auth_state_path) else None
        self.context = await self.browser.new_context(storage_state=storage_state)
        self.page = await self.context.new_page()

    async def cleanup_browser(self):
        if self.browser: await self.browser.close()
        if self.pw_manager: await self.pw_manager.stop()
        self.browser = None
        self.page = None

    # ================== UI actions ==================
    def start(self):
        self.status.delete(1.0, tk.END)
        self.otp_entry.config(state="disabled")
        self.otp_btn.config(state="disabled")
        self.eligibility_btn.config(state="disabled")
        self.view_btn.grid_remove()
        self.download_btn.grid_remove()
        self.log("> Starting login...")
        threading.Thread(target=self._run_async, daemon=True).start()

    def _run_async(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._login_flow())

    async def _login_flow(self):
        username, password, chosen_mfa = self.uname_var.get(), self.pwd_var.get(), self.mfa_var.get()

        HOME_URL = "https://www.guardiananytime.com/gaprovider/home"
        AUTH_URL = (
            "https://login.guardianlife.com/oauth2/default/v1/authorize"
            "?client_id=0oa3l1gpjzxhrgTrt4h7"
            "&scope=openid%20profile%20email%20glic.groups.read"
            "&response_type=code"
            "&redirect_uri=https%3A%2F%2Fsignin.guardianlife.com%2Fsignin%2Frouter%2Fauthorization-code%2Fcallback"
            "&state=3fFy_3CS-D8hCBZ1FHJzfRUHX9uo7B_ng-KLXb2gm6U"
            "&failureRedirect=https%3A%2F%2Flogin.guardianlife.com%2F"
            "&keepSessionInfo=true"
            "&successRedirect=%2Fsignin%2Frouter"
        )

        try:
            await self.ensure_browser()
            page = self.page
            self.eligibility_responses = []
            self._attach_network_hooks()

            self.log("DEBUG: Navigating to Guardian home")
            await page.goto(HOME_URL, wait_until="domcontentloaded")
            try: await page.wait_for_load_state("networkidle", timeout=4000)
            except: pass

            if HOME_URL in page.url:
                self.log("✅ Session found — home loaded, OTP not required.")
                self.otp_entry.config(state="disabled"); self.otp_btn.config(state="disabled")
                self.eligibility_btn.config(state="normal")
                try: await self.context.storage_state(path=self.auth_state_path)
                except: pass
                return

            # IdP route
            await page.goto(AUTH_URL, wait_until="domcontentloaded")
            try:
                await page.wait_for_selector('input[type="text"]', timeout=15000)
                await page.fill('input[type="text"]', username)
                await page.fill('input[type="password"]', password)
                btn = (await page.query_selector('input.button.button-primary[type="submit"][value="Log in"]')
                       or await page.query_selector('input[type="submit"][value="Log in"]'))
                if not btn:
                    self.log("❌ Can't find login button—ABORT."); await self.cleanup_browser(); return
                await btn.click(); self.log("> Submitted credentials…")
            except:
                self.log("DEBUG: No explicit login form; continuing.")
            for _ in range(12):
                if HOME_URL in page.url:
                    self.log("✅ Logged in without OTP (trusted session).")
                    self.otp_entry.config(state="disabled"); self.otp_btn.config(state="disabled")
                    self.eligibility_btn.config(state="normal")
                    try: await self.context.storage_state(path=self.auth_state_path)
                    except: pass
                    return
                await asyncio.sleep(1)

            # OTP path detection
            otp_needed = any([
                await page.query_selector('a.button.select-factor.link-button'),
                await page.query_selector('input.button.button-primary[type="submit"]'),
                await page.query_selector('button.button.button-primary'),
                await page.query_selector('input[autocomplete="one-time-code"], input[name="otp"], input[type="tel"]')
            ])
            if not otp_needed:
                try:
                    await page.wait_for_url("**guardiananytime.com/gaprovider/home**", timeout=15000)
                    self.log("✅ Routed to home — OTP not required.")
                    self.otp_entry.config(state="disabled"); self.otp_btn.config(state="disabled")
                    self.eligibility_btn.config(state="normal")
                    try: await self.context.storage_state(path=self.auth_state_path)
                    except: pass
                    return
                except:
                    self.log("❌ Neither home nor OTP UI detected — stopping."); await self.cleanup_browser(); return

            # OTP
            self.log("> Authentication requires OTP — enabling OTP input UI.")
            mfa_email_sel = 'div[data-se="okta_email"] a.button.select-factor.link-button'
            mfa_sms_sel = 'div[data-se="okta_sms"] a.button.select-factor.link-button'
            mfa_phone_sel = 'div[data-se="phone_number"] a.button.select-factor.link-button'
            try:
                btn = await page.query_selector(mfa_email_sel) if chosen_mfa.lower().startswith("email") \
                      else (await page.query_selector(mfa_sms_sel) or await page.query_selector(mfa_phone_sel))
                if btn: await btn.click(); await asyncio.sleep(1); self.log(f"> Selected MFA: {chosen_mfa}")
                else: self.log("> No selectable MFA, might be auto-advanced.")
                await page.wait_for_selector('input.button.button-primary[type="submit"], button.button.button-primary', timeout=18000)
                send_btn = await page.query_selector('input.button.button-primary[type="submit"]') \
                           or await page.query_selector('button.button.button-primary')
                if send_btn and await send_btn.is_enabled():
                    await send_btn.click(); self.log("> Code sent — waiting for OTP input from user…")
                    self.otp_entry.config(state="normal"); self.otp_btn.config(state="normal")
                else:
                    self.log("> Send code button not found or disabled — ABORT."); await self.cleanup_browser(); return
            except Exception as e:
                self.log(f"Exception preparing OTP flow: {e}"); self.log(traceback.format_exc()); await self.cleanup_browser(); return
        except Exception as e:
            self.log(f"EXCEPTION OUTSIDE: {e}\n{traceback.format_exc()}"); await self.cleanup_browser()

    def enter_otp(self):
        otp = self.otp_var.get()
        self.otp_entry.config(state="disabled"); self.otp_btn.config(state="disabled")
        threading.Thread(target=self._do_enter_otp, args=(otp,), daemon=True).start()

    def _do_enter_otp(self, otp):
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._complete_otp(otp))

    async def _complete_otp(self, otp):
        try:
            self.log(f"DEBUG: Attempting to enter OTP: {otp}")
            page = self.page
            otp_input = None
            for sel in ['input[autocomplete="one-time-code"]', 'input[type="text"]', 'input[type="tel"]', 'input[name="otp"]']:
                otp_input = await page.query_selector(sel)
                if otp_input: break
            if otp_input:
                await otp_input.fill(otp); await otp_input.press('Enter')
                try: await page.wait_for_url("**guardiananytime.com/gaprovider/home**", timeout=30000)
                except: pass
                try: await self.context.storage_state(path=self.auth_state_path)
                except: pass
                await asyncio.sleep(2)
                self.log("> OTP entered and submitted. Login complete!"); self.eligibility_btn.config(state="normal")
            else:
                self.log("❌ OTP input box not found!")
        except Exception as e:
            self.log(f"Exception during OTP submit: {e}\n{traceback.format_exc()}")

    # ================== main action ==================
    def eligibility_search(self):
        threading.Thread(target=self._do_eligibility_search, daemon=True).start()

    def _do_eligibility_search(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._eligibility_search_workflow())

    async def _eligibility_search_workflow(self):
        self.view_btn.grid_remove()
        self.download_btn.grid_remove()
        self.eligibility_json = None

        base = "https://www.guardiananytime.com"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Origin": base,
            "Referer": f"{base}/gaprovider/home",
            "Cookie": await self._cookie_header(),
            "User-Agent": "guardian-tk/1.0",
        }

        # -------- Patient info flow (with group enrichment) --------
        async def patient_flow():
            last_name = (self.patient_last_var.get() or "").strip()
            dob = (self.patient_dob_var.get() or "").strip()
            rel_ui = (self.patient_rel_var.get() or "Self").strip()

            async with httpx.AsyncClient(base_url=base, headers=headers, timeout=30.0, follow_redirects=True) as client:
                # try with UI relationship string, then code (S/D/SP/Self)
                search_bodies = [
                    [{
                        "date_of_birth": dob,
                        "last_name": last_name,
                        "relationship": rel_ui,
                        "first_name": "",
                        "zip_code": ""
                    }],
                    [{
                        "date_of_birth": dob,
                        "last_name": last_name,
                        "relationship": self._rel_code(rel_ui),
                        "first_name": "",
                        "zip_code": ""
                    }],
                ]

                last_err = None
                for body in search_bodies:
                    self.log(f"> API: POST /gaprovider/api/multiple-patient/search for {last_name}, {dob} (rel={body[0]['relationship']})")
                    resp = await client.post("/gaprovider/api/multiple-patient/search", json=body)
                    if resp.status_code >= 400:
                        last_err = (resp.status_code, resp.text[:400]); continue

                    data = resp.json()
                    rows = data.get("multiple_patient_search_res") or []
                    member = self._pick_member_by_dob(rows, dob)
                    if not member:
                        last_err = (404, "No dependent with that DOB"); continue

                    # backfill from same result
                    self._backfill_member_fields(member, rows)

                    # derive group if still missing
                    if not member.get("group_policy_number"):
                        ident = self._extract_identifier_from_rows_or_member(rows, member)
                        if ident:
                            g, _ = await self._enrich_group_by_identifier(client, ident)
                            if g:
                                member["group_policy_number"] = g

                    # if still missing, try one more pull from rows (any dependent)
                    if not member.get("group_policy_number"):
                        g2 = self._extract_group_from_rows(rows)
                        if g2:
                            member["group_policy_number"] = g2

                    if not member.get("group_policy_number"):
                        last_err = (400, "group_policy_number still missing after enrichment"); continue

                    # build PPO payload
                    dob_for_ppo = member.get("date_of_birth") or dob
                    ppo_payload = self._ppo_from_member_generic(member, dob_for_ppo)

                    self.log("DEBUG PPO payload keys (patient): " + ", ".join(sorted(ppo_payload.keys())))
                    self.log("> API: POST /gaprovider/api/dental-vob/ppo")
                    ppo_resp = await client.post("/gaprovider/api/dental-vob/ppo", json=ppo_payload)
                    if ppo_resp.status_code >= 400:
                        last_err = (ppo_resp.status_code, ppo_resp.text[:400]); continue

                    return {"selected_member": member, "ppo": ppo_resp.json(), "search_payload_used": body}, None

                return None, last_err or (400, "Patient info search failed")

        # -------- Member ID flow (unchanged; no group/division) --------
        async def member_flow():
            member_input = (self.member_id_var.get() or "").strip()
            full_name = (self.full_name_var.get() or "").strip()
            if not member_input:
                return None, (400, "Member ID is required")

            async with httpx.AsyncClient(base_url=base, headers=headers, timeout=30.0, follow_redirects=True) as client:
                tries = [
                    ("/gaprovider/api/multiple-patient/search", [{"member_id": member_input}]),
                    ("/gaprovider/api/multiple-patient/search", [{"input_identifier": member_input}]),
                    ("/gaprovider/api/multiple-patient/search", [{"identifier": member_input}]),
                ]
                last_err = None
                ms_json = None

                for path, payload in tries:
                    self.log(f"> API TRY: POST {path} payload={json.dumps(payload)[:180]}")
                    r = await client.post(path, json=payload)
                    if r.status_code < 400:
                        try:
                            ms_json = r.json()
                        except Exception:
                            ms_json = None
                        if isinstance(ms_json, dict) and ms_json.get("multiple_patient_search_res"):
                            self.log("✓ Member search returned results.")
                            break
                        last_err = (200, "Unexpected/empty response")
                        continue
                    last_err = (r.status_code, r.text[:400])

                if ms_json is None:
                    return None, last_err or (400, "Member search failed")

                member = self._pick_member_by_full_name(ms_json, full_name)
                if not member:
                    return None, (404, "Full Name not found in member-search results")

                dob = member.get("date_of_birth") or member.get("dob") or ""
                ppo_payload = self._ppo_from_member_generic(member, dob)

                if not ppo_payload.get("group_policy_number"):
                    return None, (400, "Group policy number missing in response; cannot call PPO")

                self.log("DEBUG PPO payload keys (member): " + ", ".join(sorted(ppo_payload.keys())))
                self.log("> API: POST /gaprovider/api/dental-vob/ppo")
                p = await client.post("/gaprovider/api/dental-vob/ppo", json=ppo_payload)
                if p.status_code >= 400:
                    return None, (p.status_code, p.text[:400])
                return {"selected_member": member, "ppo": p.json(), "member_search_json": ms_json}, None

        # choose and run
        mode = self.search_mode_var.get()
        if mode == "Member ID":
            data, err = await member_flow()
        else:
            data, err = await patient_flow()

        # one-time cookie refresh for 401/403
        if (not data) and err and err[0] in (401, 403):
            try:
                await self.page.goto("https://www.guardiananytime.com/gaprovider/home", wait_until="domcontentloaded")
                headers["Cookie"] = await self._cookie_header()
            except:
                pass
            if mode == "Member ID":
                data, err = await member_flow()
            else:
                data, err = await patient_flow()

        if data:
            self.eligibility_json = {"json": data, "timestamp": datetime.now().isoformat()}
            self.view_btn.grid(); self.download_btn.grid()
            self.log("✅ Eligibility JSON fetched.")
        elif err:
            self.log(f"❌ API failed ({err[0]}): {err[1]}")
        else:
            self.log("❌ Could not retrieve eligibility JSON.")

    def view_json(self):
        if not self.eligibility_json:
            messagebox.showinfo("No Data", "No eligibility data to show yet!")
            return
        win = tk.Toplevel(self.root)
        win.title("Extracted Eligibility JSON")
        ta = scrolledtext.ScrolledText(win, wrap=tk.WORD, width=100, height=35)
        ta.insert(tk.END, json.dumps(self.eligibility_json, indent=2))
        ta.pack(fill=tk.BOTH, expand=True)
        win.transient(self.root); win.grab_set(); win.focus_set()

    def download_json(self):
        if not self.eligibility_json:
            messagebox.showinfo("No Data", "No eligibility data to save yet!")
        else:
            fpath = filedialog.asksaveasfilename(defaultextension=".json",
                                                 filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")])
            if not fpath: return
            try:
                with open(fpath, "w") as f:
                    json.dump(self.eligibility_json, f, indent=2)
                messagebox.showinfo("Download Saved", f"Eligibility data written to {fpath}")
            except Exception as e:
                messagebox.showerror("Download Failed", f"Error: {e}")


if __name__ == "__main__":
    root = tk.Tk()
    app = GuardianAutomationApp(root)
    root.mainloop()
