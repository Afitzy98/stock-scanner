const { chromium } = require("playwright");
const fs = require("fs");

const tickers = JSON.parse(fs.readFileSync("tickers.json"));

const getRowValues = async (name, page, max = 5) => {
  const texts = await page
    .locator(`div[data-name="${name}"]`)
    .locator(".value-pg2GO866")
    .allTextContents();

  return texts
    .map((n) => parseVal(n.slice(1)))
    .filter((n) => !isNaN(n))
    .slice(Math.max(0, texts.length - max));
};

const parseVal = (v) => {
  const n = parseFloat(v);

  if (v.includes("T")) {
    return n * 10e12;
  }

  if (v.includes("B")) {
    return n * 10e9;
  }

  if (v.includes("M")) {
    return n * 10e6;
  }

  if (v.includes("K")) {
    return n * 10e3;
  }

  return n;
};

const getLatestRowValue = async (name, page) => {
  const row = await getRowValues(name, page);
  return row.length > 0 ? row[row.length - 1] : 0;
};

async function checkTicker(ticker) {
  const browser = await chromium.launch({
    headless: true,
  });
  const handleClose = () => browser.close();
  process.on("SIGINT", handleClose);

  const page = await browser.newPage();

  await page.goto(
    `https://www.tradingview.com/symbols/${ticker
      .split(":")
      .join("-")}/financials-income-statement/`
  );

  await page.waitForTimeout(2000);

  const market_cap = parseVal(
    await page.locator(".js-symbol-market-cap").first().textContent()
  );
  const price = parseVal(
    await page.locator(".tv-symbol-price-quote__value").first().textContent()
  );

  const div_yield = parseVal(
    await page.locator(".js-symbol-dividends").first().textContent()
  );

  await page.locator("button").getByText("Annual").click();

  const eps = await getRowValues("Basic earnings per share (Basic EPS)", page);
  const latest_eps = eps.length > 0 ? eps[eps.length - 1] : 0;

  await page.getByText("Balance sheet").click();

  const latest_assets = await getLatestRowValue("Total assets", page);
  const latest_liabilities = await getLatestRowValue("Total liabilities", page);
  const latest_debt = await getLatestRowValue("Total debt", page);
  const latest_equity = latest_assets - latest_liabilities;

  await handleClose();
  process.off("SIGINT", handleClose);

  return {
    ticker,
    price,
    div_yield,
    eps,
    al_ratio: latest_assets / latest_liabilities,
    pb_ratio: market_cap / latest_assets,
    de_ratio: latest_debt / latest_equity,
    pe_ratio: price / latest_eps,
  };
}

const batchArr = (arr, num_batches = 10) => {
  const batches = [];
  const per_batch = Math.ceil(arr.length / num_batches);
  for (let i = 0; i < arr.length; i += per_batch) {
    batches.push(arr.slice(i, Math.min(i + per_batch, arr.length)));
  }
  return batches;
};

const main = async () => {
  const stats = [];
  const start = +new Date();

  const batches = batchArr(tickers);

  await Promise.all(
    batches.map(async (batch) => {
      for (let i = 0; i < batch.length; i++) {
        try {
          const s = await checkTicker(batch[i]);
          stats.push(s);

          const diff = +new Date() - start;
          const remaining_estimate =
            ((diff / stats.length) * (tickers.length - stats.length)) /
            (1000 * 60);
          console.log(
            `Completed ${stats.length}/${tickers.length} (${(
              (stats.length / tickers.length) *
              100
            ).toFixed(2)}%) - ${
              s.ticker
            } - estimated time remaining: ${remaining_estimate.toFixed(2)} mins`
          );
        } catch (err) {
          console.log(`Error for ${batch[i]}`);
        }
      }
    })
  );

  fs.writeFileSync("stats.json", JSON.stringify(stats));
  process.exit();
};

main();
