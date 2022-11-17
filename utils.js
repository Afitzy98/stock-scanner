const isInterestingStock = (stats) => {
  return (
    // Current assets at least 1.5 x current liabilities
    stats.al_ratio >= 1.5 &&
    // Debt must be no more than 1.1. x working capital
    stats.de_ratio < 1 &&
    // Must be paying a dividend regardless of amount
    stats.div_yield > 0 &&
    // Price to book ratio < 1.2
    stats.pb_ratio < 1.2 &&
    // Price to earnings must be < 10
    stats.pe_ratio < 10 &&
    // EPS in last five years is up
    stats.eps.length === 5 &&
    stats.eps_slope > 1
  );
};

module.exports = { isInterestingStock };
