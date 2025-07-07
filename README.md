# Jump Agent – AI Assistant for Financial Advisors

**Built as part of the Jump paid challenge — July 2025**

This is a production-ready AI agent that helps financial advisors automate email, calendar, and CRM workflows using natural language. The agent integrates with **Gmail**, **Google Calendar**, and **HubSpot** to complete real tasks on behalf of the user — proactively and reactively.

---

## 🌟 Purpose

To give financial advisors a ChatGPT-like assistant that can:

- Search Gmail, Calendar, and HubSpot data to answer context-aware questions
- Take actions like sending emails, proposing meetings, or updating CRM
- Remember ongoing user instructions and respond when new events come in

---

## ✅ Features Implemented

### 🔐 Authentication

- **Google OAuth Login** with access to Gmail and Google Calendar
- **HubSpot OAuth** integration with refresh token management
- OAuth flows fully tested using real tokens and test users

---

### 💬 Chat Interface

- Clean, responsive chat UI (desktop and mobile)
- Supports follow-up messages, tool calling, and persistent threads
- Full session memory with chat history and context included in each prompt

---

### 🛠️ Tool-Calling Agent (LangChain)

The agent automatically uses the following tools based on user input:

| Tool                     | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `send_gmail`             | Sends an email using Gmail                                     |
| `schedule_meeting`       | Creates a Google Calendar event                                |
| `propose_meeting_times`  | Finds free time slots and emails them                          |
| `search_hubspot_contact` | Finds contacts in HubSpot                                      |
| `create_hubspot_contact` | Creates new contacts in HubSpot                                |
| `create_hubspot_note`    | Logs a note on a contact                                       |
| `save_instruction`       | Stores a user instruction for future automation                |
| `get_calendar_events`    | Retrieves upcoming meetings and attendees from Google Calendar |

---

## 🧠 Agent Memory + RAG

### Context Injection

- Emails (last 5)
- HubSpot notes (last 5)
- Saved instructions (last 5)

All context is vectorized using `text-embedding-3-small` and stored in PostgreSQL with pgvector. Agent prompts always include relevant data retrieved with similarity search.

---

## 🔁 Automation via Cron Polling

Polling runs every 5 minutes for:

- **Gmail**: detects new threads, matches instructions like "reply if someone asks about taxes"
- **Calendar**: checks for new events and acts on instructions like "email attendees"
- **HubSpot**: finds newly created contacts and applies instructions

All matching logic is RAG-based, not hardcoded.

---

## 💡 Example Scenarios That Work

### 1. **Ask about a client detail**

**User:** “Who mentioned their kid plays baseball?”  
→ Uses Gmail + HubSpot note embeddings to find and return the answer.

---

### 2. **Find a contact**

**User:** “Can you find a contact with email moshe199090@gmail.com in my HubSpot?”  
→ Calls `search_hubspot_contact`, returns result.

---

### 3. **Schedule a meeting**

**User:** “Please schedule a meeting with moshe199090@gmail.com for tomorrow at 10am”  
→ Sends an email proposing 3 available time slots based on calendar.

---

### 4. **Ongoing rule: reply to unknown email sender**

**User:** “When someone emails me who is not in HubSpot, create a contact and add a note.”  
→ Gmail polling detects sender, creates contact, logs the email as a note.

---

### 5. **Ongoing rule: email calendar attendees**

**User:** “When I add a meeting, email all attendees with the meeting info.”  
→ Calendar polling sees the new event and sends out emails.

---

## 💬 Chat Threading & History Infrastructure

The app includes initial infrastructure to support persistent chat threads and message history, including:

- A `Thread` and `Message` table in the database (via Prisma)
- API routes to:
  - Create and fetch threads
  - Persist messages
  - Associate messages with threads and users

However, due to time constraints, I decided to keep the chat UX simple and focus on core AI behaviors, tool integrations, and reliability.

The groundwork is in place to easily expand the chat system into a fully-featured assistant with long-term memory and thread management in future iterations.

---

## 📦 Tech Stack

- **Next.js 14 / App Router**
- **TypeScript / Tailwind CSS**
- **LangChain** – agent executor + tools
- **OpenAI** – `text-embedding-3-small` (via paid account)
- **PostgreSQL + pgvector** – for embeddings and memory
- **Supabase** – used as Postgres DB host
- **Google & HubSpot APIs** – email, calendar, CRM integrations
- **Render.com** – used for deployment + cron jobs (via paid account)

---

## 🚀 Deployment

- Hosted at: [https://jump-agent.onrender.com/]
- GitHub Repo: [https://github.com/moshe19909090/jump-agent]
- Cron jobs run every 5 minutes via [https://cron-job.org/]

---

## 📝 Notes

- This project was built entirely solo in under 72 hours
- All AI decisions are dynamic, not hardcoded
- Agent behavior is flexible and easily extendable
