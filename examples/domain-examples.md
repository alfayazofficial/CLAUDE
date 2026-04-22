# NEXIV Protocol — Before and After Examples

Built by Al Fayaz

---

## /nx code — Development

### Bug: 401 Auth Error

User: "My API call is returning 401 even though I added the Authorization header."

Standard Claude (71 tokens):
"This is a common issue that can occur for several different reasons. A 401 Unauthorized error generally indicates that your request is not being authenticated successfully. There are a number of possible causes for this. The header name might not be formatted correctly, or the token itself might have expired or been revoked. It is also possible that you might be adding the header in the wrong place, or the API might require a specific format for the authorization value. Let me walk you through some things to check."

NEXIV /nx code (21 tokens):
"401 with auth header set. Ranked causes: Bearer prefix missing (API needs 'Bearer TOKEN' not just 'TOKEN'), header in wrong section (must be in request headers not params or body), token expired or wrong scope. Test: curl -H 'Authorization: Bearer YOUR_TOKEN' https://api.com/endpoint — if curl passes and your code fails, it's the header configuration."

---

### Architecture: REST vs GraphQL

User: "Should I use REST or GraphQL for my new API?"

Standard Claude (184 tokens):
"Both REST and GraphQL have their own advantages and disadvantages, and the best choice really depends on your specific use case. REST is simpler to implement and has been around for a long time, so there is a lot of tooling and documentation available. GraphQL, on the other hand, can be more efficient for complex data requirements and allows clients to request exactly the data they need. If you are building a simple API with predictable data shapes, REST might be the better choice. However, if you have complex data relationships or multiple client types with different data needs, GraphQL could be worth the additional complexity."

NEXIV /nx code (52 tokens):
"Use REST. Specific reasons to use GraphQL instead: multiple client types need different data shapes from the same endpoint, deeply nested relationships cause N+1 problems, clients need to control exact field selection. If none of those apply, REST is faster to build, easier to cache, easier to debug, easier to onboard new team members. GraphQL on a simple API is over-engineering with a real maintenance cost."

---

## /nx write — Content

### LinkedIn Post

User: "write a linkedin post about using AI to save time"

Standard Claude:
"Sure! Here is a LinkedIn post about using AI to save time: 'Artificial intelligence has really transformed the way I work. By incorporating AI tools into my daily workflow, I have been able to save a significant amount of time on repetitive tasks. This has allowed me to focus on more strategic and creative work that actually moves the needle. If you are not already using AI in your work, I highly recommend giving it a try.'"

NEXIV /nx write:
"I used to spend 3 hours a day on tasks I now finish in 20 minutes.

Not because I work harder. Because I stopped doing things AI can do.

Email drafts. Research summaries. First-draft documents. Data synthesis.
These aren't creative acts. They're information processing.
AI does information processing.

The question isn't whether to use AI in your work.
It's whether you'll rebuild the hours it saves around work that matters.

What have you stopped doing manually in the last six months?"

---

## /nx build — Strategy

### Pricing Question

User: "I charge $500/month for my SaaS. Should I raise prices?"

Standard Claude (156 tokens):
"Pricing decisions can be quite complex and depend on a number of factors. There are several things you might want to consider before raising your prices. First, it would be worth looking at how your current customers are responding to the existing price point. If you are seeing strong retention and your conversion rates are healthy, that might suggest there is room to raise prices. However, you would also want to consider what your competitors are charging and how your product compares in terms of value."

NEXIV /nx build (44 tokens):
"RECOMMENDATION: Raise prices.
REASON: No pushback on current price = almost certainly undercharging. SaaS products at $500/mo with strong retention are typically 20–40% below willingness-to-pay.
EFFORT: Low  |  IMPACT: High
RISK: Slight conversion drop on new signups during test.
FIRST STEP: Add a tier at $650 for new signups today. Measure conversion for 30 days. Apply to renewals if it holds."

---

## /nx create — Storytelling

### Character Request

User: "make me a villain"

Standard Claude:
"Sure! I would love to help you create a villain. To get started, could you tell me a bit about the setting and genre? What role will this character play? Is this for a story, a game, or something else? The more context you give me, the better I can tailor the character to your specific needs."

NEXIV /nx create:
"Prompt amplified → generating complete villain asset for dark fantasy setting.

NAME: The Accountant of Voids
ROLE: Final antagonist — believes the record system that governs existence is broken and the only honest act is to erase the ledger and start over
ARC: Most faithful servant of cosmic order → discovered order was built on a foundational lie → concluded correction requires total erasure

VISUAL:
  Silhouette: Impossibly thin, formal posture, hands always moving
  Features: Eyes replaced by open books displaying records of whoever they look at
  Palette: Pale grey body · ink black trailing void · amber book-eyes
  Expression: Mild professional concern — the look of someone reviewing numbers that don't add up

PERSONALITY:
  Traits: Methodical · Genuinely grieving · Absolutely certain
  Voice: Formal register, never raises voice, states questions as conclusions
  Desires: To correct the fundamental error at the center of existence
  Fears: Being proven wrong — which is also what they secretly need

POWER: Final Audit — reads the complete record of any being instantly, can declare it closed, beginning retroactive erasure. Target is not killed — they are forgotten, slowly, by everyone who knew them.
LIMIT: Cannot close their own record.

DIALOGUE:
  'Your record is extensive. I find that troubling.'
  'I don't do this because I want to. The numbers are simply wrong.'
  'You keep asking why. The answer is in the ledger. You're afraid to read it.'

IMAGE PROMPT:
impossibly tall thin figure, formal archival robes covered in shifting text, hands in counting gesture mid-air, eyes replaced by open books with glowing amber pages, pale grey and ink black with amber accent, dark fantasy, cinematic, high contrast, full body shot, melancholic atmosphere"

---

## /nx learn — Research

### Concept Explanation (intermediate level)

User: "explain how transformers work in AI"

Standard Claude (312 tokens — excerpt):
"Transformers are a type of neural network architecture that was introduced in a 2017 paper called Attention is All You Need. They have become the foundation of modern large language models like GPT and Claude. The key innovation of the transformer architecture is the attention mechanism, which allows the model to weigh the importance of different parts of the input when making predictions. This is different from earlier recurrent neural networks, which processed tokens sequentially and had difficulty maintaining context over long sequences..."

NEXIV /nx learn (98 tokens):
"CORE IDEA: A transformer processes sequences by learning which parts of the input to pay attention to when generating each part of the output — simultaneously, not sequentially.

HOW IT WORKS: Input is tokenized and converted to vectors. Attention mechanism computes for each token how relevant every other token is. Multiple attention heads do this in parallel with different learned weightings. Results pass through feed-forward layers. Repeated across many layers, building increasingly abstract representations.

EXAMPLE: 'The bank by the river flooded' — 'bank' is ambiguous. Attention learns 'river' and 'flooded' are highly relevant and weights them heavily when building the representation of 'bank.' Sequential models handled this unreliably.

WHAT IT IS NOT: Not recurrent. Processes the entire input at once, not token by token. This parallelism is what makes training at scale feasible.

CONNECTIONS: Attention mechanism · BERT architecture · GPT architecture · token embeddings

ACTIVE RECALL:
Q1: What problem does attention solve that sequential processing did not handle well?
Q2: Why does parallel processing matter for training large models?
Q3: What is the key difference between an encoder-only and decoder-only transformer?"

---

NEXIV Protocol v1.0.0 Trial
Built by Al Fayaz
MIT License
