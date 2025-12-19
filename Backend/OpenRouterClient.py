import requests
import json
import os
from typing import List, Dict, Optional, Union


class OpenRouterClient:
    """Client for interacting with OpenRouter API"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "tngtech/deepseek-r1t2-chimera:free",
        site_url: Optional[str] = None,
        site_name: Optional[str] = None
    ):
        """
        Initialize OpenRouter client
        
        Args:
            api_key: OpenRouter API key (defaults to OPENROUTER_API_KEY env var)
            model: Model identifier
            site_url: Optional site URL for rankings
            site_name: Optional site name for rankings
        """
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("API key must be provided or set in OPENROUTER_API_KEY environment variable")
        
        self.model = model
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.site_url = site_url
        self.site_name = site_name
        
    def _get_headers(self) -> Dict[str, str]:
        """Build request headers"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        if self.site_url:
            headers["HTTP-Referer"] = self.site_url
        if self.site_name:
            headers["X-Title"] = self.site_name
            
        return headers
    
    def send_message(
        self,
        message: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict:
        """
        Send a single message to the model
        
        Args:
            message: User message content
            system_prompt: Optional system prompt to set context/behavior
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens in response
            **kwargs: Additional parameters to pass to API
            
        Returns:
            API response as dictionary
        """
        messages = []
        
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        
        messages.append({"role": "user", "content": message})
        return self.chat(messages, temperature=temperature, max_tokens=max_tokens, **kwargs)
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        **kwargs
    ) -> Dict:
        """
        Send a conversation to the model
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens in response
            stream: Whether to stream the response
            **kwargs: Additional parameters to pass to API
            
        Returns:
            API response as dictionary
        """
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            **kwargs
        }
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stream:
            payload["stream"] = True
        
        try:
            response = requests.post(
                url=self.base_url,
                headers=self._get_headers(),
                data=json.dumps(payload),
                timeout=120
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "status_code": getattr(e.response, 'status_code', None)}
    
    def get_response_text(self, response: Dict) -> Optional[str]:
        """
        Extract text content from API response
        
        Args:
            response: API response dictionary
            
        Returns:
            Response text or None if error
        """
        if "error" in response:
            print(f"Error: {response['error']}")
            return None
        
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            print(f"Error parsing response: {e}")
            return None
    
    def analyze_data(
        self,
        data: str,
        instruction: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        **kwargs
    ) -> Dict:
        """
        Analyze data with specific instructions (useful for manufacturing data)
        
        Args:
            data: Data to analyze (CSV, JSON, text, etc.)
            instruction: What to do with the data
            system_prompt: Optional system context
            temperature: Lower for more focused analysis
            **kwargs: Additional parameters
            
        Returns:
            API response as dictionary
        """
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        user_message = f"{instruction}\n\nData:\n{data}"
        messages.append({"role": "user", "content": user_message})
        
        return self.chat(messages, temperature=temperature, **kwargs)


# Convenience functions for quick usage
def create_client(
    api_key: Optional[str] = None,
    model: str = "tngtech/deepseek-r1t2-chimera:free"
) -> OpenRouterClient:
    """Create and return an OpenRouter client instance"""
    return OpenRouterClient(api_key=api_key, model=model)


def quick_chat(message: str, api_key: Optional[str] = None) -> str:
    """
    Quick single message - returns just the text response
    
    Args:
        message: Message to send
        api_key: Optional API key (uses env var if not provided)
        
    Returns:
        Response text
    """
    client = create_client(api_key=api_key)
    response = client.send_message(message)
    return client.get_response_text(response) or "Error: No response"


if __name__ == "__main__":
    print("Testing OpenRouter connection...\n")
    
    # Method 1: Using the class
    client = create_client()
    response = client.send_message("What is 2+2?")
    print("Response:", client.get_response_text(response))
    
    # Method 2: Quick chat
    # answer = quick_chat("Explain context windows in one sentence")
    # print("\nQuick answer:", answer)