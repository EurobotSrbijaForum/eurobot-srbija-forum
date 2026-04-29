# Bolt/Forum — PRD

## Original Problem Statement
"Create a modern forum website."

## User Choices
- Authentication: Both JWT email/password AND Emergent Google social login
- Core features: Categories, threads, replies, upvotes/downvotes, profiles & avatars, search & tags, markdown support, moderation
- Design vibe: Bold/colorful community feel
- AI features: None
- Extras: Image uploads

## Architecture
- Frontend: React + React Router + Tailwind + neo-brutalist custom styling, Phosphor icons, react-markdown
- Backend: FastAPI + Motor (MongoDB)
- Auth: dual scheme — JWT (email/password) + Emergent OAuth session_token, both unified via `session_token` httpOnly cookie
- Storage: Emergent Object Storage for avatars and post images
- Identifiers: custom `user_id` (UUID), `thread_id`, `comment_id` — Mongo `_id` always excluded

## User Personas
- **Casual readers** browse hot threads without signup
- **Members** post threads, reply, vote, upload images, customize profiles
- **Moderators (admin)** pin / lock / delete any thread, view admin panel & stats

## Implemented (2026-04-29)
- Cookie auth with JWT + Google (Emergent) login
- 6 seeded categories (general, tech, design, gaming, music, random)
- Thread CRUD with markdown, tags, optional cover image
- Comment thread with delete + vote
- Upvote / downvote with karma propagation, score deltas
- Search by query, filter by tag, sort by hot/new/top
- Admin panel (pin, lock, delete) with stats
- User profile (view + edit name/bio + avatar upload)
- Image upload via Emergent object storage with auth-protected serving
- Bold neo-brutalist UI: Archivo Black + Space Grotesk fonts, hard borders & shadows, vibrant orange/pink/cyan/yellow/green palette

## Backlog
- P1: real-time live updates (websockets), notifications
- P1: nested/threaded replies (parent_id is in schema, not yet rendered as tree)
- P2: password reset flow, email verification
- P2: report/flag system with mod queue
- P2: rich text WYSIWYG option, code-block syntax highlighting, link previews
- P2: pagination / infinite scroll on feed
