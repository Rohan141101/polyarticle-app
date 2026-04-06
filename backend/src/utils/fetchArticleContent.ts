import fetch from "node-fetch"
import { JSDOM } from "jsdom"
import { Readability } from "@mozilla/readability"

export async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    console.log("🌍 Fetching URL:", url)

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.log("⚠️ Non-200 response:", response.status)
      return null
    }

    const html = await response.text()

    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article || !article.textContent) {
      console.log("⚠️ Readability failed to extract content")
      return null
    }

    const cleaned = article.textContent
      .replace(/\s+/g, " ")
      .trim()

    return cleaned.slice(0, 10000) // Hard safety cap

  } catch (err: any) {
    if (err.name === "AbortError") {
      console.log("⏳ Fetch timeout for:", url)
    } else {
      console.log("⚠️ Fetch failed for:", url)
    }
    return null
  }
}