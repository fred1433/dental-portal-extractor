import asyncio
import re
from playwright.async_api import Playwright, async_playwright, expect


async def run(playwright: Playwright) -> None:
    browser = await playwright.chromium.launch(headless=False)
    context = await browser.new_context(service_workers="block")
    await context.route_from_har("/Users/frederic/Documents/ProjetsDev/dental-portal-extractor/MetLife-HAR-Complete/metlife_requests.har")
    page = await context.new_page()
    await page.goto("https://dentalprovider.metlife.com/presignin")
    await page.get_by_role("button", name="Sign in").click()
    await page.get_by_role("textbox", name="username").fill("payorportal4771")
    await page.get_by_role("textbox", name="password").click()
    await page.get_by_role("textbox", name="password").fill("Dental24!")
    await page.get_by_role("button", name="Log in").click()
    await page.goto("https://dentalprovider.metlife.com/home")
    await page.locator("div").filter(has_text=re.compile(r"^Subscriber ID or Social Security Number$")).nth(2).click()
    await page.get_by_test_id("input-default-input").fill("635140654")
    await page.get_by_role("button", name="Submit").click()
    await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn?appPath=toListPlan&mapParm=SignIn")
    await page.locator("#lastName").click()
    await page.locator("#lastName").fill("Tedford")
    await page.get_by_role("link", name="submit").click()
    await page.get_by_role("link", name="AVERLY G TEDFORD").click()
    await page.get_by_role("row", name="CHOU, JENNIFER 772-7553 63195").get_by_role("link").click()
    await page.get_by_role("link", name="Benefit Levels, Frequency &").click()
    await page.get_by_role("link", name="Patient Summary").click()
    await page.get_by_role("link", name="Patient Eligibility").click()

    # ---------------------
    await context.storage_state(path="metlife_auth.json")
    await context.close()
    await browser.close()


async def main() -> None:
    async with async_playwright() as playwright:
        await run(playwright)


asyncio.run(main())
