Figma UI Prompt — BaseConfess
Genel Konsept
Design a mobile-first Web3 social app called BaseConfess — an anonymous on-chain confessions platform built on Base network. The design must feel like a playful, flirty, confessions app — inspired by love-themed social apps (think Valentine's card meets crypto). Use soft pinks, warm whites, and subtle blush gradients. The vibe is: fun, lighthearted, slightly cheeky, and simple. No dark corporate Web3 aesthetic. This should feel warm and inviting, like a digital secret diary.

Renk Paleti
Primary Background:   #FFF0F5  (blush white)
Card Background:      #FFFFFF  (pure white)
Primary Accent:       #FF4D8D  (hot pink)
Secondary Accent:     #FF85B3  (soft pink)
Gradient:             linear-gradient(135deg, #FF4D8D → #FF85B3)
Text Primary:         #1A1A2E  (near black)
Text Secondary:       #9B8B95  (muted mauve)
Border:               #FFD6E7  (light pink border)
Like green:           #22C55E
Dislike red:          #EF4444
Tip gold:             #F59E0B
Tipografi
Font: "Plus Jakarta Sans" or "Nunito" (Google Fonts — round, friendly)
Heading:     Bold 24px
Subheading:  SemiBold 16px
Body:        Regular 14px
Caption:     Regular 12px
Wallet addr: Mono font, 11px
Ekranlar & Bileşenler
1. Header / Navigation Bar
Full-width, sticky top bar
Height: 60px
Background: white with soft pink bottom border #FFD6E7
Left: App logo — a small heart icon (🤍 or custom SVG) + bold text "BaseConfess" in #FF4D8D
Right: "Connect Wallet" button — pill shape, pink gradient background, white text, 36px height
When wallet connected: show truncated address 0x34...af2 in a pill with soft pink background #FFE4F0, pink text, small avatar circle
2. Hero Section (top of feed page)
Centered layout, padding top 32px
Large emoji: 🤫 (shushing face), 48px
Heading: "Confess Anonymously" — Bold 28px, dark color
Subtext: "Your secret lives on Base forever. No names. Just truth." — 14px muted mauve
Small badge below: pink pill that says "⛓ Powered by Base"
3. Post Confession Card
White card, rounded corners 20px, soft pink border #FFD6E7
Shadow: 0 4px 20px rgba(255, 77, 141, 0.08)
Top label: small pink dot (animated pulse) + "New Confession" text in pink
Textarea:
Placeholder: "What's your confession? It lives on Base forever... 🤫"
Rounded corners 14px, border #FFD6E7, focus border #FF4D8D
Light pink background #FFF8FB
4 rows tall
Character count bottom-right (e.g. "487 left") in muted pink
Hash preview line (below textarea):
Hash icon + monospace text 0x3fa9... + label "keccak256 · stored on-chain"
Very small, muted mauve, 11px
Fee notice:
Small info icon + "Posting fee: 0.000025 ETH on Base"
Muted text, blue-tinted accent for the ETH amount
Submit button:
Full width, 48px height, border-radius 14px
Pink gradient: #FF4D8D → #FF85B3
White bold text: "Confess Anonymously 🤫"
Subtle heart sparkle icon left of text
Hover: slightly lighter gradient
Disabled state: gray, "Connect wallet to confess"
Success state (inline):
Soft green banner: "✓ Confession posted on-chain. Your secret is eternal."
Error state: soft red banner with ✗ icon
4. Section Divider
Between post form and feed:
Thin pink line #FFD6E7 on both sides
Center text: "💬 Recent Confessions" — uppercase, 11px, letter-spacing wide, muted pink
5. Confession Feed
Vertical list of cards, 16px gap between cards
Top bar (above cards): small text "24 confessions" left + "↻ Refresh" right (muted pink link)
Loading skeleton: 3 cards with pulse animation, rounded shapes in #FFE4F0
Empty state: centered 🤫 emoji + "No confessions yet." + "Be the first to confess."
6. Confession Card
White card, border-radius 20px, border #FFD6E7
Shadow: 0 2px 12px rgba(255, 77, 141, 0.06)
Header row:
Left: small gradient circle avatar (pink→rose) with person silhouette icon + monospace wallet address 0x34...af2 in 11px muted mauve
Right: tiny pink pill badge "on-chain" + timestamp "3h ago" muted text
Confession text:
Dark text, 14px, 1.6 line-height, comfortable reading
Italic style, slightly larger — like a handwritten confession feel
Max 4 lines visible, fade out if longer with "read more" pink link
Footer row (bottom of card):
Left group:
👍 Like button — pill shape, when active: green tint background, green text + count
👎 Dislike button — pill shape, when active: red tint background, red text + count
If tips received > 0: small yellow pill "💸 5"
Right: "💸 Tip" button — pill shape, yellow/gold border, amber text, hover: gold fill
All buttons: 30px height, 12px font, rounded-full, subtle border
7. Tip Modal
Centered overlay modal, backdrop blur + dark overlay
Card: white, border-radius 24px, max-width 360px, padding 24px
Pink gradient top bar / accent line (4px height at top of card)
Header: "💸 Send a Tip" title + ✕ close button top-right
Subtitle: "ETH goes directly to the confession owner on-chain." muted text
Quick amount buttons: 3 pills side by side — "0.001" "0.005" "0.01"
Selected state: pink gradient background, white text
Unselected: white bg, pink border, pink text
Custom amount input:
Label: "Custom amount (ETH)"
Input: rounded, pink focus border, "ETH" suffix right-aligned in muted text
Action buttons:
"Cancel" — outline, full half-width
"Tip 0.001 ETH" — pink gradient, full half-width, white bold text
Success state: green checkmark circle, "Tip sent! 💸" text, Close button
8. Wrong Network Banner
Soft yellow/amber inline banner inside cards/form
⚠️ icon + "Switch to Base Mainnet to continue"
Amber border, warm background
Mobile Layout Rules
Max content width: 390px (iPhone 14 size)
All cards: full-width with 16px horizontal padding
Buttons: minimum 44px tap height
Font sizes: never smaller than 12px
Header: fixed, 60px
Feed: scrollable, no horizontal scroll
Modal: full-screen on very small screens (< 360px)
Bottom safe area padding: 24px
Micro-interactions
Like button: small heart pop animation on click
Submit button: loading spinner inside button while confirming
Card entry: fade-in + slight slide-up on mount
Pulse dot: on "New Confession" label (green or pink)
Tip button: coin bounce animation on success
Sayfa Akışı (User Flow)

Landing (not connected)
  └─ Header: "Connect Wallet" button prominent
  └─ Post form: disabled, shows "Connect wallet to confess"
  └─ Feed: visible, cards readable
Landing (connected)
  └─ Header: wallet address shown
  └─ Post form: fully active
  └─ Cards: like/dislike/tip buttons active
Post flow:
  Write text → See hash preview → Click "Confess Anonymously"
  → Wallet opens → Confirming spinner → Success banner → Card appears in feed
Vote flow:
  Click 👍/👎 → Wallet opens → Count updates optimistically → Syncs to DB
Tip flow:
  Click "💸 Tip" → Modal opens → Select amount → Click "Tip X ETH"
  → Wallet opens → Success screen in mod