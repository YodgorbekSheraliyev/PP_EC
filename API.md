# API Documentation

## Overview

This document provides detailed API endpoint reference for the SecureShop E-Commerce Application. All endpoints follow RESTful conventions and return JSON responses.

## Base URL

```
Development: http://localhost:5000
Production: https://your-domain.com
```

## Authentication

### Session-Based (Web)

All protected endpoints require an active session cookie. Sessions are obtained by logging in.

**Login Flow:**
1. POST `/auth/login` with credentials
2. Server sets `sessionId` cookie
3. Include cookie in subsequent requests

### JWT Token (API)

For API clients without cookies, use JWT tokens.

**Token Endpoints:**
- POST `/auth/api/login` - Get JWT token
- Include in header: `Authorization: Bearer <token>`

## Response Format

### Successful Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "status": 400
}
```

**HTTP Status Codes:**
- 200: OK
- 201: Created
- 302: Redirect
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

---

## Authentication Endpoints

### Register User

**Endpoint:** `POST /auth/register`

**Description:** Create a new customer account

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules:**
- `username`: 3-50 characters, alphanumeric + underscore only
- `email`: Valid email format
- `password`: 8+ characters, uppercase, lowercase, number, special char (@$!%*?&)

**Response:** Redirect to home page (302)

**Example:**
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=johndoe&email=john@example.com&password=SecurePass123!"
```

---

### Login User

**Endpoint:** `POST /auth/login`

**Description:** Authenticate user and create session

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
- Success: Redirect with session cookie (302)
- Failure: 200 with error message

**Example:**
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=john@example.com&password=SecurePass123!" \
  -c cookies.txt
```

---

### Login (API/JWT)

**Endpoint:** `POST /auth/api/login`

**Description:** Authenticate and get JWT token

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "username": "johndoe",
    "role": "customer"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/auth/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123!"}'
```

---

### Logout

**Endpoint:** `POST /auth/logout`

**Description:** Destroy session and logout user

**Authentication:** Required (session)

**Response:** Redirect to home page (302)

**Example:**
```bash
curl -X POST http://localhost:5000/auth/logout \
  -b cookies.txt
```

---

### Get Profile

**Endpoint:** `GET /auth/profile`

**Description:** Get current user profile

**Authentication:** Required (session)

**Response:**
```html
<!-- Renders profile page with user details -->
```

**Example:**
```bash
curl -X GET http://localhost:5000/auth/profile \
  -b cookies.txt
```

---

### Update Profile

**Endpoint:** `POST /auth/profile`

**Description:** Update user profile information

**Authentication:** Required (session)

**Request Body:**
```json
{
  "username": "newusername",
  "email": "newemail@example.com"
}
```

**Response:** Redirect with success message (302)

**Example:**
```bash
curl -X POST http://localhost:5000/auth/profile \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=newusername&email=newemail@example.com" \
  -b cookies.txt
```

---

## Product Endpoints

### List Products

**Endpoint:** `GET /products`

**Description:** Get paginated list of products with optional filtering

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `category`: Filter by category (optional)
- `search`: Search by name (optional)

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Wireless Headphones",
      "price": 199.99,
      "category": "Electronics",
      "stock_quantity": 50,
      "image_url": "/images/product.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Example:**
```bash
curl "http://localhost:5000/products?category=Electronics&page=1"
```

---

### Get Product Details

**Endpoint:** `GET /products/:id`

**Description:** Get detailed information about a specific product

**Parameters:**
- `id`: Product ID (integer)

**Response:**
```json
{
  "success": true,
  "product": {
    "id": 1,
    "name": "Wireless Headphones",
    "description": "Premium quality wireless headphones with...",
    "price": 199.99,
    "stock_quantity": 50,
    "category": "Electronics",
    "image_url": "/images/product.jpg",
    "created_at": "2025-01-05T10:00:00Z"
  }
}
```

**Example:**
```bash
curl http://localhost:5000/products/1
```

---

## Cart Endpoints

### View Cart

**Endpoint:** `GET /cart`

**Description:** Get current user's shopping cart

**Authentication:** Required (session)

**Response:**
```html
<!-- Renders cart page with items -->
```

**Example:**
```bash
curl http://localhost:5000/cart -b cookies.txt
```

---

### Add to Cart

**Endpoint:** `POST /cart/add`

**Description:** Add product to cart or increase quantity if exists

**Authentication:** Required (session)

**Request Body:**
```json
{
  "product_id": 1,
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "itemCount": 5,
  "message": "Item added to cart"
}
```

**Validation:**
- `product_id`: Required, valid integer
- `quantity`: Required, integer >= 1
- Product must be in stock

**Example:**
```bash
curl -X POST http://localhost:5000/cart/add \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":2}' \
  -b cookies.txt
```

---

### Update Cart Item

**Endpoint:** `POST /cart/:productId/update`

**Description:** Update quantity of cart item

**Authentication:** Required (session)

**Parameters:**
- `productId`: Product ID (integer)

**Request Body:**
```json
{
  "quantity": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cart updated",
  "newTotal": 249.95
}
```

**Validation:**
- `quantity`: Integer >= 1
- Set to 0 to remove item

**Example:**
```bash
curl -X POST http://localhost:5000/cart/1/update \
  -H "Content-Type: application/json" \
  -d '{"quantity":5}' \
  -b cookies.txt
```

---

### Remove from Cart

**Endpoint:** `POST /cart/:productId/remove`

**Description:** Remove product from cart

**Authentication:** Required (session)

**Parameters:**
- `productId`: Product ID (integer)

**Response:**
```json
{
  "success": true,
  "itemCount": 2,
  "message": "Item removed from cart"
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/cart/1/remove \
  -b cookies.txt
```

---

### Get Cart Summary

**Endpoint:** `GET /cart/summary`

**Description:** Get cart totals without rendering full page

**Authentication:** Required (session)

**Response:**
```json
{
  "success": true,
  "itemCount": 3,
  "total": 299.97,
  "items": [
    {
      "productId": 1,
      "name": "Wireless Headphones",
      "price": 199.99,
      "quantity": 1
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:5000/cart/summary \
  -b cookies.txt
```

---

## Order Endpoints

### Checkout

**Endpoint:** `GET /orders/checkout`

**Description:** Show checkout form

**Authentication:** Required (session)

**Requirements:**
- Cart must have items
- User must be authenticated

**Response:**
```html
<!-- Renders checkout page with form -->
```

**Example:**
```bash
curl http://localhost:5000/orders/checkout \
  -b cookies.txt
```

---

### Create Order

**Endpoint:** `POST /orders/checkout`

**Description:** Process checkout and create order

**Authentication:** Required (session)

**Request Body:**
```json
{
  "shipping_address": "123 Main St, Anytown, ST 12345",
  "payment_method": "credit_card"
}
```

**Validation:**
- `shipping_address`: 10-500 characters, required
- `payment_method`: Must be one of ['credit_card', 'debit_card', 'paypal', 'bank_transfer']
- Cart must not be empty
- Products must be in stock

**Response:** Redirect to order details (302)

**Example:**
```bash
curl -X POST http://localhost:5000/orders/checkout \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "shipping_address=123%20Main%20St&payment_method=credit_card" \
  -b cookies.txt
```

---

### Get Order History

**Endpoint:** `GET /orders`

**Description:** Get current user's orders

**Authentication:** Required (session)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (optional)

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "total_amount": 299.98,
      "status": "delivered",
      "created_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

**Example:**
```bash
curl "http://localhost:5000/orders?status=delivered" \
  -b cookies.txt
```

---

### Get Order Details

**Endpoint:** `GET /orders/:id`

**Description:** Get detailed information about a specific order

**Authentication:** Required (session)

**Parameters:**
- `id`: Order ID (integer)

**Security:** Users can only view their own orders

**Response:**
```json
{
  "success": true,
  "order": {
    "id": 1,
    "user_id": 1,
    "total_amount": 299.98,
    "shipping_address": "123 Main St, Anytown, ST 12345",
    "payment_method": "credit_card",
    "status": "pending",
    "items": [
      {
        "product_id": 1,
        "name": "Wireless Headphones",
        "quantity": 1,
        "price": 199.99
      }
    ],
    "created_at": "2025-01-05T10:00:00Z"
  }
}
```

**Example:**
```bash
curl http://localhost:5000/orders/1 \
  -b cookies.txt
```

---

### Update Order Status (Admin)

**Endpoint:** `POST /orders/:id/status`

**Description:** Update order status (admin only)

**Authentication:** Required (admin session)

**Parameters:**
- `id`: Order ID (integer)

**Request Body:**
```json
{
  "status": "shipped"
}
```

**Valid Statuses:**
- `pending`
- `processing`
- `shipped`
- `delivered`
- `cancelled`

**Response:**
```json
{
  "success": true,
  "message": "Order status updated",
  "order": {
    "id": 1,
    "status": "shipped"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped"}' \
  -b cookies.txt
```

---

## Admin Endpoints

### Get Dashboard

**Endpoint:** `GET /admin`

**Description:** Admin dashboard with statistics

**Authentication:** Required (admin session)

**Response:**
```html
<!-- Renders admin dashboard -->
```

**Dashboard includes:**
- Total users
- Total products
- Total orders
- Total revenue
- Recent orders

**Example:**
```bash
curl http://localhost:5000/admin \
  -b cookies.txt
```

---

### Get Analytics

**Endpoint:** `GET /admin/analytics`

**Description:** Sales analytics and reports

**Authentication:** Required (admin session)

**Query Parameters:**
- `period`: 'month', 'quarter', 'year' (default: 'month')
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Response:**
```html
<!-- Renders analytics page with charts -->
```

**Includes:**
- Revenue charts
- Top-selling products
- Order trends
- Customer statistics

**Example:**
```bash
curl "http://localhost:5000/admin/analytics?period=month" \
  -b cookies.txt
```

---

### Get Security Logs

**Endpoint:** `GET /admin/logs`

**Description:** View security and audit logs

**Authentication:** Required (admin session)

**Query Parameters:**
- `limit`: Number of logs (default: 50, max: 500)
- `filter`: Log type filter (optional)

**Response:**
```html
<!-- Renders logs page -->
```

**Logged Events:**
- Login attempts (success/failure)
- Access denied attempts
- Admin operations
- Account lockouts

**Example:**
```bash
curl "http://localhost:5000/admin/logs?limit=100" \
  -b cookies.txt
```

---

### List Users

**Endpoint:** `GET /admin/users`

**Description:** List all users

**Authentication:** Required (admin session)

**Query Parameters:**
- `page`: Page number (default: 1)
- `role`: Filter by role (optional)

**Response:**
```html
<!-- Renders users list page -->
```

**Example:**
```bash
curl "http://localhost:5000/admin/users?role=customer" \
  -b cookies.txt
```

---

### Update User Role

**Endpoint:** `POST /admin/users/:id/role`

**Description:** Change user role

**Authentication:** Required (admin session)

**Parameters:**
- `id`: User ID (integer)

**Request Body:**
```json
{
  "role": "admin"
}
```

**Valid Roles:**
- `customer`
- `admin`

**Response:**
```json
{
  "success": true,
  "message": "User role updated",
  "user": {
    "id": 1,
    "role": "admin"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/admin/users/1/role \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}' \
  -b cookies.txt
```

---

## Admin Product Management

### List Products (Admin)

**Endpoint:** `GET /products/admin`

**Description:** List all products with edit/delete options

**Authentication:** Required (admin session)

**Response:**
```html
<!-- Renders admin product list -->
```

**Example:**
```bash
curl http://localhost:5000/products/admin \
  -b cookies.txt
```

---

### New Product Form

**Endpoint:** `GET /products/admin/new`

**Description:** Show new product form

**Authentication:** Required (admin session)

**Response:**
```html
<!-- Renders product form -->
```

**Example:**
```bash
curl http://localhost:5000/products/admin/new \
  -b cookies.txt
```

---

### Create Product

**Endpoint:** `POST /products/admin`

**Description:** Create new product

**Authentication:** Required (admin session)

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description (10-1000 chars)",
  "price": 99.99,
  "stock_quantity": 100,
  "category": "Electronics",
  "image_url": "/images/product.jpg"
}
```

**Validation:**
- `name`: 1-100 characters, required
- `description`: 10-1000 characters, required
- `price`: Float >= 0, required
- `stock_quantity`: Integer >= 0, required
- `category`: 1-50 characters, required
- `image_url`: Valid URL or relative path (optional)

**Response:** Redirect to product list (302)

**Example:**
```bash
curl -X POST http://localhost:5000/products/admin \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=New%20Product&description=A%20great%20product&price=99.99&stock_quantity=100&category=Electronics" \
  -b cookies.txt
```

---

### Edit Product

**Endpoint:** `POST /products/admin/:id`

**Description:** Update product information

**Authentication:** Required (admin session)

**Parameters:**
- `id`: Product ID (integer)

**Request Body:**
```json
{
  "name": "Updated Product",
  "description": "Updated description",
  "price": 109.99,
  "stock_quantity": 95,
  "category": "Electronics",
  "image_url": "/images/updated.jpg"
}
```

**Response:** Redirect to product list (302)

**Example:**
```bash
curl -X POST http://localhost:5000/products/admin/1 \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=Updated&price=109.99" \
  -b cookies.txt
```

---

### Delete Product

**Endpoint:** `POST /products/admin/:id/delete`

**Description:** Delete a product

**Authentication:** Required (admin session)

**Parameters:**
- `id`: Product ID (integer)

**Response:** Redirect to product list (302)

**Example:**
```bash
curl -X POST http://localhost:5000/products/admin/1/delete \
  -b cookies.txt
```

---

## Error Handling

### Common Error Responses

**Validation Error (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Unauthorized (401):**
```json
{
  "success": false,
  "message": "Authentication required",
  "status": 401
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "message": "Access denied",
  "status": 403
}
```

**Not Found (404):**
```json
{
  "success": false,
  "message": "Resource not found",
  "status": 404
}
```

**Rate Limited (429):**
```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "status": 429
}
```

**Server Error (500):**
```json
{
  "success": false,
  "message": "An error occurred processing your request",
  "status": 500
}
```

---

## Rate Limiting

All endpoints are subject to rate limiting:

- **Global**: 300 requests per IP per 15 minutes
- **Auth routes**: 5 attempts per IP per 15 minutes

Rate limit headers in response:
```
RateLimit-Limit: 300
RateLimit-Remaining: 298
RateLimit-Reset: 1609862400
```

---

## Security Features

All endpoints implement:

- **CSRF Protection**: POST requests require CSRF token
- **Input Validation**: All inputs validated
- **SQL Injection Protection**: Parameterized queries via Sequelize ORM
- **XSS Protection**: Handlebars auto-escaping
- **Authentication**: Session or JWT required for protected routes
- **Authorization**: Role-based access control enforced
- **Rate Limiting**: Per-IP request throttling
- **Logging**: All access logged with IP and user context

---

## Testing with cURL

**Add CSRF Token to requests:**
```bash
# Get CSRF token from form page
curl -c cookies.txt -b cookies.txt http://localhost:5000/auth/login

# Use token in POST request
curl -X POST http://localhost:5000/auth/login \
  -b cookies.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=user@example.com&password=pass&_csrf=<token>"
```

---

**Last Updated:** January 5, 2025
**API Version:** 1.0
**Document Status:** Final
