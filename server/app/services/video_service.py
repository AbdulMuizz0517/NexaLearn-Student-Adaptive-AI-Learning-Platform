"""
YouTube video search service using httpx to scrape YouTube search results.
Returns actual video URLs (with video IDs) for embedding.
"""

import httpx
import re
import json
import urllib.parse


def search_youtube_links(query: str, max_results: int = 3) -> list[dict]:
    """Search YouTube and return list of result dicts with real video URLs."""
    try:
        # Use YouTube's internal API via a search page scrape
        safe_query = urllib.parse.quote_plus(query)
        search_url = f"https://www.youtube.com/results?search_query={safe_query}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        
        response = httpx.get(search_url, headers=headers, timeout=10.0, follow_redirects=True)
        html = response.text
        
        # Extract ytInitialData JSON from the page
        match = re.search(r"var ytInitialData\s*=\s*({.*?});\s*</script>", html, re.DOTALL)
        if not match:
            # Try alternative pattern
            match = re.search(r"ytInitialData\s*=\s*({.*?});\s*", html, re.DOTALL)
        
        if not match:
            print("Could not find ytInitialData in YouTube response")
            return _fallback_search(query, max_results)
        
        data = json.loads(match.group(1))
        
        # Navigate the JSON to find video renderers
        videos = []
        try:
            contents = data["contents"]["twoColumnSearchResultsRenderer"]["primaryContents"]["sectionListRenderer"]["contents"]
            for section in contents:
                items = section.get("itemSectionRenderer", {}).get("contents", [])
                for item in items:
                    renderer = item.get("videoRenderer")
                    if renderer and len(videos) < max_results:
                        video_id = renderer.get("videoId", "")
                        title_runs = renderer.get("title", {}).get("runs", [])
                        title = title_runs[0].get("text", "") if title_runs else "Video"
                        
                        # Get thumbnail
                        thumbnails = renderer.get("thumbnail", {}).get("thumbnails", [])
                        thumbnail = thumbnails[-1].get("url", "") if thumbnails else ""
                        
                        videos.append({
                            "title": title,
                            "link": f"https://www.youtube.com/watch?v={video_id}",
                            "thumbnail": thumbnail,
                        })
        except (KeyError, IndexError, TypeError) as e:
            print(f"Error parsing YouTube data: {e}")
            return _fallback_search(query, max_results)
        
        return videos if videos else _fallback_search(query, max_results)
        
    except Exception as exc:
        print(f"Error searching YouTube: {exc}")
        return _fallback_search(query, max_results)


def _fallback_search(query: str, max_results: int = 3) -> list[dict]:
    """Fallback: try using a simpler method to get video links."""
    try:
        # Try fetching the search page and extracting video IDs with a simpler regex
        safe_query = urllib.parse.quote_plus(query)
        search_url = f"https://www.youtube.com/results?search_query={safe_query}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }
        response = httpx.get(search_url, headers=headers, timeout=10.0, follow_redirects=True)
        html = response.text
        
        # Find video IDs in the page
        video_ids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
        # Deduplicate while preserving order
        seen = set()
        unique_ids = []
        for vid in video_ids:
            if vid not in seen:
                seen.add(vid)
                unique_ids.append(vid)
                if len(unique_ids) >= max_results:
                    break
        
        # Extract titles if possible
        videos = []
        for vid in unique_ids:
            # Try to find the title near this video ID
            title_match = re.search(
                rf'"videoId":"{vid}".*?"title":\s*\{{"runs":\s*\[\{{"text":\s*"([^"]+)"',
                html
            )
            title = title_match.group(1) if title_match else f"Video about {query}"
            
            videos.append({
                "title": title,
                "link": f"https://www.youtube.com/watch?v={vid}",
                "thumbnail": f"https://img.youtube.com/vi/{vid}/hqdefault.jpg",
            })
        
        return videos
        
    except Exception as exc:
        print(f"Fallback YouTube search also failed: {exc}")
        return []
