import os

from dotenv import load_dotenv
from google import genai

from app.services.gemini_agent import run_gemini_agent


result = run_gemini_agent(
    "I need earbuds under ₹5000 for gym"
)


print("\n==============================")
print("FLOWPAY AI AGENT RESULT")
print("==============================")

print("\nMessage:")
print(result["message"])

print("\nTool:")
print(result["tool_called"])

print("\nProducts:")
print(result["products_found"])

for product in result["recommendations"]:
    print(
        f"- {product['name']} "
        f"₹{product['price']}"
    )

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERROR: GEMINI_API_KEY was not found.")
    raise SystemExit(1)

print("API key found.")

client = genai.Client(api_key=api_key)

try:
    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input="Reply with exactly: FlowPay Gemini connection successful.",
    )

    print("\nGemini response:")
    print(interaction.output_text)

except Exception as error:
    print("\nGemini request failed:")
    print(error)