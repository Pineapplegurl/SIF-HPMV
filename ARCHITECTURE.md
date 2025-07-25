# SIF-HPMV Architecture Documentation

## System Overview

SIF-HPMV is a full-stack web application for managing and visualizing railway infrastructure data with interactive mapping capabilities, coordinate system management, and multi-phase project planning.

## High-Level Architecture

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

## Technology Stack

### Frontend
- **Framework**: React.js 19.0.0 (Create React App)
- **Styling**: Tailwind CSS 3.4.3
- **Mapping**: Leaflet 1.9.4 + React-Leaflet 5.0.0
- **UI Components**: React Icons 5.5.0
- **Data Visualization**: D3-interpolate 3.0.1
- **Export Features**: html2canvas 1.4.1, jsPDF 3.0.1
- **PDF Handling**: react-pdf 9.2.1, pdfjs-dist 4.8.69
- **User Interaction**: react-zoom-pan-pinch 3.7.0

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Database Driver**: MongoDB 6.16.0
- **Authentication**: jsonwebtoken 9.0.2, bcrypt 6.0.0
- **Security**: cors 2.8.5, dotenv 16.5.0

### Database
- **Database**: MongoDB (Cloud)
- **Collections**: PK, AddedPoints, TypePoints, Zones, Interpolations, SavedTypePoints

## Component Architecture

### Frontend Components Structure

```
src/
├── App.js (Main Application Component)
├── components/
│   ├── Navbar.js (Navigation & Authentication)
│   ├── PlanViewer.js (Main Map Viewer)
│   ├── GuestMapPage.js (Public Access Mode)
│   ├── SIFTables.js (Data Management)
│   ├── MapOverlay.js (Interactive Map Features)
│   ├── CoordinateEditor.js (Coordinate System Management)
│   └── ZoneTable.js (Zone Management)
├── CoordinateSystem.js (Coordinate Conversion)
├── hooks/ (Custom React Hooks)
├── utils/ (Utility Functions)
└── public/ (Static Assets)
```

### Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                        App.js                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │   Navbar    │  │            Main Content             │   │
│  │             │  │                                     │   │
│  │ - Auth      │  │  ┌─────────────┐ ┌─────────────┐   │   │
│  │ - Navigation│  │  │ PlanViewer  │ │CoordinateS..│   │   │
│  │ - Layers    │  │  │             │ │             │   │   │
│  └─────────────┘  │  │ ┌─────────┐ │ └─────────────┘   │   │
│                   │  │ │MapOverlay│ │                   │   │
│                   │  │ └─────────┘ │ ┌─────────────┐   │   │
│                   │  └─────────────┘ │  SIFTables  │   │   │
│                   │                  │             │   │   │
│                   │  ┌─────────────┐ │ ┌─────────┐ │   │   │
│                   │  │GuestMapPage │ │ │ZoneTable│ │   │   │
│                   │  │(Public Mode)│ │ └─────────┘ │   │   │
│                   │  └─────────────┘ └─────────────┘   │   │
│                   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### Authentication Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Navbar    │    │   Backend   │    │  LocalStore │
│             │    │             │    │             │    │             │
│ 1. Login    │───►│ 2. Send     │───►│ 3. Verify   │    │             │
│   Request   │    │   Creds     │    │   & Create  │    │             │
│             │    │             │    │   JWT Token │    │             │
│             │    │             │◄───│ 4. Return   │    │             │
│             │    │             │    │   Token     │    │             │
│             │    │ 5. Store    │───►│             │───►│ 6. Save     │
│             │    │   Token     │    │             │    │   Token     │
│             │◄───│ 6. Update   │    │             │    │             │
│             │    │   isAdmin   │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Data Management Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │    │   API       │    │   Backend   │    │  MongoDB    │
│ Components  │    │  Endpoints  │    │   Server    │    │  Database   │
│             │    │             │    │             │    │             │
│ 1. User     │───►│ 2. HTTP     │───►│ 3. Auth     │    │             │
│   Action    │    │   Request   │    │   Check     │    │             │
│             │    │             │    │             │    │             │
│             │    │             │    │ 4. Database │───►│ 5. Query/   │
│             │    │             │    │   Operation │    │   Update    │
│             │    │             │    │             │    │             │
│             │    │             │    │ 6. Format   │◄───│ 7. Return   │
│             │    │             │    │   Response  │    │   Data      │
│             │    │             │    │             │    │             │
│             │◄───│ 8. JSON     │◄───│ 9. Send     │    │             │
│             │    │   Response  │    │   Response  │    │             │
│             │    │             │    │             │    │             │
│ 10. Update  │    │             │    │             │    │             │
│    UI       │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## API Endpoints

### Authentication
- `POST /api/login` - User authentication

### Points Management
- `GET /api/points` - Search points by name
- `GET /api/all-points` - Get all points
- `GET /api/pkdata` - Get PK and AddedPoints data
- `POST /api/add-point` - Add new point (with interpolation)
- `DELETE /api/delete-point/:id` - Delete point
- `PUT /api/update-point/:id` - Update point

### Type Points (BTS/GSM-R)
- `GET /api/type-points` - Get type points
- `POST /api/add-type-point` - Add type point
- `DELETE /api/delete-type-point/:id` - Delete type point
- `POST /api/save-type-points` - Save type points
- `GET /api/saved-type-points` - Get saved type points

### Zones Management
- `GET /api/zones` - Get all zones
- `POST /api/add-zone` - Add new zone
- `DELETE /api/delete-zone/:id` - Delete zone

### Data Import/Export
- `POST /api/interpolations/import` - Import interpolations data
- `POST /api/type-points/import` - Import type points data
- `POST /api/zones/import` - Import zones data

### Coordinate Interpolation
- `POST /api/interpolated-position` - Calculate interpolated position

## Database Schema

### Collections Structure

```
MongoDB Database: SIF
├── PK Collection
│   ├── Points remarquables (String)
│   ├── track (String)
│   ├── line (String)
│   ├── pk (Number)
│   ├── x, y (Coordinates)
│   └── Various metadata fields
│
├── AddedPoints Collection
│   ├── type, name, line, track, pk
│   ├── xSif, ySif, xReal, yReal
│   ├── x, y (Interpolated coordinates)
│   ├── infos (Additional information)
│   └── createdAt (Timestamp)
│
├── TypePoints Collection
│   ├── type (BTS/GSM-R types)
│   ├── name, line, track, pk
│   ├── x, y coordinates
│   └── metadata fields
│
├── Zones Collection
│   ├── Zone definition data
│   └── Geometric boundaries
│
├── Interpolations Collection
│   └── Interpolation data for coordinate conversion
│
└── SavedTypePoints Collection
    └── Saved BTS/GSM-R points data
```

## Key Features

### 1. Multi-Phase Project Visualization
- **Situation actuelle** - Current state
- **Phase 1** - First phase implementation
- **Phase 2** - Second phase implementation
- **HPMV** - High-speed line implementation
- **GSM-R/BTS** - Communication infrastructure
- **Zones** - Action zones and post zones

### 2. Coordinate System Management
- **Multiple coordinate systems** support
- **Real-time interpolation** between coordinate systems
- **PK (Point Kilométrique)** to coordinate conversion
- **Interactive coordinate editing**

### 3. Interactive Mapping
- **Leaflet-based** interactive maps
- **Layer management** for different project phases
- **Zoom and pan** functionality
- **Point and zone** overlays
- **Export capabilities** (PDF, images)

### 4. Data Management
- **CRUD operations** for all data types
- **CSV import/export** functionality
- **Real-time data** synchronization
- **Search and filtering** capabilities

### 5. Authentication & Access Control
- **JWT-based** authentication
- **Admin vs Guest** access modes
- **Protected routes** and API endpoints
- **Session management**

## Security Features

### Backend Security
- **JWT Token** authentication
- **bcrypt** password hashing
- **CORS** configuration
- **Environment variables** for sensitive data
- **Input validation** on API endpoints

### Frontend Security
- **Token-based** authentication
- **Protected components** rendering
- **Local storage** token management
- **Automatic logout** on token expiration

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────┐ │
│  │   Frontend      │    │    Backend      │    │MongoDB  │ │
│  │   (React Build) │    │  (Node.js App)  │    │ Atlas   │ │
│  │                 │    │                 │    │(Cloud)  │ │
│  │ Static Hosting  │    │ Server Hosting  │    │Database │ │
│  │ (e.g., Netlify, │    │ (e.g., Heroku,  │    │Service  │ │
│  │  Vercel, etc.)  │    │  Railway, etc.) │    │         │ │
│  └─────────────────┘    └─────────────────┘    └─────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## File Structure Summary

```
SIF-HPMV/
├── src/ (React Frontend)
│   ├── components/ (React Components)
│   ├── hooks/ (Custom Hooks)
│   ├── utils/ (Utility Functions)
│   └── styles/ (CSS Files)
├── sif-backend/ (Node.js Backend)
│   ├── server.js (Main Server File)
│   ├── .env (Environment Variables)
│   └── package.json (Dependencies)
├── public/ (Static Assets)
├── package.json (Frontend Dependencies)
└── README.md (Documentation)
```

This architecture provides a scalable, maintainable, and secure solution for railway infrastructure data management and visualization with interactive mapping capabilities.