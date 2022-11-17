const { chromium } = require("playwright");
const fs = require("fs");

async function getTickers() {
  console.log("[INFO] scannning tickers");
  let tickers = [];
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  page.on("response", async (response) => {
    if (response.url() === "https://scanner.tradingview.com/global/scan") {
      const body = await response.body();
      tickers = JSON.parse(body.toString("utf-8")).data.map(({ s }) => s);
    }
  });
  await page.goto("https://www.tradingview.com/screener/");

  await page.locator(".tv-header__user-menu-button").first().click();

  await page.getByText("Sign in").click();
  await page.waitForTimeout(1000);
  await page.getByText("Email").click();
  await page.waitForTimeout(1000);
  await page.locator(`input[name="username"]`).type("BeepBoopLol");
  await page.locator(`input[name="password"]`).type("BeepBoop1");
  await page.waitForTimeout(1000);
  await page.locator('role=button[name="Sign in"]').click();

  await page.waitForTimeout(10000);

  const text = await page.locator(".js-field-total").first().textContent();
  const num_matches = parseInt(text);

  while (tickers.length < num_matches) {
    console.log(`[INFO] have ${tickers.length}/${num_matches}`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);
  }

  browser.close();
  return tickers;
}

getTickers().then((tickers) => {
  console.log("[INFO] writing tickers to file tickers.json");
  fs.writeFileSync("tickers.json", JSON.stringify(tickers));
  console.log("[INFO] operation complete");
});
