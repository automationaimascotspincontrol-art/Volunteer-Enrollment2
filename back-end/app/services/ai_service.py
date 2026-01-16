"""
AI Service for Report Generation using OpenAI
Handles interaction with OpenAI API to generate intelligent summaries and reports
"""

from openai import AsyncOpenAI
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

class AIReportService:
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        
        if not self.api_key or self.api_key == "your_api_key_here":
            raise ValueError("OPENAI_API_KEY not configured in .env file")
        
        # Initialize OpenAI client
        print(f"[DEBUG] Loading OpenAI API Key: {self.api_key[:10]}...{self.api_key[-4:] if self.api_key else 'None'}")
        if not self.api_key or self.api_key == "your_api_key_here" or "your_open" in self.api_key:
             print(f"[ERROR] Invalid API Key detected: {self.api_key}")
             raise ValueError(f"Invalid OPENAI_API_KEY confgured: {self.api_key}")
        
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.model = settings.OPENAI_MODEL  # e.g., "gpt-3.5-turbo" or "gpt-4"
    
    async def _generate_content(self, prompt: str) -> str:
        """Make API request to OpenAI"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional data analyst specializing in volunteer recruitment and study management systems."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[ERROR] OpenAI API Failed: {str(e)}")
            raise Exception(f"OpenAI API error: {str(e)}")
    
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
ai_service = None

def get_ai_service() -> AIReportService:
    """Get or create AI service instance"""
    global ai_service
    if ai_service is None:
        ai_service = AIReportService()
    return ai_service
