// api/quote.js - Live Stock Price Quote Endpoint for Vercel

const FALLBACK_PRICES = {
  BSE: 3270.70,
  COALINDIA: 424.55,
  COAL_INDIA: 424.55,
  COAL: 424.55,
  NSE: 1850.00, // Pre-IPO / unlisted market reference
  MSCI: 6.94,   // Metropolitan Stock Exchange of India (MSEI)
  MSEI: 6.94,
  RELIANCE: 1385.50,
  HDFCBANK: 1682.00,
  HDFC: 1682.00,
  INFY: 1912.00,
  INFOSYS: 1912.00,
  TCS: 4125.00,
  ITC: 492.00,
  TATAMOTORS: 975.00,
  SBIN: 815.00,
  SBI: 815.00,
  ICICIBANK: 1240.00,
  ICICI: 1240.00,
  BHARTIARTL: 1650.00,
  AIRTEL: 1650.00,
  LT: 3580.00,
  MARUTI: 12450.00,
  HINDUNILVR: 2850.00,
  HUL: 2850.00,
  BAJFINANCE: 7120.00,
  SUNPHARMA: 1890.00,
  AXISBANK: 1210.00,
  KOTAKBANK: 1780.00,
  TITAN: 3680.00,
  ADANIENT: 2950.00,
  WIPRO: 540.00,
  NTPC: 410.00,
  ONGC: 295.00,
  POWERGRID: 335.00,
  TATASTEEL: 152.00,
};

let cachedCrumb = null;
let cachedCookie = null;
let crumbExpiry = 0;

async function getCrumbAndCookie() {
  const now = Date.now();
  if (cachedCrumb && cachedCookie && now < crumbExpiry) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }

  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const fcResp = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': userAgent },
  });
  const cookie = fcResp.headers.get('set-cookie');

  const crumbResp = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': userAgent,
      'Cookie': cookie || '',
    },
  });

  if (!crumbResp.ok) {
    throw new Error(`Failed to fetch crumb: ${crumbResp.status}`);
  }

  const crumb = await crumbResp.text();
  cachedCrumb = crumb;
  cachedCookie = cookie;
  crumbExpiry = now + 15 * 60 * 1000; // cache for 15 minutes
  return { crumb, cookie };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const rawSymbol = (req.query.symbol || '').trim();
  if (!rawSymbol) {
    return res.status(400).json({ error: 'symbol parameter is required' });
  }

  const clean = rawSymbol.toUpperCase().replace(/\s+/g, '');
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Check ticker candidates
  const candidates = [];
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) {
    candidates.push(clean);
  } else {
    candidates.push(`${clean}.NS`, `${clean}.BO`);
  }

  try {
    const { crumb, cookie } = await getCrumbAndCookie();

    for (const ticker of candidates) {
      try {
        const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}&crumb=${encodeURIComponent(crumb)}`;
        const resp = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Cookie': cookie || '',
          },
        });

        if (resp.ok) {
          const data = await resp.json();
          const quote = data?.quoteResponse?.result?.[0];
          if (quote && quote.regularMarketPrice != null) {
            return res.status(200).json({
              symbol: clean,
              ticker: ticker,
              price: Number(quote.regularMarketPrice.toFixed(2)),
              change: quote.regularMarketChange != null ? Number(quote.regularMarketChange.toFixed(2)) : null,
              changePct: quote.regularMarketChangePercent != null ? Number(quote.regularMarketChangePercent.toFixed(2)) : null,
              companyName: quote.longName || quote.shortName || clean,
              currency: quote.currency || 'INR',
              source: 'live_market',
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.warn(`Error querying ${ticker}:`, err.message);
      }
    }
  } catch (authErr) {
    console.warn('Crumb auth failed, using reference fallback:', authErr.message);
  }

  // Fallback to reference price catalog if live API failed or unlisted
  const fallback = FALLBACK_PRICES[clean] || FALLBACK_PRICES[clean.replace(/[^A-Z]/g, '')];
  if (fallback != null) {
    return res.status(200).json({
      symbol: clean,
      ticker: clean,
      price: fallback,
      change: 0,
      changePct: 0,
      currency: 'INR',
      source: 'reference_catalog',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(404).json({
    error: `Could not determine live price for ${clean}`,
    symbol: clean,
  });
}
