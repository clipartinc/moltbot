/**
 * OpenClaw Skill: Scheduled Trends Reporter
 * Automatically posts trend updates to a Discord channel
 * 
 * Setup:
 * 1. Set DISCORD_TRENDS_CHANNEL_ID in environment variables
 * 2. Set DISCORD_BOT_TOKEN if not already configured
 * 3. Configure cron schedule (default: every hour)
 */

import { getTrendingNews, getBreakingMarketNews, formatTrendReport } from './news-crawler.js'

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || ''
const TRENDS_CHANNEL_ID = process.env.DISCORD_TRENDS_CHANNEL_ID || ''
const ALERTS_CHANNEL_ID = process.env.DISCORD_ALERTS_CHANNEL_ID || ''
const MARKET_CHANNEL_ID = process.env.DISCORD_MARKET_CHANNEL_ID || ''

/**
 * Post a message to Discord channel
 */
async function postToDiscord(channelId, content) {
  if (!DISCORD_BOT_TOKEN) {
    console.error('DISCORD_BOT_TOKEN not configured')
    return { error: 'No Discord token' }
  }

  if (!channelId) {
    console.error('No channel ID provided')
    return { error: 'No channel ID' }
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

  if (!resp.ok) {
    const error = await resp.text()
    console.error('Discord post failed:', error)
    return { error: `Discord API error: ${resp.status}` }
  }

  return { success: true }
}

/**
 * Generate hourly trend report
 */
export async function generateHourlyTrends() {
  const now = new Date()
  const hour = now.getHours()
  
  // Determine which category to focus on based on time
  let category = 'markets'
  if (hour >= 6 && hour < 9) category = 'markets'      // Pre-market
  else if (hour >= 9 && hour < 16) category = 'markets' // Market hours
  else if (hour >= 16 && hour < 18) category = 'markets' // After hours
  else category = 'tech' // Evening/night - tech news
  
  const trends = await getTrendingNews(category)
  const breaking = await getBreakingMarketNews()
  
  return {
    timestamp: now.toISOString(),
    hour,
    category,
    trends,
    breaking: breaking.slice(0, 5)
  }
}

/**
 * Format trends for Discord with embeds-style formatting
 */
export function formatHourlyUpdate(data) {
  const time = new Date(data.timestamp)
  const timeStr = time.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/New_York'
  })
  
  let message = `📊 **Hourly Trends Update** - ${timeStr} ET\n`
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`
  
  // Trending topics
  if (data.trends?.trends?.topics?.length) {
    message += '🔥 **Trending Topics:**\n'
    for (const t of data.trends.trends.topics.slice(0, 5)) {
      const bar = '█'.repeat(Math.min(t.mentions, 10))
      message += `\`${bar}\` ${t.topic} (${t.mentions})\n`
    }
    message += '\n'
  }

  // Hot tickers
  if (data.trends?.trends?.tickers?.length) {
    message += '📈 **Hot Tickers:**\n'
    const tickers = data.trends.trends.tickers.slice(0, 5)
      .map(t => `**$${t.ticker}** (${t.mentions})`)
      .join(' • ')
    message += tickers + '\n\n'
  }

  // Breaking news
  if (data.breaking?.length) {
    message += '⚡ **Breaking News:**\n'
    for (const article of data.breaking.slice(0, 3)) {
      message += `• ${article.title}\n`
      if (article.tickers?.length) {
        message += `  └ Tickers: ${article.tickers.slice(0, 3).join(', ')}\n`
      }
    }
    message += '\n'
  }

  // Top stories with links
  if (data.trends?.topArticles?.length) {
    message += '📰 **Top Stories:**\n'
    for (const a of data.trends.topArticles.slice(0, 3)) {
      message += `• [${a.title.slice(0, 80)}${a.title.length > 80 ? '...' : ''}](${a.url})\n`
      message += `  └ *${a.source}* - ${a.age}\n`
    }
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`
  message += `*Next update in 1 hour*`
  
  return message
}

/**
 * Run the hourly trend update and post to Discord
 */
export async function runHourlyTrendUpdate() {
  console.log('[Trends] Starting hourly update...')
  
  if (!TRENDS_CHANNEL_ID) {
    console.error('[Trends] DISCORD_TRENDS_CHANNEL_ID not set')
    return { error: 'Channel ID not configured' }
  }

  try {
    const data = await generateHourlyTrends()
    const message = formatHourlyUpdate(data)
    
    const result = await postToDiscord(TRENDS_CHANNEL_ID, message)
    
    if (result.success) {
      console.log('[Trends] Posted hourly update successfully')
    }
    
    return result
  } catch (error) {
    console.error('[Trends] Error:', error.message)
    return { error: error.message }
  }
}

/**
 * Run market open summary (9:30 AM ET) - posts to market-open channel
 */
export async function runMarketOpenSummary() {
  console.log('[Market] Generating market open summary...')
  
  const channelId = MARKET_CHANNEL_ID || TRENDS_CHANNEL_ID
  if (!channelId) {
    return { error: 'No market channel configured' }
  }
  
  const trends = await getTrendingNews('markets')
  const breaking = await getBreakingMarketNews()
  
  let message = `🔔 **Market Open Summary** - ${new Date().toLocaleDateString()}\n`
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`
  message += formatTrendReport(trends)
  
  if (breaking.length) {
    message += '\n⚡ **Pre-Market Headlines:**\n'
    for (const a of breaking.slice(0, 5)) {
      message += `• ${a.title}\n`
    }
  }
  
  message += '\n*Good luck trading today!* 📈'
  
  return postToDiscord(channelId, message)
}

/**
 * Run market close summary (4:00 PM ET) - posts to market-open channel
 */
export async function runMarketCloseSummary() {
  console.log('[Market] Generating market close summary...')
  
  const channelId = MARKET_CHANNEL_ID || TRENDS_CHANNEL_ID
  if (!channelId) {
    return { error: 'No market channel configured' }
  }
  
  const categories = ['markets', 'tech', 'options']
  let message = `🔔 **Market Close Summary** - ${new Date().toLocaleDateString()}\n`
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`
  
  for (const cat of categories) {
    const trends = await getTrendingNews(cat)
    if (trends.trends?.topics?.length) {
      message += `**${cat.toUpperCase()}:**\n`
      for (const t of trends.trends.topics.slice(0, 3)) {
        message += `• ${t.topic} (${t.mentions})\n`
      }
      message += '\n'
    }
    await new Promise(r => setTimeout(r, 300))
  }
  
  message += '*See you tomorrow!* 🌙'
  
  return postToDiscord(channelId, message)
}

/**
 * Post breaking news alert - posts to alerts channel
 */
export async function postBreakingAlert(headline, tickers = [], urgency = 'normal') {
  console.log('[Alerts] Posting breaking alert...')
  
  const channelId = ALERTS_CHANNEL_ID || TRENDS_CHANNEL_ID
  if (!channelId) {
    return { error: 'No alerts channel configured' }
  }
  
  const emoji = urgency === 'high' ? '🚨' : '⚡'
  let message = `${emoji} **BREAKING** ${emoji}\n\n`
  message += `${headline}\n`
  
  if (tickers.length) {
    message += `\n📊 **Related Tickers:** ${tickers.map(t => `$${t}`).join(' ')}\n`
  }
  
  message += `\n*${new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} ET*`
  
  return postToDiscord(channelId, message)
}

/**
 * Check for breaking news and post alerts (runs every 15 mins)
 */
export async function checkAndPostAlerts() {
  console.log('[Alerts] Checking for breaking news...')
  
  const channelId = ALERTS_CHANNEL_ID
  if (!channelId) {
    return { skipped: true, reason: 'No alerts channel configured' }
  }
  
  const breaking = await getBreakingMarketNews()
  
  // Filter for very recent news (within last 30 mins)
  const recent = breaking.filter(article => {
    if (article.published) {
      const pubTime = new Date(article.published)
      const age = Date.now() - pubTime.getTime()
      return age < 30 * 60 * 1000 // 30 minutes
    }
    return article.age?.includes('minute') || article.age?.includes('Just now')
  })
  
  if (recent.length === 0) {
    return { posted: 0, reason: 'No breaking news' }
  }
  
  // Post top breaking story
  const top = recent[0]
  let message = `⚡ **Breaking News**\n\n`
  message += `**${top.title}**\n`
  message += `*${top.source}*\n`
  
  if (top.tickers?.length) {
    message += `\n📊 ${top.tickers.slice(0, 5).map(t => `$${t}`).join(' ')}`
  }
  
  if (top.url) {
    message += `\n\n[Read more](${top.url})`
  }
  
  await postToDiscord(channelId, message)
  
  return { posted: 1 }
}

// Cron schedule configuration
export const cronConfig = {
  hourlyTrends: {
    schedule: '0 * * * *', // Every hour at :00
    handler: runHourlyTrendUpdate,
    description: 'Post hourly trend update to #trends'
  },
  marketOpen: {
    schedule: '30 9 * * 1-5', // 9:30 AM ET, Mon-Fri
    handler: runMarketOpenSummary,
    description: 'Market open summary to #market-open',
    timezone: 'America/New_York'
  },
  marketClose: {
    schedule: '0 16 * * 1-5', // 4:00 PM ET, Mon-Fri
    handler: runMarketCloseSummary,
    description: 'Market close summary to #market-open',
    timezone: 'America/New_York'
  },
  breakingAlerts: {
    schedule: '*/15 * * * 1-5', // Every 15 mins, Mon-Fri
    handler: checkAndPostAlerts,
    description: 'Check and post breaking news to #alerts',
    timezone: 'America/New_York'
  }
}

// Skill metadata
export const scheduledTrendsInfo = {
  name: 'scheduled-trends',
  version: '1.0.0',
  description: 'Automatically posts trend updates to Discord on a schedule',
  requires: ['BRAVE_SEARCH_API_KEY', 'DISCORD_BOT_TOKEN'],
  optional: ['DISCORD_TRENDS_CHANNEL_ID', 'DISCORD_ALERTS_CHANNEL_ID', 'DISCORD_MARKET_CHANNEL_ID', 'POLYGON_API_KEY'],
  channels: {
    trends: 'DISCORD_TRENDS_CHANNEL_ID - Hourly trend updates',
    alerts: 'DISCORD_ALERTS_CHANNEL_ID - Breaking news alerts (every 15 mins)',
    market: 'DISCORD_MARKET_CHANNEL_ID - Market open/close summaries'
  },
  cron: cronConfig,
  functions: [
    { name: 'runHourlyTrendUpdate', description: 'Post hourly trends to #trends' },
    { name: 'runMarketOpenSummary', description: 'Post market open summary to #market-open' },
    { name: 'runMarketCloseSummary', description: 'Post market close summary to #market-open' },
    { name: 'checkAndPostAlerts', description: 'Check and post breaking news to #alerts' },
    { name: 'postBreakingAlert', description: 'Manually post a breaking alert' }
  ]
}
