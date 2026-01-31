/**
 * OpenClaw Skill: Money Maker - Business & Side Hustle Finder
 * Finds trending products, services, and money-making opportunities
 * 
 * Usage:
 * - "Find trending products to sell"
 * - "What services are in demand?"
 * - "Give me side hustle ideas"
 */

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY || ''
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || ''
const OPPORTUNITIES_CHANNEL_ID = process.env.DISCORD_OPPORTUNITIES_CHANNEL_ID || ''

// Categories to search for opportunities
const OPPORTUNITY_CATEGORIES = {
  products: [
    'trending products to sell 2026',
    'best dropshipping products',
    'viral TikTok products',
    'Amazon FBA trending products',
    'Etsy best sellers trending',
    'print on demand trending designs'
  ],
  services: [
    'most in demand freelance services',
    'high paying service business ideas',
    'local services in high demand',
    'online services to offer',
    'B2B services small business need'
  ],
  sideHustles: [
    'best side hustles 2026',
    'passive income ideas',
    'weekend side hustle ideas',
    'work from home business ideas',
    'low startup cost business ideas'
  ],
  digital: [
    'digital products to sell online',
    'best selling online courses topics',
    'SaaS ideas micro startup',
    'AI tools business opportunities',
    'newsletter business ideas'
  ],
  affiliate: [
    'high paying affiliate programs',
    'trending affiliate niches',
    'best recurring commission programs',
    'software affiliate programs'
  ]
}

/**
 * Search for opportunities using Brave
 */
async function searchOpportunities(query, count = 8) {
  if (!BRAVE_API_KEY) {
    return { error: 'BRAVE_SEARCH_API_KEY not configured' }
  }

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&freshness=pm`
  
  const resp = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  })

  if (!resp.ok) return []
  
  const data = await resp.json()
  return data.web?.results || []
}

/**
 * Search news for business opportunities
 */
async function searchBusinessNews(query, count = 5) {
  if (!BRAVE_API_KEY) return []

  const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=${count}&freshness=pw`
  
  const resp = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  })

  if (!resp.ok) return []
  
  const data = await resp.json()
  return data.results || []
}

/**
 * Extract opportunity ideas from search results
 */
function extractIdeas(results) {
  const ideas = []
  
  for (const r of results) {
    const title = r.title || ''
    const desc = r.description || ''
    const url = r.url || ''
    
    // Skip if too short or looks like spam
    if (title.length < 10 || desc.length < 20) continue
    if (title.toLowerCase().includes('sponsored')) continue
    
    ideas.push({
      title: title.slice(0, 100),
      description: desc.slice(0, 200),
      url,
      source: r.meta_url?.hostname || new URL(url).hostname || 'Unknown'
    })
  }
  
  return ideas.slice(0, 5)
}

/**
 * Get trending products to sell
 */
export async function getTrendingProducts() {
  const queries = OPPORTUNITY_CATEGORIES.products
  const allResults = []
  
  for (const query of queries.slice(0, 3)) {
    const results = await searchOpportunities(query)
    allResults.push(...results)
    await new Promise(r => setTimeout(r, 200))
  }
  
  return {
    category: 'Trending Products',
    ideas: extractIdeas(allResults),
    tips: [
      'Check TikTok Shop for viral product validation',
      'Use Google Trends to verify demand',
      'Look for products with 3-5x markup potential',
      'Consider shipping costs and complexity'
    ]
  }
}

/**
 * Get in-demand services
 */
export async function getInDemandServices() {
  const queries = OPPORTUNITY_CATEGORIES.services
  const allResults = []
  
  for (const query of queries.slice(0, 3)) {
    const results = await searchOpportunities(query)
    allResults.push(...results)
    await new Promise(r => setTimeout(r, 200))
  }
  
  return {
    category: 'In-Demand Services',
    ideas: extractIdeas(allResults),
    tips: [
      'Start with skills you already have',
      'Local services often have less competition',
      'Recurring revenue services are most valuable',
      'Package services for predictable pricing'
    ]
  }
}

/**
 * Get side hustle ideas
 */
export async function getSideHustleIdeas() {
  const queries = OPPORTUNITY_CATEGORIES.sideHustles
  const allResults = []
  
  for (const query of queries.slice(0, 3)) {
    const results = await searchOpportunities(query)
    allResults.push(...results)
    await new Promise(r => setTimeout(r, 200))
  }
  
  return {
    category: 'Side Hustles',
    ideas: extractIdeas(allResults),
    tips: [
      'Start small and validate before investing',
      'Focus on hustles that can scale',
      'Consider time vs money tradeoff',
      'Look for recurring income opportunities'
    ]
  }
}

/**
 * Get digital product ideas
 */
export async function getDigitalProductIdeas() {
  const queries = OPPORTUNITY_CATEGORIES.digital
  const allResults = []
  
  for (const query of queries.slice(0, 3)) {
    const results = await searchOpportunities(query)
    allResults.push(...results)
    await new Promise(r => setTimeout(r, 200))
  }
  
  return {
    category: 'Digital Products',
    ideas: extractIdeas(allResults),
    tips: [
      'Digital products have near-zero marginal cost',
      'Templates and tools sell well',
      'Courses need marketing but scale infinitely',
      'SaaS requires tech skills but has best margins'
    ]
  }
}

/**
 * Get affiliate opportunities
 */
export async function getAffiliateOpportunities() {
  const queries = OPPORTUNITY_CATEGORIES.affiliate
  const allResults = []
  
  for (const query of queries.slice(0, 3)) {
    const results = await searchOpportunities(query)
    allResults.push(...results)
    await new Promise(r => setTimeout(r, 200))
  }
  
  return {
    category: 'Affiliate Marketing',
    ideas: extractIdeas(allResults),
    tips: [
      'Recurring commissions beat one-time payouts',
      'Promote products you actually use',
      'Software/SaaS affiliates pay highest',
      'Build an audience first, monetize second'
    ]
  }
}

/**
 * Get comprehensive money-making report
 */
export async function getFullOpportunityReport() {
  const report = {}
  
  const categories = [
    { key: 'products', fn: getTrendingProducts },
    { key: 'services', fn: getInDemandServices },
    { key: 'sideHustles', fn: getSideHustleIdeas },
    { key: 'digital', fn: getDigitalProductIdeas }
  ]
  
  for (const { key, fn } of categories) {
    report[key] = await fn()
    await new Promise(r => setTimeout(r, 500))
  }
  
  return report
}

/**
 * Post to Discord channel
 */
async function postToDiscord(channelId, content) {
  if (!DISCORD_BOT_TOKEN || !channelId) {
    return { error: 'Discord not configured' }
  }

  const url = `https://discord.com/api/v10/channels/${channelId}/messages`
  
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  })

  return resp.ok ? { success: true } : { error: `Discord error: ${resp.status}` }
}

/**
 * Format opportunity report for Discord
 */
export function formatOpportunityPost(data) {
  const emoji = {
    'Trending Products': '🛍️',
    'In-Demand Services': '💼',
    'Side Hustles': '💰',
    'Digital Products': '💻',
    'Affiliate Marketing': '🔗'
  }
  
  const icon = emoji[data.category] || '💡'
  
  let message = `${icon} **${data.category}**\n`
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`
  
  if (data.ideas?.length) {
    for (let i = 0; i < data.ideas.length; i++) {
      const idea = data.ideas[i]
      message += `**${i + 1}. ${idea.title}**\n`
      message += `${idea.description}\n`
      message += `🔗 [Read more](${idea.url}) - *${idea.source}*\n\n`
    }
  }
  
  if (data.tips?.length) {
    message += `💡 **Pro Tips:**\n`
    for (const tip of data.tips) {
      message += `• ${tip}\n`
    }
  }
  
  return message
}

/**
 * Run daily opportunity update
 */
export async function runDailyOpportunityUpdate() {
  console.log('[Opportunities] Generating daily update...')
  
  const channelId = OPPORTUNITIES_CHANNEL_ID
  if (!channelId) {
    return { error: 'DISCORD_OPPORTUNITIES_CHANNEL_ID not set' }
  }

  // Rotate categories each day
  const dayOfWeek = new Date().getDay()
  const categories = [
    getTrendingProducts,    // Sunday & Wednesday
    getInDemandServices,    // Monday & Thursday
    getSideHustleIdeas,     // Tuesday & Friday
    getDigitalProductIdeas  // Saturday
  ]
  
  const fnIndex = dayOfWeek % categories.length
  const data = await categories[fnIndex]()
  
  // Header
  let message = `🌟 **Daily Money-Making Opportunity** 🌟\n`
  message += `*${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}*\n\n`
  message += formatOpportunityPost(data)
  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`
  message += `*Ask me for more ideas anytime!*`
  
  return postToDiscord(channelId, message)
}

/**
 * Run weekly comprehensive report (Sundays)
 */
export async function runWeeklyOpportunityReport() {
  console.log('[Opportunities] Generating weekly report...')
  
  const channelId = OPPORTUNITIES_CHANNEL_ID
  if (!channelId) {
    return { error: 'DISCORD_OPPORTUNITIES_CHANNEL_ID not set' }
  }

  let message = `📊 **Weekly Opportunity Report** 📊\n`
  message += `*Week of ${new Date().toLocaleDateString()}*\n`
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`
  
  const categories = [
    { name: 'products', fn: getTrendingProducts, emoji: '🛍️' },
    { name: 'services', fn: getInDemandServices, emoji: '💼' },
    { name: 'digital', fn: getDigitalProductIdeas, emoji: '💻' }
  ]
  
  for (const cat of categories) {
    const data = await cat.fn()
    message += `${cat.emoji} **${data.category}**\n`
    
    if (data.ideas?.length) {
      for (const idea of data.ideas.slice(0, 2)) {
        message += `• ${idea.title}\n`
      }
    }
    message += '\n'
    await new Promise(r => setTimeout(r, 500))
  }
  
  message += `*Reply to get detailed info on any category!*`
  
  return postToDiscord(channelId, message)
}

// Cron configuration
export const opportunityCronConfig = {
  dailyOpportunity: {
    schedule: '0 8 * * *', // 8 AM daily
    handler: runDailyOpportunityUpdate,
    description: 'Daily money-making opportunity post',
    timezone: 'America/New_York'
  },
  weeklyReport: {
    schedule: '0 10 * * 0', // 10 AM Sundays
    handler: runWeeklyOpportunityReport,
    description: 'Weekly comprehensive opportunity report',
    timezone: 'America/New_York'
  }
}

// Skill metadata
export const moneyMakerInfo = {
  name: 'money-maker',
  version: '1.0.0',
  description: 'Finds trending products, services, and money-making opportunities',
  requires: ['BRAVE_SEARCH_API_KEY'],
  optional: ['DISCORD_BOT_TOKEN', 'DISCORD_OPPORTUNITIES_CHANNEL_ID'],
  functions: [
    { name: 'getTrendingProducts', description: 'Find trending products to sell' },
    { name: 'getInDemandServices', description: 'Find services in high demand' },
    { name: 'getSideHustleIdeas', description: 'Get side hustle ideas' },
    { name: 'getDigitalProductIdeas', description: 'Find digital product opportunities' },
    { name: 'getAffiliateOpportunities', description: 'Find affiliate programs' },
    { name: 'getFullOpportunityReport', description: 'Comprehensive opportunity report' }
  ],
  cron: opportunityCronConfig
}
