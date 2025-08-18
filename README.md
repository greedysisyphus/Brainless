# Brainless

A comprehensive coffee shop management tool designed to simplify daily operations and enhance staff communication.

## Features

### Schedule Management
- **Monthly Staff Scheduling**: Visual calendar interface for managing staff schedules
- **Shift Tracking & Statistics**: Real-time shift monitoring and analytics
- **Morning Shift Pickup Coordination**: Automated pickup statistics and coordination
- **API Endpoints**: RESTful APIs for automated pickup statistics integration

### Sandwich Calculator
- **Smart Bread Calculation**: Automatically calculates required bread slices
- **Extra Allocation**: Configurable target quantities with automatic extra slice allocation
- **Real-time Updates**: Instant calculations as you adjust quantities

### Cashier Management
- **Cash Counting System**: Denomination-based cash counting with visual interface
- **Foreign Currency Conversion**: Multi-currency support with real-time rates
- **Daily Reconciliation**: Automated daily cash reconciliation calculations
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Smart Communication System
- **Intelligent Message Generation**: AI-powered message system based on schedule data
- **Custom Rule Management**: Time-based, day-based, and date-specific message rules
- **Consecutive Work Day Recognition**: Automatic detection and greeting for staff working consecutive days
- **Schedule-based Greetings**: Dynamic greetings based on current shift assignments
- **Real-time Updates**: Messages update automatically based on schedule changes

### Admin Panel
- **Comprehensive Management**: Full administrative control over all system features
- **User Management**: Staff account and permission management
- **Data Analytics**: Detailed reports and statistics
- **System Configuration**: Global settings and preferences management

## Technologies

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Recharts** - Data visualization library

### Backend & Database
- **Firebase**
  - **Firestore** - NoSQL cloud database
  - **Authentication** - User authentication and authorization
  - **Cloud Functions** - Serverless backend functions
  - **Hosting** - Static site hosting

### Development Tools
- **ESLint** - Code linting and quality assurance
- **PostCSS** - CSS processing
- **GitHub Pages** - Production deployment

## Live Demo

Visit the live application: [https://greedysisyphus.github.io/Brainless/](https://greedysisyphus.github.io/Brainless/)

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/greedysisyphus/Brainless.git
   cd Brainless
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Configuration**
   - Create a new Firebase project
   - Enable Firestore Database
   - Enable Authentication
   - Copy your Firebase config to `src/utils/firebase.js`

4. **Environment Setup**
   ```bash
   # Create environment file
   cp .env.example .env.local
   # Add your Firebase configuration
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

## Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Firestore Database
3. Set up Firestore security rules
4. Configure authentication providers
5. Deploy Cloud Functions (if needed)

### Environment Variables
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Features in Detail

### Smart Message System
The intelligent communication system automatically generates contextual messages based on:
- **Time-based rules**: Messages triggered by specific time ranges
- **Day-based rules**: Messages for specific days of the week
- **Schedule-based greetings**: Dynamic greetings based on current staff assignments
- **Consecutive work recognition**: Special greetings for staff working multiple consecutive days

### Responsive Design
- **Desktop**: Full-featured interface with advanced management tools
- **Tablet**: Optimized layout for iPad and similar devices
- **Mobile**: Touch-friendly interface for on-the-go access

### Real-time Updates
- **Live schedule updates**: Changes reflect immediately across all users
- **Real-time messaging**: Instant message generation and updates
- **Live statistics**: Real-time analytics and reporting

## API Endpoints

### Pickup Statistics
```
GET /api/pickup-stats
```
Returns pickup statistics for morning shifts.

### Schedule Data
```
GET /api/schedule
```
Returns current month's schedule data.

### Staff Information
```
GET /api/staff
```
Returns staff information and assignments.

## Use Cases

### Coffee Shop Owners
- Manage staff schedules efficiently
- Track daily operations and cash flow
- Monitor staff performance and attendance
- Generate reports for business analysis

### Baristas & Staff
- View personal schedules and assignments
- Access pickup coordination information
- Use cash counting tools for daily operations
- Receive intelligent greetings and notifications

### Managers
- Comprehensive administrative control
- Real-time monitoring of all operations
- Data-driven decision making
- Automated communication management

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with love for the coffee community
- Special thanks to all the baristas who inspired this tool
- Powered by modern web technologies and Firebase

---

**Made with coffee by the Brainless Team**