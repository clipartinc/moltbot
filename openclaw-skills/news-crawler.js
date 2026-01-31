/**
 * OpenClaw Skill: News Crawler & Trend Finder
 * Crawls the web for news and identifies trending topics
 * 
 * Usage: 
 * - "Find trending news in tech"
 * - "What's trending in the stock market?"
 * - "Get news trends for AI"
 */

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY || ''
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || ''

// Categories to scan for trends
const NEWS_CATEGORIES = {
  markets: ['stock market', 'S&P 500', 'nasdaq', 'federal reserve', 'interest rates', 'earnings'],
  tech: ['artificial intelligence', 'AI stocks', 'tech earnings', 'semiconductor', 'cloud computing'],
  crypto: ['bitcoin', 'ethereum', 'crypto regulation', 'blockchain'],
  economy: ['inflation', 'jobs report', 'GDP', 'recession', 'consumer spending'],
  options: ['options flow', 'unusual options', 'put call ratio', 'VIX', 'implied volatility']
}

/**
 * Search for news using Brave Search API
 */
async function searchNews(query, count = 10) {
  if (!BRAVE_API_KEY) {
    return { error: 'BRAVE_SEARCH_API_KEY not configured' }
  }

  const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=${count}&freshness=pd`
  
  const resp = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  })

  if (!resp.ok) {
    return { error: `Search failed: ${resp.status}` }
  }

  const data = await resp.json()
  return data.results || []
}

/**
 * Get market news from Polygon
 */
async function getMarketNews(ticker = null, limit = 10) {
  if (!POLYGON_API_KEY) {
    return []
  }

  const tickerParam = ticker ? `&ticker=${ticker}` : ''
  const url = `https://api.polygon.io/v2/reference/news?limit=${limit}${tickerParam}&apiKey=${POLYGON_API_KEY}`
  
  const resp = await fetch(url)
  if (!resp.ok) return []
  
  const data = await resp.json()
  return data.results || []
}

/**
 * Extract keywords and count frequency
 */
function extractTrends(articles) {
  const keywords = {}
  const tickers = {}
  
  for (const article of articles) {
    const text = `${article.title || ''} ${article.description || ''}`.toLowerCase()
    
    // Extract stock tickers (uppercase 1-5 letter words)
    const tickerMatches = text.match(/\b[A-Z]{1,5}\b/g) || []
    for (const ticker of tickerMatches) {
      if (ticker.length >= 2) {
        tickers[ticker] = (tickers[ticker] || 0) + 1
      }
    }
    
    // Extract key phrases
    const phrases = [
      'federal reserve', 'interest rate', 'earnings', 'ai', 'artificial intelligence',
      'layoffs', 'acquisition', 'merger', 'ipo', 'buyback', 'dividend',
      'inflation', 'recession', 'bull market', 'bear market', 'rally',
      'sell-off', 'volatility', 'options', 'short squeeze', 'insider'
    ]
    
    for (const phrase of phrases) {
      if (text.includes(phrase)) {
        keywords[phrase] = (keywords[phrase] || 0) + 1
      }
    }
  }

  return { keywords, tickers }
}

/**
 * Score and rank trends
 */
function rankTrends(trends, minCount = 2) {
  const { keywords, tickers } = trends
  
  const rankedKeywords = Object.entries(keywords)
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ topic: word, mentions: count }))

  const rankedTickers = Object.entries(tickers)
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, mentions: count }))

  return { topics: rankedKeywords, tickers: rankedTickers }
}

/**
 * Get trending news for a category
 * @param {string} category - One of: markets, tech, crypto, economy, options
 * @returns {Object} Trending topics and articles
 */
export async function getTrendingNews(category = 'markets') {
  const queries = NEWS_CATEGORIES[category] || NEWS_CATEGORIES.markets
  const allArticles = []
  
  for (const query of queries) {
    const results = await searchNews(query, 5)
    if (!results.error) {
      allArticles.push(...results)
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 200))
  }

  // Deduplicate by title
  const seen = new Set()
  const unique = allArticles.filter(a => {
    if (seen.has(a.title)) return false
    seen.add(a.title)
    return true
  })

  const trends = extractTrends(unique)
  const ranked = rankTrends(trends)

  return {
    category,
    articleCount: unique.length,
    trends: ranked,
    topArticles: unique.slice(0, 5).map(a => ({
      title: a.title,
      source: a.source?.name || a.meta_url?.hostname || 'Unknown',
      url: a.url,
      age: a.age || 'recent'
    }))
  }
}

/**
 * Scan all categories for a comprehensive trend report
 */
export async function getFullTrendReport() {
  const report = {}
  
  for (const category of Object.keys(NEWS_CATEGORIES)) {
    const data = await getTrendingNews(category)
    report[category] = data
    await new Promise(r => setTimeout(r, 500))
  }

  return report
}

/**
 * Get breaking news that might affect markets
 */
export async function getBreakingMarketNews() {
  const articles = []
  
  // Get from Polygon (market-specific)
  const polygonNews = await getMarketNews(null, 20)
  articles.push(...polygonNews.map(a => ({
    title: a.title,
    source: a.publisher?.name || 'Unknown',
    url: a.article_url,
    tickers: a.tickers || [],
    published: a.published_utc
  })))

  // Get from Brave (broader news)
  const braveResults = await searchNews('stock market breaking news', 10)
  if (!braveResults.error) {
    articles.push(...braveResults.map(a => ({
      title: a.title,
      source: a.source?.name || 'Unknown',
      url: a.url,
      tickers: [],
      published: a.age || 'recent'
    })))
  }

  // Sort by recency and dedupe
  const seen = new Set()
  return articles
    .filter(a => {
      if (seen.has(a.title)) return false
      seen.add(a.title)
      return true
    })
    .slice(0, 15)
}

/**
 * Search for news about specific topics
 * @param {string} topic - What to search for
 * @param {number} limit - Number of results
 */
export async function searchTopicNews(topic, limit = 10) {
  const results = await searchNews(topic, limit)
  
  if (results.error) {
    return results
  }

  return results.map(a => ({
    title: a.title,
    description: a.description,
    source: a.source?.name || 'Unknown',
    url: a.url,
    age: a.age || 'recent'
  }))
}

/**
 * Format trend report for Discord
 */
export function formatTrendReport(report) {
  let message = '📊 **Market Trends Report**\n\n'
  
  if (report.trends?.topics?.length) {
    message += '🔥 **Trending Topics:**\n'
    for (const t of report.trends.topics.slice(0, 5)) {
      message += `• ${t.topic} (${t.mentions} mentions)\n`
    }
    message += '\n'
  }

  if (report.trends?.tickers?.length) {
    message += '📈 **Hot Tickers:**\n'
    for (const t of report.trends.tickers.slice(0, 5)) {
      message += `• $${t.ticker} (${t.mentions} mentions)\n`
    }
    message += '\n'
  }

  if (report.topArticles?.length) {
    message += '📰 **Top Stories:**\n'
    for (const a of report.topArticles.slice(0, 3)) {
      message += `• [${a.title}](${a.url}) - ${a.source}\n`
    }
  }

  return message
}

// Skill metadata
export const newsCrawlerInfo = {
  name: 'news-crawler',
  version: '1.0.0',
  description: 'Crawls web for news and identifies trending topics',
  requires: ['BRAVE_SEARCH_API_KEY'],
  optional: ['POLYGON_API_KEY'],
  functions: [
    { name: 'getTrendingNews', description: 'Get trending news for a category (markets, tech, crypto, economy, options)' },
    { name: 'getFullTrendReport', description: 'Scan all categories for comprehensive trend report' },
    { name: 'getBreakingMarketNews', description: 'Get breaking news affecting markets' },
    { name: 'searchTopicNews', description: 'Search for news on a specific topic' },
    { name: 'formatTrendReport', description: 'Format trend report for Discord' }
  ]
}
