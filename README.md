# SIF-HPMV Railway Infrastructure Management System

A comprehensive full-stack web application for managing and visualizing railway infrastructure data with interactive mapping capabilities, coordinate system management, and multi-phase project planning.

## 🎯 Project Overview

SIF-HPMV is a sophisticated railway infrastructure management system that provides:

- **Interactive Map Visualization** with Leaflet integration
- **Multi-phase Project Planning** with different implementation stages
- **Coordinate System Management** with real-time interpolation
- **Railway Point Management** (PK - Points Kilométriques)
- **BTS/GSM-R Communication Infrastructure** tracking
- **Zone Management** for geographical boundaries
- **Data Import/Export** capabilities (CSV)
- **Authentication & Access Control** (Admin/Guest modes)

## 📋 Architecture Documentation

This repository includes comprehensive architecture documentation:

### 📊 Architecture Diagrams

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Comprehensive text-based architecture documentation
2. **[architecture-diagram.html](./architecture-diagram.html)** - Visual system architecture diagram
3. **[component-architecture.html](./component-architecture.html)** - React component hierarchy diagram
4. **[data-flow-diagram.html](./data-flow-diagram.html)** - Data flow and business process diagram

### 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        SIF-HPMV SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────┐ │
│  │   Frontend      │    │    Backend      │    │Database │ │
│  │   (React.js)    │◄──►│  (Node.js/      │◄──►│(MongoDB)│ │
│  │                 │    │   Express.js)   │    │         │ │
│  │ Port: 3000      │    │  Port: 5000     │    │ Cloud   │ │
│  └─────────────────┘    └─────────────────┘    └─────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **React.js 19.0.0** - Modern UI framework
- **Leaflet** - Interactive mapping library
- **Tailwind CSS** - Utility-first CSS framework
- **React Icons** - Icon library
- **D3-interpolate** - Data interpolation
- **html2canvas & jsPDF** - Export functionality

### Backend
- **Node.js & Express.js** - Server framework
- **MongoDB** - NoSQL database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- npm or yarn package manager

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Backend Setup
```bash
# Navigate to backend directory
cd sif-backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database connection and JWT secret

# Start backend server
npm start
```

### Environment Configuration

Create a `.env` file in the `sif-backend` directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
ADMIN_HASH=your_bcrypt_hashed_password
```

## 📁 Project Structure

```
SIF-HPMV/
├── src/                          # React Frontend
│   ├── components/               # React Components
│   │   ├── Navbar.js            # Navigation & Authentication
│   │   ├── PlanViewer.js         # Main Map Viewer
│   │   ├── GuestMapPage.js       # Public Access Mode
│   │   ├── SIFTables.js          # Data Management
│   │   ├── MapOverlay.js         # Interactive Map Features
│   │   ├── CoordinateEditor.js   # Coordinate Management
│   │   └── ZoneTable.js          # Zone Management
│   ├── hooks/                    # Custom React Hooks
│   ├── utils/                    # Utility Functions
│   └── App.js                    # Main App Component
├── sif-backend/                  # Node.js Backend
│   ├── server.js                 # Express Server
│   ├── .env                      # Environment Variables
│   └── package.json              # Backend Dependencies
├── public/                       # Static Assets
├── package.json                  # Frontend Dependencies
├── ARCHITECTURE.md               # Architecture Documentation
├── architecture-diagram.html     # Visual Architecture
├── component-architecture.html   # Component Diagrams
└── data-flow-diagram.html       # Data Flow Visualization
```

## 🔐 Authentication & Security

- **JWT-based authentication** with secure token management
- **bcrypt password hashing** for secure credential storage
- **Role-based access control** (Admin vs Guest modes)
- **Protected API endpoints** with middleware authentication
- **Input validation** and error handling
- **Environment-based configuration** for sensitive data

## 🗄️ Database Schema

### MongoDB Collections

- **PK Collection** - Points Kilométriques (railway reference points)
- **AddedPoints** - User-generated points with interpolated coordinates
- **TypePoints** - BTS/GSM-R communication infrastructure points
- **Zones** - Geographical boundary definitions
- **Interpolations** - Coordinate conversion data
- **SavedTypePoints** - Exported/saved communication points

## 🎨 Features

### Map Visualization
- Interactive Leaflet maps with multiple layers
- Railway infrastructure phase visualization
- Real-time coordinate system conversion
- Zoom, pan, and layer management
- Export capabilities (PDF, images)

### Data Management
- CRUD operations for all data types
- CSV import/export functionality
- Real-time data synchronization
- Search and filtering capabilities
- Bulk data operations

### Coordinate Systems
- Multiple coordinate system support
- PK (Point Kilométrique) to coordinate interpolation
- Real-time coordinate conversion
- Interactive coordinate editing

### Project Phases
- **Current Situation** - Existing infrastructure
- **Phase 1 & 2** - Implementation stages
- **HPMV** - High-speed rail implementation
- **BTS/GSM-R** - Communication infrastructure
- **Zones** - Operational boundaries

## 🔧 Development

### Available Scripts

```bash
# Frontend
npm start          # Development server (port 3000)
npm run build      # Production build
npm test           # Run tests
npm run eject      # Eject from Create React App

# Backend
cd sif-backend
npm start          # Start backend server (port 5000)
```

### API Endpoints

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete API documentation including:
- Authentication endpoints
- Points management
- Zone operations
- Data import/export
- Coordinate interpolation

## 📖 Documentation

For detailed technical documentation, please refer to:

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture
2. **[architecture-diagram.html](./architecture-diagram.html)** - Interactive architecture diagram
3. **[component-architecture.html](./component-architecture.html)** - Component relationships
4. **[data-flow-diagram.html](./data-flow-diagram.html)** - Data flow visualization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions and support, please refer to the architecture documentation or open an issue in the repository.

---

**SIF-HPMV** - Railway Infrastructure Management System
*Built with React.js, Node.js, and MongoDB*
