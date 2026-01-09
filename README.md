# Ethio Livestock Development Platform - Backend

A comprehensive backend API for the Ethio Livestock Development Platform built with Node.js, Express, and Sequelize with MySQL.

## Features

- **Role-Based Access Control (RBAC)** - Admin, Seller, Buyer, and Agent roles
- **JWT Authentication** - Secure token-based authentication
- **OTP Verification** - Phone-based login with OTP for buyers
- **Product Management** - CRUD operations with admin approval workflow
- **Order Processing** - Transactional checkout with cart functionality
- **Delivery Management** - OTP/QR code verification for secure handover
- **Qercha (Shared Purchase)** - Group buying feature for livestock
- **File Uploads** - Multi-part form data handling for product images

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Sequelize** - ORM for MySQL
- **MySQL** - Primary database
- **JWT** - Token-based authentication
- **Bcrypt** - Password and OTP hashing
- **Multer** - File upload middleware

## Project Structure

```
backend/
├── config/          # Database and JWT configuration
├── models/          # Sequelize models
├── controllers/     # Business logic
├── routes/          # API routes
├── middleware/      # Custom middleware (auth, roles, error handling)
├── utils/           # Utility functions (OTP, response handlers)
├── uploads/         # Uploaded files storage
├── server.js        # Entry point
└── package.json
```

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   Edit `.env` file with your database credentials and JWT secret.

5. **Create MySQL database**
   ```sql
   CREATE DATABASE ethio_livestock_db;
   ```

6. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## Environment Variables

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=ethio_livestock_db
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=your_secret_key
JWT_EXPIRE=7d

OTP_EXPIRE_MINUTES=10
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login/phone` - Buyer login (OTP)
- `POST /api/v1/auth/login/email` - Seller/Agent login
- `POST /api/v1/auth/verify-otp` - Verify OTP

### Products
- `GET /api/v1/products` - Browse products (public)
- `GET /api/v1/products/:id` - Get product details
- `POST /api/v1/products/seller/products` - Create product (Seller)
- `PUT /api/v1/products/seller/products/:id` - Update product (Seller)
- `DELETE /api/v1/products/seller/products/:id` - Delete product (Seller)

### Categories
- `GET /api/v1/categories` - Get all categories
- `POST /api/v1/categories` - Create category (Admin)
- `POST /api/v1/categories/subcategories` - Create subcategory (Admin)

### Orders
- `POST /api/v1/orders/checkout` - Create order (Buyer)
- `GET /api/v1/orders` - Get user orders
- `GET /api/v1/orders/:id` - Get order details

### Deliveries
- `POST /api/v1/deliveries/assign` - Assign delivery (Admin)
- `GET /api/v1/deliveries/agent/:agentId` - Get agent deliveries
- `POST /api/v1/deliveries/start/:deliveryId` - Start trip (Agent)
- `POST /api/v1/deliveries/handover/:deliveryId` - Verify handover (Agent)

### Admin
- `GET /api/v1/admin/dashboard` - Dashboard statistics
- `GET /api/v1/admin/products/pending` - Pending products
- `PUT /api/v1/admin/products/:id/approve` - Approve product
- `PUT /api/v1/admin/products/:id/reject` - Reject product

### Qercha (Shared Purchase)
- `POST /api/v1/qercha/packages` - Create package
- `POST /api/v1/qercha/packages/:id/join` - Join package
- `GET /api/v1/qercha/packages` - Get available packages

## Database Models

- **Users** - Admin, Seller, Buyer, Agent
- **ProductCategories** - Livestock categories
- **ProductSubcategories** - Detailed classifications
- **Products** - Livestock listings
- **Orders** - Purchase transactions
- **OrderItems** - Individual order products
- **Payments** - Payment records
- **Deliveries** - Logistics tracking
- **QerchaPackages** - Shared purchase groups
- **QerchaParticipants** - Group participants
- **Subscriptions** - Seller plans
- **SellerPayouts** - Commission tracking

## Security Features

- Password hashing with bcrypt
- OTP hashing (never store plain text)
- JWT token authentication
- Role-based authorization
- Input validation
- File type validation for uploads
- Transaction-based operations

## Development

```bash
# Install nodemon for development
npm install -g nodemon

# Run in development mode
npm run dev
```

## Testing

Use Postman, Insomnia, or curl to test endpoints.

Example: Register a new user
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Seller",
    "email": "seller@example.com",
    "password": "password123",
    "phone": "+251912345678"
  }'
```

## License

Copyright © 2025 Kaleb Eyasu

## Author

**Kaleb Eyasu** - Full Stack Software Developer
