# DocTranslate - Self-Hosted Document Translator

## Project Overview
- **Purpose:** Self-hosted DOCX translator with BYOK (Bring Your Own Key) and custom glossaries
- **Stack:** Next.js 14 (App Router), TypeScript, SQLite (Prisma), jszip, @xmldom/xmldom, Gemini API
- **Target:** Single-container deployment

## Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Lucide Icons |
| Database | SQLite + Prisma ORM |
| DOCX Processing | jszip + @xmldom/xmldom |
| LLM | Google Gemini API (@google/generative-ai) |

## Phase 1: Project Setup ✅
- [x] Initialize Next.js project with TypeScript
- [x] Set up Tailwind CSS
- [x] Install dependencies: jszip, @xmldom/xmldom, @google/generativeai, prisma
- [x] Configure Prisma with SQLite schema

## Phase 2: Database & Settings ✅
- [x] Create Prisma schema (Settings, Glossary tables)
- [x] Build settings page (API key input)
- [x] Build glossary management page (CRUD)
- [x] Create API routes for settings/glossary

## Phase 3: DOCX Translation Engine ✅
- [x] Create file upload endpoint
- [x] Implement ZIP extraction
- [x] Parse/modify XML document
- [x] Implement paragraph extraction
- [x] Implement XML re-injection
- [x] Create download endpoint

## Phase 4: Gemini Integration ✅
- [x] Create Gemini client wrapper
- [x] Implement glossary injection in system prompt
- [x] Batch processing for long documents
- [x] Error handling

## Phase 5: UI Pages ✅
- [x] Home/upload page
- [x] Settings page
- [x] Glossary page
- [x] Translation progress UI

## Phase 6: Docker ✅
- [x] Create Dockerfile
- [x] Create docker-compose.yml
- [ ] Test containerization

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/settings | Get API key status |
| POST | /api/settings | Save API key |
| GET | /api/glossary | List all terms |
| POST | /api/glossary | Add term |
| DELETE | /api/glossary/:id | Delete term |
| POST | /api/translate | Translate DOCX |

## File Structure
```
doc-translate/
├── prisma/
│   ├── schema.prisma
│   └── dev.db
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home/upload page
│   │   ├── layout.tsx            # Root layout with nav
│   │   ├── globals.css
│   │   ├── settings/page.tsx     # Settings page
│   │   ├── glossary/page.tsx     # Glossary page
│   │   └── api/
│   │       ├── settings/route.ts
│   │       ├── glossary/route.ts
│   │       └── translate/route.ts
│   ├── components/               # (using inline components)
│   └── lib/
│       ├── prisma.ts            # Prisma client
│       ├── docx.ts              # DOCX processing
│       └── gemini.ts            # Gemini client
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## Running Locally
```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Docker
docker-compose up --build
```

## Usage
1. Open http://localhost:3000
2. Go to Settings and add your Gemini API key
3. Add glossary terms (optional)
4. Upload a DOCX file and translate!
