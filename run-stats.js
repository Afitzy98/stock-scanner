const fs = require("fs");
const { linearRegression } = require("simple-statistics");
const { isInterestingStock } = require("./utils");

const exchanges = process.argv[2] ? process.argv[2].split(",") : [];

const keys = [
  "al_ratio",
  "pb_ratio",
  "de_ratio",
  "pe_ratio",
  "eps_slope",
  "div_yield",
];

let stats = JSON.parse(fs.readFileSync("stats.json"));

stats = stats.map((s) => ({
  ...s,
  eps_slope: linearRegression(s.eps.map((v, idx) => [idx, v])).m,
}));

let interesting = stats.filter(isInterestingStock);

if (exchanges.length > 0) {
  interesting = interesting.filter(({ ticker }) =>
    exchanges.includes(ticker.split(":")[0])
  );
}

const scaleFeatures = (data, keys) => {
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const max = Math.max(...data.map((d) => d[k]));
    const min = Math.min(...data.map((d) => d[k]));

    data = data.map((d) => ({ ...d, [k]: (d[k] - min) / (max - min) }));
  }
  return data;
};

const score = (s) => {
  return (
    s.al_ratio -
    s.de_ratio +
    s.div_yield -
    s.pb_ratio -
    s.pe_ratio +
    s.eps_slope
  );
};

const scaled_features = scaleFeatures(interesting, keys);

const ranked = scaled_features.map((s) => ({ ...s, score: score(s) }));
const sorted = ranked.sort((a, b) => b.score - a.score);

console.log(
  `Of ${stats.length} there are ${interesting.length} interesting stocks`
);

fs.writeFileSync("ranked.json", JSON.stringify(sorted));
