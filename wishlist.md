# Wishlist Application Plan

## Problem Statement
Existing solutions like Giftster allow group wishlist management, but have a critical flaw: wishlist owners cannot see if items are claimed, leading them to potentially buy items for themselves that others intend to gift.

## Solution
A wishlist application where:
- Wishlist owners see **no claim status** — claim info is fully hidden; they only get a warning if they try to delete a claimed item
- Other group members see **who claimed items** to coordinate and prevent duplicates
- Groups are permanent for year-round use (birthdays, holidays, etc.)

---

## Core Features

### Group Management
- Create permanent groups (family, friends, coworkers, etc.)
- Invite members via email/shareable link
- Group admin controls (add/remove members)
- Long-term membership for recurring occasions

### Wishlist Creation
- Users create multiple wishlists per group (Birthday, Christmas, Anniversary, General)
- Add items with:
  - Name
  - Description
  - Price/price range
  - Product URL
  - Image (upload or auto-fetch from URL)
  - **"Get by" deadline** — a specific date (e.g., Dec 25) or a named occasion (e.g., "My Birthday", "Christmas"); if nobody gifts it by then, the owner intends to buy it themselves
  - Quantity needed
  - Category/tags

### Privacy-Protected Claiming System (KEY FEATURE)

**For Wishlist Owner (Alice):**
- Sees **no claim status** on their items (cannot see "Claimed" or "Available")
- **Cannot see WHO claimed the item, or even that it was claimed**
- If she tries to **delete an item**, she receives a warning: "Someone may have already planned to get this for you — are you sure you want to remove it?"
- Surprise is fully preserved at all times

**For Other Group Members (Bob, Carol):**
- See full claim details: who claimed what
- Can coordinate to avoid duplicate purchases
- Can see notes left by other claimers
- Can add private notes visible only to gift-givers

**Claiming Features:**
- Claim full or partial quantity
- Add notes for other gift-givers (e.g., "splitting cost with Carol")
- Unclaim if plans change
- Option to mark as "purchased" separately from claimed

### Secret Gift Items (KEY FEATURE)
Gift-givers can add items directly to someone else's wishlist that **only other gift-givers can see** — the wishlist owner never sees them.

**Use case:** Bob already knows he's buying Alice a necklace. He adds it to her wishlist so Carol and Dave don't accidentally buy the same thing.

**Rules:**
- Only the gift-giver who added the item can edit or remove it
- The wishlist owner **never** sees secret gift items on their wishlist
- Other group members see secret items with full details (who added it, what it is)
- Secret items are automatically hidden from the owner's view at the API level — not just the UI

### User Roles Per Group
- **Owner**: Creator of their own wishlist
- **Member**: Can view and claim others' items
- **Admin**: Manage group settings and membership

---

## User Flow Example

1. **Alice** creates "Smith Family" permanent group
2. **Alice** adds "Blue Sweater - $50" to her Christmas 2025 wishlist
3. **Bob** (brother) joins group, browses Alice's wishlist
4. **Bob** claims "Blue Sweater"
   - Alice sees: no change — item looks the same as before
   - If Alice tries to delete the item: she gets a warning that someone may have already planned to get it for her
   - Carol sees: "Claimed by Bob" - picks different item
5. **Bob** also adds a secret gift item "Pearl Earrings" directly to Alice's wishlist
   - Alice never sees "Pearl Earrings" on her own wishlist
   - Carol sees it listed as "Added by Bob" and knows not to buy earrings
6. After Christmas, Alice can mark as "received" and it automatically removed it from the list


---

## Technical Architecture

### Platform Strategy
- **Initial Launch**: Web application (accessible from any device/browser)
  - No installation required
  - Works on desktop, tablet, and mobile
  - Single codebase serves all users
  - Easier to update and maintain
- **Future**: Native mobile apps (iOS/Android) if needed
- **Progressive Web App (PWA)**: Can be "installed" on mobile devices for app-like experience

### Frontend
- **Framework**: React with Next.js or Vue.js with Nuxt
- **Styling**: Tailwind CSS 
- **State Management**: Redux/Zustand or Pinia
- **Features**: Responsive design, PWA support

### Backend
- **Framework**: Node.js with Express or Python with Django/FastAPI
- **API**: RESTful or GraphQL
- **Real-time**: WebSockets for live updates

### Database
- **Primary DB**: PostgreSQL (relational structure for complex relationships)
- **Alternative**: MongoDB (document-based flexibility)
- **Caching**: Redis for session management and performance

### Authentication
- **Google Sign-In only** (OAuth 2.0) — no passwords stored
- Session managed via JWT issued after Google login
- User's name, email, and profile picture pulled from Google automatically

### Hosting & Infrastructure

**Initial Deployment (Recommended):**
- **Frontend**: Vercel (Free tier)
  - Automatic deployments from Git
  - Built-in CDN
  - HTTPS included
  - Perfect for Next.js/React applications
- **Backend & Database**: Supabase (Free tier to start)
  - Postgres database (always-on, no cold starts)
  - Built-in authentication
  - File storage included
  - Real-time subscriptions
  - REST and GraphQL APIs
  - No backend code needed for basic operations

**For Scaling Later:**
When you have many users and need more control:
- **AWS** (EC2, RDS, S3, CloudFront) - Most flexible but complex
- **DigitalOcean** - Good balance of simplicity and control
- **Google Cloud** or **Azure** - Enterprise-grade options

---

## Database Schema

### Users
- id (primary key)
- google_id (unique — Google's user identifier)
- email (unique, from Google)
- name (from Google)
- profile_image (from Google)
- created_at
- updated_at

### Sessions
- id (primary key)
- user_id (foreign key to Users)
- jwt_token_hash (hashed token for revocation)
- created_at
- expires_at

### Groups
- id (primary key)
- name
- description
- created_by (foreign key to Users)
- invite_code (unique)
- created_at
- updated_at

### GroupMembers
- id (primary key)
- user_id (foreign key to Users)
- group_id (foreign key to Groups)
- role (admin, member)
- joined_at

### Wishlists
- id (primary key)
- user_id (foreign key to Users)
- group_id (foreign key to Groups)
- title (e.g., "Birthday 2026", "Christmas 2025")
- occasion_date
- description
- created_at
- updated_at

### Items
- id (primary key)
- wishlist_id (foreign key to Wishlists)
- added_by_user_id (foreign key to Users — who created this item; normally the wishlist owner, but can be another group member for secret gift items)
- is_secret_gift (boolean, default: false — if true, hidden from the wishlist owner entirely)
- name
- description
- price
- url
- image_url
- get_by_date (nullable date — specific deadline)
- get_by_label (nullable string — e.g., "My Birthday", "Christmas"; shown instead of raw date if provided)
- quantity (default: 1)
- category
- created_at
- updated_at

### Claims
- id (primary key)
- item_id (foreign key to Items)
- claimed_by_user_id (foreign key to Users)
- quantity_claimed
- notes (visible only to other gift-givers)
- is_purchased (boolean)
- claimed_at
- updated_at

---

## Key Business Rules

1. Users cannot claim items on their own wishlists
2. Wishlist owners do **not** see claim status at all — claim information is hidden from them entirely; they only receive a warning when attempting to delete a claimed item
3. Multiple partial claims allowed if quantity > 1
4. Total claimed quantity cannot exceed item quantity
5. Users can unclaim items if plans change
6. Gift-givers can add secret gift items to another user's wishlist (`is_secret_gift = true`); these are **never returned by the API** when the wishlist owner is the requester
7. Only the gift-giver who added a secret item can edit or delete it
8. Notification system for:
   - New items added to group wishlists
   - Someone unclaimed an item you were tracking
   - Warning shown to owner only when they attempt to delete a claimed item (no persistent notification)

---

## Additional Features

### Notifications & Reminders
- Birthday reminders for group members
- Upcoming occasion alerts
- New wishlist item notifications
- Claim status changes

### Social Features
- Group activity feed
- Comments on items (visible to all or just gift-givers)
- Gift history tracking

### Practical Tools
- Budget tracking per member (private view)
- Price change alerts for tracked items
- Archive past occasions
- Browser extension for adding items from any website

### Privacy & Security
- Privacy settings per wishlist (who can see)
- Data export/deletion (GDPR compliance)
- Secure invite-only groups

---

## User Interface Pages

### Public Pages
- Landing/marketing page
- Login ("Sign in with Google" button only)

### Dashboard
- Overview of all groups
- Upcoming occasions
- Recent activity

### Group View
- List of group members
- All wishlists in the group
- Group settings (admin only)

### Wishlist View (Own)
- List of items with **no claim status shown**
- Add/edit/delete items (delete triggers a warning if the item has been claimed)
- Organize by priority/category

### Wishlist View (Others')
- List of items with full claim details
- Secret gift items added by gift-givers are visible here (labelled with who added them)
- Claim/unclaim items
- Add a secret gift item to this person's wishlist
- Filter by availability

### Profile
- Edit profile information
- Notification preferences
- Account settings

---

## Development Phases

### Phase 1: MVP (Minimum Viable Product)
- User authentication (Google Sign-In)
- Create/join groups
- Create wishlists
- Add items to wishlists
- Claim items with privacy rules
- Basic notifications

### Phase 2: Enhanced Features
- Multiple wishlists per user
- Image upload/URL fetching
- Priority levels
- Quantity management
- Email notifications

### Phase 3: Social & Polish
- Group activity feed
- Comments
- Thank you messages
- Mobile responsive design
- Browser extension

### Phase 4: Advanced Features
- Price tracking
- Budget tools
- Import/export
- PWA support
- Gift history analytics

---

## Monetization Options (Future)

1. **Freemium Model**
   - Free: 2 groups, 20 items per wishlist
   - Premium: Unlimited groups/items, advanced features

2. **Affiliate Links**
   - Commission from product links

3. **Premium Features**
   - Advanced analytics
   - Custom branding
   - Priority support

---

## Success Metrics

- User registrations
- Active groups created
- Items added to wishlists
- Claim rate (% of items claimed)
- User retention (monthly active users)
- Net Promoter Score (NPS)

---

## Competitive Advantages vs Giftster

✓ Wishlist owners see no claim status — full surprise preserved (warned only on delete)
✓ Gift-givers see full coordination details (prevents duplicates)
✓ Better privacy balance
✓ Modern UI/UX
✓ Real-time updates
✓ Mobile-first design