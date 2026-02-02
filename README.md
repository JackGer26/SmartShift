# 🍽️ SmartShift - Restaurant Rota Builder MVP

A comprehensive full-stack web application for automated restaurant staff scheduling and rota management.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Contributing](#contributing)

## ✨ Features

- **Staff Management**: Add, edit, and manage restaurant staff with roles and availability
- **Time Off Requests**: Handle holiday requests, sick leave, and other time off
- **Shift Templates**: Create reusable shift patterns for different days and roles
- **Automated Rota Generation**: Generate optimized weekly schedules automatically
- **Conflict Detection**: Prevent scheduling conflicts and overtime violations
- **Cost Tracking**: Monitor labor costs and budget allocation
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern component-based UI
- **Vite** - Fast development and build tooling
- **React Router** - Client-side routing
- **Plain CSS** - Custom styling (no external UI frameworks)

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Development Tools
- **Concurrently** - Run multiple npm scripts
- **Nodemon** - Auto-restart development server
- **ESLint** - Code linting

## 📁 Project Structure

```
SmartShift/
├── .github/
│   └── copilot-instructions.md          # GitHub Copilot workspace instructions
├── client/                              # React frontend application
│   ├── public/                          # Static assets
│   ├── src/
│   │   ├── components/                  # Reusable UI components
│   │   │   ├── layout/                  # Layout components (AppShell, TopNav)
│   │   │   └── ui/                      # Basic UI components (LoadingSpinner, etc.)
│   │   ├── pages/                       # Page components
│   │   │   ├── HomePage.jsx             # Landing page
│   │   │   ├── StaffPage.jsx            # Staff management
│   │   │   ├── TimeOffPage.jsx          # Time off requests
│   │   │   ├── ShiftTemplatesPage.jsx   # Shift templates
│   │   │   └── RotaBuilderPage.jsx      # Rota generation
│   │   ├── api/                         # API integration
│   │   │   ├── api.js                   # Base API utilities
│   │   │   ├── staffAPI.js              # Staff API methods
│   │   │   └── rotaAPI.js               # Rota API methods
│   │   ├── utils/                       # Frontend utilities
│   │   ├── App.jsx                      # Main app component
│   │   ├── main.jsx                     # App entry point
│   │   └── index.css                    # Global styles
│   ├── .env.example                     # Environment variables template
│   ├── vite.config.js                   # Vite configuration
│   └── package.json                     # Frontend dependencies
├── server/                              # Express backend application
│   ├── src/
│   │   ├── controllers/                 # Request handlers
│   │   │   ├── staffController.js       # Staff CRUD operations
│   │   │   ├── timeOffController.js     # Time off management
│   │   │   ├── shiftTemplateController.js # Shift template management
│   │   │   └── rotaController.js        # Rota generation and management
│   │   ├── models/                      # MongoDB schemas
│   │   │   ├── Staff.js                 # Staff member model
│   │   │   ├── TimeOff.js               # Time off request model
│   │   │   ├── ShiftTemplate.js         # Shift template model
│   │   │   └── RotaWeek.js              # Weekly rota model
│   │   ├── routes/                      # API route definitions
│   │   │   ├── staffRoutes.js           # Staff endpoints
│   │   │   ├── timeOffRoutes.js         # Time off endpoints
│   │   │   ├── shiftTemplateRoutes.js   # Shift template endpoints
│   │   │   └── rotaRoutes.js            # Rota endpoints
│   │   ├── services/                    # Business logic
│   │   │   └── rotaGenerationService.js # Automated rota generation
│   │   ├── utils/                       # Backend utilities
│   │   │   ├── dateUtils.js             # Date/time helper functions
│   │   │   └── validation.js            # Input validation helpers
│   │   ├── middleware/                  # Express middleware
│   │   │   └── errorHandler.js          # Global error handling
│   │   ├── config/                      # Configuration files
│   │   │   └── database.js              # MongoDB connection setup
│   │   └── app.js                       # Express app configuration
│   ├── .env.example                     # Environment variables template
│   ├── server.js                        # Server entry point
│   └── package.json                     # Backend dependencies
├── package.json                         # Root package.json with scripts
└── README.md                           # This file
```

## 🚀 Installation

### Prerequisites

- **Node.js** (v16.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **MongoDB** (v5.0 or higher)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/smartshift-restaurant-rota.git
   cd smartshift-restaurant-rota
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment templates
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   
   # Edit server/.env with your MongoDB connection string
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or if using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🔧 Development

### Available Scripts

```bash
# Root level commands
npm run dev                    # Start both frontend and backend
npm run install:all           # Install all dependencies
npm run build                 # Build frontend for production
npm run start                 # Start production server

# Server-specific commands
npm run server:dev            # Start backend development server
npm run server:start          # Start backend production server

# Client-specific commands
npm run client:dev            # Start frontend development server
npm run client:build          # Build frontend for production
npm run client:preview        # Preview production build
```

### Environment Variables

#### Server (`.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smartshift_restaurant_rota
JWT_SECRET=your-secure-jwt-secret
CORS_ORIGIN=http://localhost:3000
```

#### Client (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Staff Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff` | Get all staff members |
| GET | `/staff/:id` | Get specific staff member |
| POST | `/staff` | Create new staff member |
| PUT | `/staff/:id` | Update staff member |
| DELETE | `/staff/:id` | Delete (deactivate) staff member |

### Time Off Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/time-off` | Get all time off requests |
| GET | `/time-off/:id` | Get specific time off request |
| GET | `/time-off/staff/:staffId` | Get time off for specific staff |
| POST | `/time-off` | Create time off request |
| PUT | `/time-off/:id` | Update time off request |
| DELETE | `/time-off/:id` | Delete time off request |

### Shift Template Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shift-templates` | Get all shift templates |
| GET | `/shift-templates/:id` | Get specific shift template |
| GET | `/shift-templates/day/:dayOfWeek` | Get templates for specific day |
| POST | `/shift-templates` | Create shift template |
| PUT | `/shift-templates/:id` | Update shift template |
| DELETE | `/shift-templates/:id` | Delete shift template |

### Rota Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rota` | Get all rota weeks |
| GET | `/rota/:id` | Get specific rota week |
| GET | `/rota/week/:date` | Get rota for specific week |
| POST | `/rota/generate` | Generate new rota week |
| PUT | `/rota/:id` | Update rota week |
| PUT | `/rota/:id/publish` | Publish rota week |
| DELETE | `/rota/:id` | Delete rota week |

## 🗄 Database Schema

### Staff Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  phone: String,
  role: String, // 'manager', 'chef', 'waiter', 'bartender', 'cleaner'
  hourlyRate: Number,
  maxHoursPerWeek: Number,
  availableDays: [String], // Array of day names
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### TimeOff Collection
```javascript
{
  _id: ObjectId,
  staffId: ObjectId (ref: Staff),
  startDate: Date,
  endDate: Date,
  reason: String, // 'holiday', 'sick', 'personal', 'other'
  status: String, // 'pending', 'approved', 'denied'
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### ShiftTemplate Collection
```javascript
{
  _id: ObjectId,
  name: String,
  dayOfWeek: String, // 'monday' to 'sunday'
  startTime: String, // 'HH:MM' format
  endTime: String, // 'HH:MM' format
  requiredRole: String,
  staffCount: Number,
  isActive: Boolean,
  priority: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### RotaWeek Collection
```javascript
{
  _id: ObjectId,
  weekStartDate: Date, // Must be Monday
  weekEndDate: Date, // Automatically set to Sunday
  shifts: [{
    staffId: ObjectId (ref: Staff),
    shiftTemplateId: ObjectId (ref: ShiftTemplate),
    date: Date,
    startTime: String,
    endTime: String,
    status: String // 'scheduled', 'confirmed', 'completed', 'missed'
  }],
  status: String, // 'draft', 'published', 'archived'
  totalStaffHours: Number,
  totalLaborCost: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🎯 Key Features Detail

### Automated Rota Generation

The system uses a sophisticated algorithm to generate optimal weekly rotas:

1. **Staff Availability**: Respects individual staff availability patterns
2. **Time Off Integration**: Automatically excludes staff with approved time off
3. **Hour Limits**: Ensures no staff member exceeds their maximum weekly hours
4. **Role Matching**: Assigns staff to shifts matching their role
5. **Conflict Prevention**: Prevents double-booking and overlapping shifts
6. **Cost Optimization**: Considers hourly rates for cost-effective scheduling

### Smart Scheduling Rules

- Weekly hours must not exceed staff member's `maxHoursPerWeek`
- Staff can only be assigned to shifts on their available days
- No overlapping shifts for the same staff member
- Minimum break time between shifts (future enhancement)
- Priority-based template assignment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Add comments for complex business logic
- Test new features thoroughly
- Update documentation for API changes
- Keep commits atomic and well-described

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for restaurant owners and managers
- Designed with simplicity and efficiency in mind
- Focused on real-world scheduling challenges

---

**Happy Scheduling! 🍽️⚙️**