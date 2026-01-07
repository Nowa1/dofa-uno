# Nemesis MVP - Planning Documentation

## 📋 Overview

This directory contains comprehensive planning documentation for the **Nemesis** MVP - an ADHD-friendly task management application designed to overcome Executive Dysfunction.

**Project Timeline:** 4-day hackathon  
**Current Phase:** Architecture & Planning Complete ✅

---

## 📚 Documentation Files

### 1. [`nemesis-architecture.md`](nemesis-architecture.md)
**Complete system architecture and technical specifications**

**Contents:**
- System architecture diagram
- Technology stack details
- Project structure (backend & frontend)
- Data models and database schema
- API endpoint specifications
- Core feature implementations
- Design system (colors, typography, animations)
- Error handling strategy
- Development workflow phases
- Testing strategy
- Deployment considerations

**Use this for:** Understanding the overall system design, API contracts, and technical decisions.

---

### 2. [`component-architecture.md`](component-architecture.md)
**Frontend component hierarchy and implementation details**

**Contents:**
- Component hierarchy diagram
- Detailed component specifications
- Props and state definitions
- UI layouts and wireframes
- State management with Zustand
- API service layer
- User flow diagrams
- Animation specifications
- Accessibility features
- Performance optimization strategies

**Use this for:** Building React components, understanding component relationships, and implementing animations.

---

### 3. [`implementation-guide.md`](implementation-guide.md)
**Step-by-step setup instructions and code templates**

**Contents:**
- Quick start commands
- Backend setup (Phase 1)
  - Complete file structure
  - All Python code with full implementations
  - Database models and migrations
  - API routes and services
  - OpenAI integration
- Frontend setup (Phase 2)
  - Vite + React configuration
  - Tailwind CSS setup
  - Zustand store implementation
  - API service layer
- Testing procedures
- Troubleshooting guide

**Use this for:** Actually building the application, copy-paste ready code, and debugging issues.

---

## 🎯 Key Features

### 1. RAM Cleaner (Brain Dump)
Unstructured text input → AI-parsed structured tasks

### 2. AI Triage
Automatic categorization into:
- ⚡ **Quick Wins** (<15 min)
- 🧠 **Deep Work** (≥15 min)

### 3. Neuro-Tunnel (Focus Mode)
Immersive fullscreen experience with:
- Single task display
- Countdown timer
- Only "Done" or "Panic" buttons
- No distractions

### 4. Mascot Buddy
Animated character with emotional states:
- 😌 Idle
- 💪 Focus
- 😰 Panic
- 🎉 Triumph

### 5. Gamification
Visual feedback system:
- Fog overlay (clears with progress)
- Chain breaking effects
- Streak counter
- Celebration animations

---

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI
- **Database:** SQLite + SQLAlchemy
- **AI:** OpenAI API (gpt-4o-mini)
- **Server:** Uvicorn

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **State:** Zustand

---

## 🚀 Quick Start

### Prerequisites
```bash
# Backend
- Python 3.9+
- OpenAI API key

# Frontend
- Node.js 18+
- npm or yarn
```

### Setup Commands

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Add OPENAI_API_KEY to .env
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📊 Implementation Checklist

### Phase 1: Foundation ⏳
- [ ] Backend project structure
- [ ] Database models and migrations
- [ ] API endpoints implementation
- [ ] OpenAI integration
- [ ] Frontend project setup
- [ ] Tailwind CSS configuration
- [ ] Zustand store setup

### Phase 2: Core Features ⏳
- [ ] BrainDump component
- [ ] TaskBoard and TaskCard components
- [ ] API integration
- [ ] Task CRUD operations
- [ ] Basic styling

### Phase 3: Advanced Features ⏳
- [ ] Focus Mode overlay
- [ ] Countdown timer
- [ ] Mascot Buddy component
- [ ] State animations
- [ ] Gamification effects

### Phase 4: Polish ⏳
- [ ] Framer Motion animations
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design
- [ ] Accessibility features

### Phase 5: Testing ⏳
- [ ] API endpoint testing
- [ ] Component testing
- [ ] User flow testing
- [ ] Bug fixes
- [ ] Performance optimization

---

## 🎨 Design Principles

### Psychology-First Approach
1. **Reduce Cognitive Load** - Show only what's needed NOW
2. **Immediate Feedback** - Every action has visual response
3. **Dopamine Hits** - Frequent positive reinforcement
4. **No Overwhelm** - Break tasks into manageable pieces
5. **Commitment Device** - Focus mode has no easy exit

### Visual Design
- **Deep Dark Mode** (#0f172a) - Reduce eye strain
- **Large Typography** - Easy to read, no squinting
- **Generous Spacing** - Reduce visual clutter
- **Smooth Animations** - Satisfying micro-interactions
- **Clear Hierarchy** - Obvious what to do next

---

## 🔄 User Flow

```
1. User opens app
   ↓
2. Sees BrainDump text area
   ↓
3. Types unstructured thoughts
   ↓
4. Clicks "Clear My Mind"
   ↓
5. AI parses into structured tasks
   ↓
6. Tasks appear in Quick Wins / Deep Work sections
   ↓
7. User clicks "Start Focus" on a task
   ↓
8. Enters fullscreen Focus Mode
   ↓
9. Timer counts down
   ↓
10. User clicks "Done" or "Panic"
    ↓
11. Task marked complete (or reverted)
    ↓
12. Streak increments
    ↓
13. Mascot celebrates
    ↓
14. Return to task list
```

---

## 🎯 Success Metrics

### MVP Completion Criteria
- ✅ Brain dump → structured tasks works
- ✅ AI categorization is accurate
- ✅ Focus mode is immersive
- ✅ Mascot responds to actions
- ✅ Streak tracking works
- ✅ All interactions have feedback
- ✅ Error handling prevents crashes
- ✅ UI is clean and ADHD-friendly

### Performance Targets
- **Initial Load:** < 2 seconds
- **API Response:** < 1 second
- **Animation FPS:** 60fps
- **Time to First Task:** < 30 seconds

---

## 🐛 Known Considerations

### Technical Debt (Acceptable for MVP)
- No user authentication (single user)
- No task persistence beyond database
- No offline mode
- No mobile app (web only)
- No task scheduling/reminders
- No data export

### Future Enhancements
- Multi-user support with auth
- Calendar integration
- Voice input for brain dumps
- Pomodoro timer
- Task history and analytics
- Mobile app (React Native)
- Customizable mascot
- Social features

---

## 📖 API Documentation

### Base URL
```
http://localhost:8000
```

### Endpoints

#### Parse Brain Dump
```http
POST /api/parse_dump
Content-Type: application/json

{
  "raw_text": "I need to call mom and finish the report"
}
```

#### Get All Tasks
```http
GET /api/tasks
```

#### Update Task
```http
PATCH /api/tasks/{task_id}
Content-Type: application/json

{
  "status": "completed"
}
```

#### Delete Task
```http
DELETE /api/tasks/{task_id}
```

#### Get AI Intervention
```http
POST /api/chat_intervention
Content-Type: application/json

{
  "task_id": "uuid",
  "context": "feeling overwhelmed"
}
```

**Full API documentation:** http://localhost:8000/docs (when backend is running)

---

## 🤝 Development Workflow

### Recommended Order
1. **Backend First** - Get API working with test data
2. **Frontend Structure** - Build components with dummy data
3. **Integration** - Connect frontend to backend
4. **Features** - Add Focus Mode, Mascot, Gamification
5. **Polish** - Animations, error handling, responsive design
6. **Testing** - End-to-end user flow testing

### Git Workflow (Recommended)
```bash
# Feature branches
git checkout -b feature/brain-dump
git checkout -b feature/focus-mode
git checkout -b feature/mascot

# Commit often
git commit -m "feat: add brain dump component"
git commit -m "fix: handle empty task list"
git commit -m "style: improve task card hover effect"
```

---

## 🆘 Troubleshooting

### Common Issues

**Backend won't start:**
- Check Python version (3.9+)
- Verify all dependencies installed
- Check .env file exists with OPENAI_API_KEY

**Frontend won't start:**
- Check Node version (18+)
- Delete node_modules and reinstall
- Check port 5173 is available

**API connection failed:**
- Verify backend is running on port 8000
- Check CORS settings in backend
- Verify VITE_API_BASE_URL in frontend .env

**OpenAI errors:**
- Verify API key is valid
- Check account has credits
- Check rate limits

**Database errors:**
- Delete database file and restart backend
- Check file permissions
- Verify SQLite is installed

---

## 📞 Support Resources

### Documentation
- FastAPI: https://fastapi.tiangolo.com
- React: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- Framer Motion: https://www.framer.com/motion
- Zustand: https://github.com/pmndrs/zustand
- OpenAI API: https://platform.openai.com/docs

### Tools
- API Testing: Postman, Thunder Client, curl
- React DevTools: Browser extension
- Database Viewer: DB Browser for SQLite

---

## 🎉 Ready to Build?

All planning documentation is complete. You now have:

✅ **System Architecture** - Complete technical design  
✅ **Component Specs** - Detailed frontend blueprint  
✅ **Implementation Guide** - Step-by-step code templates  
✅ **API Contracts** - Clear backend/frontend interface  
✅ **Design System** - Consistent visual language  
✅ **Testing Strategy** - Quality assurance plan  

**Next Step:** Switch to **Code Mode** to begin implementation!

---

## 📝 Notes

- This is an MVP for a 4-day hackathon
- Focus on core features first
- Don't overengineer
- Test frequently
- Prioritize user experience over perfect code
- Have fun building! 🚀

---

**Last Updated:** 2026-01-07  
**Status:** Planning Complete, Ready for Implementation  
**Estimated Implementation Time:** 3-4 days with focused work
