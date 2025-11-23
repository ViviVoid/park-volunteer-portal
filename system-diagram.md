# Park Volunteer Portal - System Architecture Diagram

## Mermaid Diagram (for rendering/export to image)

```mermaid
graph LR
    subgraph Users[" "]
        Admin[Admin]
        Volunteer[Volunteer]
    end
    
    subgraph Frontend[" "]
        React[React Client]
    end
    
    subgraph Backend[" "]
        API[Express API]
        Scheduler[Auto Scheduler]
    end
    
    subgraph Data[" "]
        DB[(SQLite DB)]
    end
    
    subgraph External[" "]
        Google[Google Calendar]
        Email[Email/SMS]
        SF[Salesforce]
    end
    
    Admin --> React
    Volunteer --> React
    React --> API
    API --> DB
    API --> Scheduler
    Scheduler --> DB
    Scheduler --> Google
    Scheduler --> Email
    API --> Google
    API --> Email
    API --> SF
    
    style Admin fill:#4a90e2,color:#fff
    style Volunteer fill:#50c878,color:#fff
    style React fill:#61dafb,color:#000
    style API fill:#339933,color:#fff
    style Scheduler fill:#ff9900,color:#fff
    style DB fill:#003b57,color:#fff
    style Google fill:#4285f4,color:#fff
    style Email fill:#ea4335,color:#fff
    style SF fill:#00a1e0,color:#fff
```

## PowerPoint-Friendly Text Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PARK VOLUNTEER PORTAL SYSTEM                          │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐              ┌──────────────┐
    │ Admin Users  │              │Volunteer Users│
    └──────┬───────┘              └──────┬───────┘
           │                              │
           └──────────┬───────────────────┘
                      │
           ┌──────────▼──────────┐
           │  React/TypeScript   │
           │   Frontend Client   │
           └──────────┬──────────┘
                      │
           ┌──────────▼──────────────────────────┐
           │   Express/Node.js REST API          │
           │  ┌──────────────────────────────┐   │
           │  │ Authentication & Authorization│   │
           │  └──────────────────────────────┘   │
           │  ┌──────────────────────────────┐   │
           │  │   Cron Scheduler (Automated)  │   │
           │  └──────────────────────────────┘   │
           └──────────┬──────────────────────────┘
                      │
           ┌──────────▼──────────┐
           │   SQLite Database    │
           └──────────────────────┘

    ┌──────────────────────────────────────────────────────┐
    │              External Services                        │
    ├──────────────┬──────────────┬──────────────┬─────────┤
    │Google Calendar│  SMTP Email  │ Twilio SMS   │Salesforce│
    │     API      │   Service    │   Service    │(Optional)│
    └──────────────┴──────────────┴──────────────┴─────────┘
```

## High-Level System Overview

**Park Volunteer Portal** - Full-stack volunteer management system

### Core Components:
1. **Frontend**: React/TypeScript web application
2. **Backend**: Node.js/Express REST API with authentication
3. **Database**: SQLite for data persistence
4. **Scheduler**: Automated cron-based position posting
5. **Integrations**: Google Calendar, Email (SMTP), SMS (Twilio), Salesforce

### Key Flows:
- **Admin**: Manages templates, posts positions, schedules recurring posts
- **Volunteer**: Browses and signs up for positions, receives notifications
- **Automation**: Scheduler creates positions and forwards to Google Calendar
- **Notifications**: Email/SMS alerts based on volunteer preferences

