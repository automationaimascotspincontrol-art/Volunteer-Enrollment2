"""
Gemini AI Service for Report Generation
Uses REST API directly for maximum compatibility
"""

import aiohttp
import asyncio
from typing import Dict, Optional
from datetime import datetime
import json
from app.core.config import settings

def serialize_datetime(obj):
    """Helper to serialize datetime objects to ISO format"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    return obj

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        
        if not self.api_key or self.api_key == "your_api_key_here":
            raise ValueError("GEMINI_API_KEY not configured in .env file")
        
        # Use v1beta text generation endpoint (more widely available in free tier)
        self.api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateText"
    
    async def _generate_content(self, prompt: str) -> str:
        """Make API request to Gemini REST API"""
        timeout = aiohttp.ClientTimeout(total=60)  # 60 second timeout
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {"Content-Type": "application/json"}
            # Use text format instead of contents format
            payload = {
                "prompt": {
                    "text": prompt
                }
            }
            
            url = f"{self.api_url}?key={self.api_key}"
            
            try:
                print(f"[DEBUG] Calling Gemini API: {self.api_url}")
                async with session.post(url, json=payload, headers=headers) as response:
                    response_text = await response.text()
                    print(f"[DEBUG] Response status: {response.status}")
                    print(f"[DEBUG] Response text (first 500 chars): {response_text[:500]}")
                    
                    if response.status != 200:
                        # If text endpoint doesn't work, return helpful error
                        raise Exception(f"Gemini API not accessible with free tier. Consider upgrading to paid tier or using alternative: {response_text[:500]}")
                    
                    data = json.loads(response_text)
                    print(f"[DEBUG] Parsed JSON keys: {data.keys() if isinstance(data, dict) else 'not a dict'}")
                    
                    # Extract text from response - try multiple formats
                    if "candidates" in data and len(data["candidates"]) > 0:
                        candidate = data["candidates"][0]
                        # Try output field first
                        if "output" in candidate:
                            result = candidate["output"]
                            print(f"[DEBUG] Successfully extracted text ({len(result)} chars)")
                            return result
                        # Try content field
                        if "content" in candidate:
                            result = candidate["content"]
                            print(f"[DEBUG] Successfully extracted text ({len(result)} chars)")
                            return result
                    
                    raise Exception(f"Gemini API response format not compatible with free tier. Response: {response_text[:1000]}")
            except aiohttp.ClientError as e:
                print(f"[DEBUG] Network error: {str(e)}")
                raise Exception(f"Network error calling Gemini API: {str(e)}")
            except asyncio.TimeoutError:
                print(f"[DEBUG] Timeout error")
                raise Exception("Gemini API request timed out after 60 seconds")
            except Exception as e:
                print(f"[DEBUG] Unexpected error: {str(e)}")
                raise
    
    async def generate_overall_summary(self, data: Dict) -> str:
        """Generate overall system summary report"""
        serialized_data = serialize_datetime(data)
        prompt = f"""
You are a professional data analyst creating an executive summary report for a volunteer recruitment management system.

**System Data:**
{json.dumps(serialized_data, indent=2)}

**Instructions:**
- Provide a concise executive summary (3-5 paragraphs)
- Highlight key metrics and trends
- Identify any concerns or areas for improvement
- Make actionable recommendations
- Use professional business language
- Focus on insights, not just numbers

Generate a comprehensive summary report:
"""
        return await self._generate_content(prompt)
    
    async def generate_volunteer_insights(self, data: Dict) -> str:
        """Generate volunteer-focused insights"""
        serialized_data = serialize_datetime(data)
        prompt = f"""
You are a volunteer recruitment analyst analyzing volunteer data for insights.

**Volunteer Data:**
{json.dumps(serialized_data, indent=2)}

**Analysis Focus:**
1. Volunteer demographics and distribution
2. Pre-screening vs approved conversion rates
3. Volunteer retention and engagement patterns
4. Availability and capacity trends
5. Geographic distribution (if applicable)

**Instructions:**
- Provide deep insights into volunteer patterns
- Identify recruitment bottlenecks
- Suggest strategies to improve volunteer retention
- Highlight successful trends to replicate
- Use data-driven language with specific numbers

Generate a detailed volunteer insights report:
"""
        return await self._generate_content(prompt)
    
    async def generate_study_performance(self, data: Dict) -> str:
        """Generate study performance analysis"""
        serialized_data = serialize_datetime(data)
        prompt = f"""
You are analyzing study/project performance for a research volunteer management system.

**Study Data:**
{json.dumps(serialized_data, indent=2)}

**Analysis Focus:**
1. Study completion rates and timeline adherence
2. Volunteer allocation efficiency
3. Upcoming vs ongoing vs completed studies
4. Calendar capacity analysis
5. Study success patterns

**Instructions:**
- Analyze study performance metrics
- Identify scheduling conflicts or capacity issues
- Provide timeline predictions for ongoing studies
- Recommend optimization strategies
- Highlight successful study patterns

Generate a comprehensive study performance report:
"""
        return await self._generate_content(prompt)
    
    async def generate_custom_report(self, custom_prompt: str, data: Dict) -> str:
        """Generate custom report based on user's specific question"""
        serialized_data = serialize_datetime(data)
        prompt = f"""
You are a data analyst for a volunteer recruitment management system. Answer the following question based on the provided data.

**User Question:**
{custom_prompt}

**Available Data:**
{json.dumps(serialized_data, indent=2)}

**Instructions:**
- Answer the question directly and concisely
- Use specific data points from the provided information
- If the data is insufficient, state what additional information is needed
- Provide actionable insights when possible

Your answer:
"""
        return await self._generate_content(prompt)

# Singleton instance
gemini_service = None

def get_gemini_service() -> GeminiService:
    """Get or create Gemini service instance"""
    global gemini_service
    if gemini_service is None:
        gemini_service = GeminiService()
    return gemini_service
