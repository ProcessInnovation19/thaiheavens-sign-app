# ThaiHeavensSignApp Documentation

Welcome to the complete documentation for ThaiHeavensSignApp - a full-stack web application for managing digital signing of rental contracts.

## Quick Navigation

### 📘 [Developer Documentation](./DEVELOPER.md)
Complete technical documentation for developers including:
- Architecture overview
- Backend and frontend structure
- API endpoints
- PDF tools and coordinate mapping
- Local development setup
- Deployment guide

### 👥 [User Guide](./USER_GUIDE.md)
User-friendly guide for non-technical users:
- Step-by-step instructions for administrators
- Step-by-step instructions for guests
- Troubleshooting guide
- Frequently asked questions

### 🤖 [AI Replication Guide](./AI_README_FOR_REPLICATION.md)
Complete system description for AI-assisted replication:
- Full technical specifications
- Data models and interfaces
- Implementation rules and constraints
- Regeneration instructions

## Visual Guides

### 🎨 [Guida Visuale (Italiano)](./visual-guide.md)
Diagrammi visuali e colorati per comprendere facilmente il sistema:
- Panoramica del sistema con colori
- Processi passo-passo visuali
- Interfaccia utente spiegata
- Flussi completi con stati
- Funzionalità mobile
- Casi d'uso pratici

## Diagrams

### Architecture & Design
- [System Architecture](./architecture.md) - High-level system architecture
- [Sequence Diagrams](./sequence_diagrams.md) - All major flows
- [API Flow](./api_flow.md) - API interactions
- [Data Model](./data_model.md) - Entities, fields, relationships
- [User Flow](./user_flow.md) - User journey and admin journey
- [System Lifecycle](./system_lifecycle.md) - State transitions
- [Deployment](./deployment.md) - Production deployment

## Getting Started

### For Developers
1. Read the [Developer Documentation](./DEVELOPER.md)
2. Set up local development environment
3. Review the architecture diagrams
4. Start building!

### For Users
1. Read the [User Guide](./USER_GUIDE.md)
2. Follow step-by-step instructions
3. Contact support if needed

### For AI
1. Read the [AI Replication Guide](./AI_README_FOR_REPLICATION.md)
2. Follow the complete specifications
3. Use the diagrams for reference
4. Implement according to the rules

## Project Overview

ThaiHeavensSignApp is a full-stack web application that enables:
- **Administrators** to upload PDF contracts, position signature fields, and create signing links
- **Guests** to review contracts and sign them digitally using touch or mouse

### Key Features
- ✅ PDF upload and management
- ✅ Visual signature position selection
- ✅ Interactive signature box (drag & resize)
- ✅ Digital signature drawing
- ✅ PDF preview and download
- ✅ Mobile-friendly interface
- ✅ Session management

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **PDF:** pdfjs-dist (rendering), pdf-lib (manipulation)
- **Signature:** signature_pad
- **Storage:** File system (JSON + PDF files)

## Documentation Structure

```
docs/
├── DEVELOPER.md                    # Developer documentation
├── USER_GUIDE.md                   # User guide
├── AI_README_FOR_REPLICATION.md   # AI replication guide
├── architecture.md                 # System architecture diagrams
├── sequence_diagrams.md            # Sequence diagrams
├── api_flow.md                     # API flow diagrams
├── data_model.md                   # Data model diagrams
├── user_flow.md                    # User flow diagrams
├── system_lifecycle.md             # Lifecycle diagrams
└── deployment.md                   # Deployment diagrams
```

## Contributing

When contributing to the documentation:
1. Keep diagrams up to date
2. Update all relevant sections
3. Test Mermaid diagrams render correctly
4. Follow the existing structure

## Support

For questions or issues:
- **Developers:** See [Developer Documentation](./DEVELOPER.md)
- **Users:** See [User Guide](./USER_GUIDE.md)
- **AI:** See [AI Replication Guide](./AI_README_FOR_REPLICATION.md)

---

**Last Updated:** 2024


