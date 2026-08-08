"""Curated research universe: large-cap US (NYSE/NASDAQ) and Canadian (TSX) equities.

Static on purpose: no scraping, no external lists, free and stable. Screener and
market-overview features screen against this list. All tickers are US or Canada.

Entries: (symbol, name, sector, country)
"""

UNIVERSE: list[dict] = [
    # US: Technology
    {"symbol": "AAPL", "name": "Apple", "sector": "Technology", "country": "US"},
    {"symbol": "MSFT", "name": "Microsoft", "sector": "Technology", "country": "US"},
    {"symbol": "GOOGL", "name": "Alphabet", "sector": "Technology", "country": "US"},
    {"symbol": "AMZN", "name": "Amazon", "sector": "Technology", "country": "US"},
    {"symbol": "NVDA", "name": "NVIDIA", "sector": "Technology", "country": "US"},
    {"symbol": "META", "name": "Meta Platforms", "sector": "Technology", "country": "US"},
    {"symbol": "TSLA", "name": "Tesla", "sector": "Technology", "country": "US"},
    {"symbol": "AVGO", "name": "Broadcom", "sector": "Technology", "country": "US"},
    {"symbol": "ORCL", "name": "Oracle", "sector": "Technology", "country": "US"},
    {"symbol": "CRM", "name": "Salesforce", "sector": "Technology", "country": "US"},
    {"symbol": "ADBE", "name": "Adobe", "sector": "Technology", "country": "US"},
    {"symbol": "NFLX", "name": "Netflix", "sector": "Technology", "country": "US"},
    {"symbol": "AMD", "name": "Advanced Micro Devices", "sector": "Technology", "country": "US"},
    {"symbol": "INTC", "name": "Intel", "sector": "Technology", "country": "US"},
    {"symbol": "QCOM", "name": "Qualcomm", "sector": "Technology", "country": "US"},
    {"symbol": "CSCO", "name": "Cisco", "sector": "Technology", "country": "US"},
    {"symbol": "IBM", "name": "IBM", "sector": "Technology", "country": "US"},
    {"symbol": "TXN", "name": "Texas Instruments", "sector": "Technology", "country": "US"},
    {"symbol": "AMAT", "name": "Applied Materials", "sector": "Technology", "country": "US"},
    {"symbol": "MU", "name": "Micron Technology", "sector": "Technology", "country": "US"},
    {"symbol": "UBER", "name": "Uber Technologies", "sector": "Technology", "country": "US"},
    {"symbol": "PLTR", "name": "Palantir Technologies", "sector": "Technology", "country": "US"},
    {"symbol": "PANW", "name": "Palo Alto Networks", "sector": "Technology", "country": "US"},
    {"symbol": "NOW", "name": "ServiceNow", "sector": "Technology", "country": "US"},
    {"symbol": "SNOW", "name": "Snowflake", "sector": "Technology", "country": "US"},
    # US: Communication
    {"symbol": "T", "name": "AT&T", "sector": "Communication", "country": "US"},
    {"symbol": "VZ", "name": "Verizon", "sector": "Communication", "country": "US"},
    {"symbol": "TMUS", "name": "T-Mobile US", "sector": "Communication", "country": "US"},
    {"symbol": "CMCSA", "name": "Comcast", "sector": "Communication", "country": "US"},
    {"symbol": "DIS", "name": "Walt Disney", "sector": "Communication", "country": "US"},
    # US: Consumer
    {"symbol": "KO", "name": "Coca-Cola", "sector": "Consumer", "country": "US"},
    {"symbol": "PEP", "name": "PepsiCo", "sector": "Consumer", "country": "US"},
    {"symbol": "MCD", "name": "McDonald's", "sector": "Consumer", "country": "US"},
    {"symbol": "SBUX", "name": "Starbucks", "sector": "Consumer", "country": "US"},
    {"symbol": "NKE", "name": "Nike", "sector": "Consumer", "country": "US"},
    {"symbol": "HD", "name": "Home Depot", "sector": "Consumer", "country": "US"},
    {"symbol": "LOW", "name": "Lowe's", "sector": "Consumer", "country": "US"},
    {"symbol": "COST", "name": "Costco", "sector": "Consumer", "country": "US"},
    {"symbol": "WMT", "name": "Walmart", "sector": "Consumer", "country": "US"},
    {"symbol": "TGT", "name": "Target", "sector": "Consumer", "country": "US"},
    {"symbol": "PG", "name": "Procter & Gamble", "sector": "Consumer", "country": "US"},
    {"symbol": "CL", "name": "Colgate-Palmolive", "sector": "Consumer", "country": "US"},
    # US: Energy
    {"symbol": "XOM", "name": "Exxon Mobil", "sector": "Energy", "country": "US"},
    {"symbol": "CVX", "name": "Chevron", "sector": "Energy", "country": "US"},
    {"symbol": "COP", "name": "ConocoPhillips", "sector": "Energy", "country": "US"},
    {"symbol": "SLB", "name": "Schlumberger", "sector": "Energy", "country": "US"},
    {"symbol": "OXY", "name": "Occidental Petroleum", "sector": "Energy", "country": "US"},
    # US: Financials
    {"symbol": "WFC", "name": "Wells Fargo", "sector": "Financials", "country": "US"},
    {"symbol": "JPM", "name": "JPMorgan Chase", "sector": "Financials", "country": "US"},
    {"symbol": "BAC", "name": "Bank of America", "sector": "Financials", "country": "US"},
    {"symbol": "C", "name": "Citigroup", "sector": "Financials", "country": "US"},
    {"symbol": "GS", "name": "Goldman Sachs", "sector": "Financials", "country": "US"},
    {"symbol": "MS", "name": "Morgan Stanley", "sector": "Financials", "country": "US"},
    {"symbol": "V", "name": "Visa", "sector": "Financials", "country": "US"},
    {"symbol": "MA", "name": "Mastercard", "sector": "Financials", "country": "US"},
    {"symbol": "AXP", "name": "American Express", "sector": "Financials", "country": "US"},
    {"symbol": "BRK-B", "name": "Berkshire Hathaway", "sector": "Financials", "country": "US"},
    # US: Healthcare
    {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "country": "US"},
    {"symbol": "PFE", "name": "Pfizer", "sector": "Healthcare", "country": "US"},
    {"symbol": "MRK", "name": "Merck", "sector": "Healthcare", "country": "US"},
    {"symbol": "ABBV", "name": "AbbVie", "sector": "Healthcare", "country": "US"},
    {"symbol": "LLY", "name": "Eli Lilly", "sector": "Healthcare", "country": "US"},
    {"symbol": "UNH", "name": "UnitedHealth", "sector": "Healthcare", "country": "US"},
    {"symbol": "TMO", "name": "Thermo Fisher", "sector": "Healthcare", "country": "US"},
    {"symbol": "AMGN", "name": "Amgen", "sector": "Healthcare", "country": "US"},
    {"symbol": "GILD", "name": "Gilead Sciences", "sector": "Healthcare", "country": "US"},
    {"symbol": "BMY", "name": "Bristol-Myers Squibb", "sector": "Healthcare", "country": "US"},
    # US: Industrials
    {"symbol": "BA", "name": "Boeing", "sector": "Industrials", "country": "US"},
    {"symbol": "CAT", "name": "Caterpillar", "sector": "Industrials", "country": "US"},
    {"symbol": "GE", "name": "GE Aerospace", "sector": "Industrials", "country": "US"},
    {"symbol": "HON", "name": "Honeywell", "sector": "Industrials", "country": "US"},
    {"symbol": "UPS", "name": "United Parcel Service", "sector": "Industrials", "country": "US"},
    {"symbol": "LMT", "name": "Lockheed Martin", "sector": "Industrials", "country": "US"},
    {"symbol": "RTX", "name": "RTX Corp", "sector": "Industrials", "country": "US"},
    {"symbol": "DE", "name": "Deere", "sector": "Industrials", "country": "US"},
    {"symbol": "MMM", "name": "3M", "sector": "Industrials", "country": "US"},
    # US: Materials
    {"symbol": "LIN", "name": "Linde", "sector": "Materials", "country": "US"},
    {"symbol": "SHW", "name": "Sherwin-Williams", "sector": "Materials", "country": "US"},
    {"symbol": "FCX", "name": "Freeport-McMoRan", "sector": "Materials", "country": "US"},
    {"symbol": "NEM", "name": "Newmont", "sector": "Materials", "country": "US"},
    # US: Utilities
    {"symbol": "NEE", "name": "NextEra Energy", "sector": "Utilities", "country": "US"},
    {"symbol": "DUK", "name": "Duke Energy", "sector": "Utilities", "country": "US"},
    {"symbol": "SO", "name": "Southern Company", "sector": "Utilities", "country": "US"},
    # Canada: Banks
    {"symbol": "RY.TO", "name": "Royal Bank of Canada", "sector": "Financials", "country": "CA"},
    {"symbol": "TD.TO", "name": "TD Bank", "sector": "Financials", "country": "CA"},
    {"symbol": "BNS.TO", "name": "Bank of Nova Scotia", "sector": "Financials", "country": "CA"},
    {"symbol": "BMO.TO", "name": "Bank of Montreal", "sector": "Financials", "country": "CA"},
    {"symbol": "CM.TO", "name": "CIBC", "sector": "Financials", "country": "CA"},
    {"symbol": "NA.TO", "name": "National Bank of Canada", "sector": "Financials", "country": "CA"},
    # Canada: Energy
    {"symbol": "SU.TO", "name": "Suncor Energy", "sector": "Energy", "country": "CA"},
    {"symbol": "CNQ.TO", "name": "Canadian Natural Resources", "sector": "Energy", "country": "CA"},
    {"symbol": "ENB.TO", "name": "Enbridge", "sector": "Energy", "country": "CA"},
    {"symbol": "TRP.TO", "name": "TC Energy", "sector": "Energy", "country": "CA"},
    {"symbol": "CVE.TO", "name": "Cenovus Energy", "sector": "Energy", "country": "CA"},
    {"symbol": "IMO.TO", "name": "Imperial Oil", "sector": "Energy", "country": "CA"},
    {"symbol": "TOU.TO", "name": "Tourmaline Oil", "sector": "Energy", "country": "CA"},
    {"symbol": "PPL.TO", "name": "Pembina Pipeline", "sector": "Energy", "country": "CA"},
    # Canada: Industrials / Transport
    {"symbol": "CNR.TO", "name": "Canadian National Railway", "sector": "Industrials", "country": "CA"},
    {"symbol": "CP.TO", "name": "Canadian Pacific Kansas City", "sector": "Industrials", "country": "CA"},
    {"symbol": "WCN.TO", "name": "Waste Connections", "sector": "Industrials", "country": "CA"},
    {"symbol": "TFII.TO", "name": "TFI International", "sector": "Industrials", "country": "CA"},
    {"symbol": "DOO.TO", "name": "BRP", "sector": "Consumer", "country": "CA"},
    # Canada: Technology
    {"symbol": "SHOP.TO", "name": "Shopify", "sector": "Technology", "country": "CA"},
    {"symbol": "CSU.TO", "name": "Constellation Software", "sector": "Technology", "country": "CA"},
    {"symbol": "OTEX.TO", "name": "OpenText", "sector": "Technology", "country": "CA"},
    {"symbol": "LSPD.TO", "name": "Lightspeed Commerce", "sector": "Technology", "country": "CA"},
    # Canada: Communication
    {"symbol": "T.TO", "name": "Telus", "sector": "Communication", "country": "CA"},
    {"symbol": "BCE.TO", "name": "Bell Canada", "sector": "Communication", "country": "CA"},
    # Canada: Consumer
    {"symbol": "ATD.TO", "name": "Alimentation Couche-Tard", "sector": "Consumer", "country": "CA"},
    {"symbol": "L.TO", "name": "Loblaw", "sector": "Consumer", "country": "CA"},
    {"symbol": "MRU.TO", "name": "Metro", "sector": "Consumer", "country": "CA"},
    {"symbol": "QSR.TO", "name": "Restaurant Brands", "sector": "Consumer", "country": "CA"},
    # Canada: Financials / Insurance
    {"symbol": "MFC.TO", "name": "Manulife", "sector": "Financials", "country": "CA"},
    {"symbol": "SLF.TO", "name": "Sun Life", "sector": "Financials", "country": "CA"},
    {"symbol": "GWO.TO", "name": "Great-West Lifeco", "sector": "Financials", "country": "CA"},
    {"symbol": "POW.TO", "name": "Power Corp of Canada", "sector": "Financials", "country": "CA"},
    {"symbol": "IFC.TO", "name": "Intact Financial", "sector": "Financials", "country": "CA"},
    # Canada: Materials / Mining
    {"symbol": "AEM.TO", "name": "Agnico Eagle Mines", "sector": "Materials", "country": "CA"},
    {"symbol": "ABX.TO", "name": "Barrick Gold", "sector": "Materials", "country": "CA"},
    {"symbol": "WPM.TO", "name": "Wheaton Precious Metals", "sector": "Materials", "country": "CA"},
    {"symbol": "FM.TO", "name": "First Quantum Minerals", "sector": "Materials", "country": "CA"},
    # Canada: Utilities
    {"symbol": "FTS.TO", "name": "Fortis", "sector": "Utilities", "country": "CA"},
    {"symbol": "EMA.TO", "name": "Emera", "sector": "Utilities", "country": "CA"},
]

BY_SYMBOL: dict[str, dict] = {item["symbol"]: item for item in UNIVERSE}

# Market indices shown on the dashboard (US + Canada).
INDEXES: list[dict] = [
    {"symbol": "^GSPC", "name": "S&P 500"},
    {"symbol": "^IXIC", "name": "Nasdaq Composite"},
    {"symbol": "^DJI", "name": "Dow Jones"},
    {"symbol": "^GSPTSE", "name": "S&P/TSX Composite"},
    {"symbol": "^VIX", "name": "VIX Volatility"},
]

SECTORS: list[str] = sorted({item["sector"] for item in UNIVERSE})
