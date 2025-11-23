# Park Volunteer Portal - High-Level System Architecture

## One-Slide System Diagram

```
                    PARK VOLUNTEER PORTAL
                    System Architecture
                    
    ┌─────────────┐         ┌─────────────┐
    │   Admin     │         │  Volunteer  │
    │   Users     │         │   Users      │
    └──────┬──────┘         └──────┬──────┘
           │                        │
           └──────────┬─────────────┘
                      │
           ┌──────────▼──────────┐
           │  React/TypeScript   │
           │   Web Application   │
           └──────────┬──────────┘
                      │
    ┌─────────────────▼─────────────────┐
    │   Node.js/Express REST API        │
    │   • Authentication                │
    │   • Business Logic                │
    │   • Cron Scheduler (Automated)    │
    └─────────────────┬─────────────────┘
                      │
           ┌──────────▼──────────┐
           │   SQLite Database    │
           └──────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼────┐    ┌───────▼──────┐   ┌──────▼─────┐
│ Google │    │ Email & SMS   │   │ Salesforce │
│Calendar│    │ Notifications │   │ (Optional) │
└────────┘    └───────────────┘   └────────────┘
```

## Component Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React/TypeScript | User interface for admins and volunteers |
| **Backend** | Node.js/Express | REST API, authentication, business logic |
| **Scheduler** | Cron Jobs | Automated position posting and notifications |
| **Database** | SQLite | Data persistence (users, positions, templates) |
| **Integrations** | Google Calendar, SMTP, Twilio, Salesforce | External service integrations |

## Key Features
- **Role-based access**: Admin and Volunteer dashboards
- **Automated scheduling**: Cron-based recurring position posts
- **Multi-channel notifications**: Email and SMS alerts
- **Calendar integration**: Google Calendar sync and forwarding
- **Template management**: Reusable position templates

