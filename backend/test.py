import os
from groq import Groq

client = Groq(api_key=os.environ["GROQ_API_KEY"])

# Fetch and print all accessible model IDs
models = client.models.list()
for model in models.data:
    print(model.id)

response = client.chat.completions.create(
    model="openai/gpt-oss-20b",
    messages=[{"role": "user", "content": "Say hello in one sentence."}]
)
print(response.choices[0].message.content)