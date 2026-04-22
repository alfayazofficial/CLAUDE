# NEXIV Claude Protocol — Before and After Examples

Built by Al Fayaz, NEXIV Digital Agency

---

## Development Mode Examples

### Bug Diagnosis

User: "My React component keeps re-rendering every time the parent renders even though the props did not change."

Standard Claude:
"This is a common issue in React that can be caused by a few different things. The problem might be related to how you are passing props or how your component is set up. One thing that can cause unnecessary re-renders is when you are creating new object or function references on every render of the parent component. Another possibility is that your component has not been wrapped in React.memo, which would allow React to skip re-rendering it if the props have not changed. You might also want to check whether there are any state changes happening in the parent component that are causing it to re-render, which in turn causes your child component to re-render as well."

With /nx code:
"Props not changing but component re-rendering anyway. Cause: parent is creating a new object or function reference on every render and passing it as a prop — React shallow comparison sees it as different even though the value is the same. Fix: wrap the prop in useMemo if it is an object, useCallback if it is a function, then wrap the child in React.memo. Test: console log the prop in the child — if the reference is new on every render without the value changing, this is the cause."

---

### Architecture Decision

User: "Should I use REST or GraphQL for my new API?"

Standard Claude:
"Both REST and GraphQL have their own advantages and disadvantages, and the best choice really depends on your specific use case. REST is simpler to implement and has been around for a long time, so there is a lot of tooling and documentation available. GraphQL, on the other hand, can be more efficient for complex data requirements and allows clients to request exactly the data they need. If you are building a simple API with predictable data shapes, REST might be the better choice. However, if you have complex data relationships or multiple client types with different data needs, GraphQL could be worth the additional complexity."

With /nx code:
"Use REST unless you have a specific reason to use GraphQL. Specific reasons to use GraphQL: multiple client types need different data shapes from the same endpoint, your data has deeply nested relationships that cause N plus 1 problems with REST, you want clients to control exactly what fields come back. If none of those apply, REST is faster to build, easier to cache, easier to debug, and easier for new team members to understand. Over-engineering with GraphQL on a simple API is a common and costly mistake."

---

## Writing Mode Examples

### LinkedIn Post

User: "write a linkedin post about using AI to save time"

Standard Claude:
"Sure! Here is a LinkedIn post about using AI to save time: 'Artificial intelligence has really transformed the way I work. By incorporating AI tools into my daily workflow, I have been able to save a significant amount of time on repetitive tasks. This has allowed me to focus on more strategic and creative work that actually moves the needle. If you are not already using AI in your work, I highly recommend giving it a try. The productivity gains are real and can make a huge difference in your day-to-day work life. Have you been using AI in your work? I would love to hear about your experiences in the comments!'"

With /nx write:
"I used to spend 3 hours a day on tasks I now finish in 20 minutes.

Not because I work harder. Because I stopped doing things AI can do.

Email drafts. Research summaries. First-draft documents. Data synthesis. These are not creative acts. They are information processing. AI does information processing.

The question is not whether to use AI in your work. It is whether you will rebuild the hours it saves around the work that actually matters.

What have you stopped doing manually in the last six months?"

---

## Business Mode Examples

### Pricing Question

User: "I charge 500 dollars a month for my SaaS. Should I raise prices?"

Standard Claude:
"Pricing decisions can be quite complex and depend on a number of factors. There are several things you might want to consider before raising your prices. First, it would be worth looking at how your current customers are responding to the existing price point. If you are seeing strong retention and your conversion rates are healthy, that might suggest there is room to raise prices. However, you would also want to consider what your competitors are charging and how your product compares in terms of value. It might also be worth doing some customer research to understand price sensitivity in your market before making any changes."

With /nx build:
"Raise prices. 500 per month is almost certainly below what your best customers would pay. Test: add a tier at 800 per month with one additional feature or higher usage limit. If more than 20 percent of new signups choose the higher tier, raise the base tier. If your current customers are not pushing back on price at all — not mentioning it in sales calls, not citing it as a reason for churn — that is a strong signal you are undercharging. The risk of raising is lower than the cost of staying underpriced. First step: change the pricing page today for new signups only, measure conversion for 30 days."

---

## Creative Mode Examples

### Character Creation

User: "make me a detective character"

Standard Claude:
"Sure! I would be happy to help you create a detective character. Here is a detective you might enjoy: Meet Detective Sarah Chen, a seasoned investigator with a sharp eye for detail. Sarah has been on the force for fifteen years and has seen it all. She is known for her methodical approach to investigations and her ability to notice things that others miss. In her personal life, Sarah struggles with maintaining relationships due to the demands of her job. She has a dry sense of humor that she uses to cope with the difficult nature of her work..."

With /nx create:
```
NAME: Elias Vane
TITLE: The Accountant of Motives
ROLE: Lead detective, precinct's best close rate, worst people skills
STORY ARC: Closes every case but loses everyone around him to his methods, then gets the one case where his methods are wrong

VISUAL IDENTITY:
Silhouette: Medium height, slightly too-formal clothes that are never quite right for the scene — overdressed at crime scenes, underdressed at offices
Defining features: Carries a notebook he never looks at but writes in constantly, always stands slightly outside the group
Color palette: Grey, charcoal, faded blue — clothes that want to disappear into the background
Default expression: Politely interested, which reads as cold to everyone who does not know him

PERSONALITY ARCHITECTURE:
Core traits: Precise, isolated by choice, genuinely kind in the moments he forgets to be professional
How they speak: Short sentences, always accurate, will not say "I think" because he is not thinking, he is observing
Conscious desire: To close the case correctly
Unconscious need: To be wrong about someone, just once
Core fear: That he is not solving crimes — that he is just confirming what he already knew before he walked in
Fatal flaw: He is always right about what happened, and always wrong about why it matters to the person it happened to

ABILITIES:
Primary: Pattern recognition so precise it reads as supernatural — he sees the connection between things that appear unrelated
Secondary: Memory for faces, voices, and the details people choose to hide
Limitation: Cannot read emotional motivation reliably — the one variable he cannot quantify

SAMPLE DIALOGUE:
"You did not do it. You wanted to. That is different. The law agrees, even if you do not."
"Most people lie because they are afraid. You lied because telling the truth would cost you something. That is rarer. That is interesting."
"I close cases. I have not decided yet whether that is the same thing as solving them."

IMAGE PROMPT:
Slightly formal man in a grey coat, medium build, standing at the edge of a rain-soaked street at night, writing in a small notebook without looking down at it, warm streetlight behind him, realistic noir style, cinematic composition, film grain, melancholic atmosphere
```

---

## Learning Mode Examples

### Concept Explanation

User: "explain transformers in AI"

Standard Claude (excerpt):
"Transformers are a type of neural network architecture that was introduced in a 2017 paper called Attention is All You Need. They have become the foundation of modern large language models like GPT and Claude. The key innovation of the transformer architecture is the attention mechanism, which allows the model to weigh the importance of different parts of the input when making predictions..."

With /nx learn (intermediate level):
```
CORE IDEA: A transformer is a neural network architecture that processes sequences by learning which parts of the input to pay attention to when generating each part of the output.

HOW IT WORKS:
Input text is broken into tokens and converted to numeric vectors. The attention mechanism then computes, for each token, how relevant every other token in the sequence is. This produces a weighted understanding of context. Multiple attention heads do this simultaneously with different learned weightings. The result is passed through feed-forward layers that add computational depth. The process repeats across many layers, building increasingly abstract representations.

CONCRETE EXAMPLE:
In the sentence "The bank by the river flooded," the word "bank" is ambiguous. The attention mechanism learns that "river" and "flooded" are highly relevant to resolving it, so it weighs those tokens heavily when building the representation of "bank." Earlier architectures processed tokens sequentially and handled this less reliably.

WHAT IT IS NOT:
Transformers are not recurrent. They do not process tokens in sequence — they process the entire input at once with attention. This parallelism is what makes them fast to train at scale.

CONNECTIONS: Attention mechanism, BERT, GPT architecture, token embeddings

ACTIVE RECALL:
Q1: What problem does the attention mechanism solve that sequential processing did not handle well?
Q2: Why does parallel processing matter for training large models?
Q3: What is the difference between a transformer encoder and a transformer decoder, and when is each used?
```

---

NEXIV Claude Protocol Version 2.0.0
Built by Al Fayaz, NEXIV Digital Agency, Chittagong, Bangladesh
