# Voter Routes API Documentation

This document describes the voter management API endpoints for the voting system.

## Base URL

```
http://localhost:3000/api/voter
```

## Authentication

Protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Add Voter

**POST** `/add`

Add a new voter to the system with email, voterId, and electionId.

**Request Body:**

```json
{
  "email": "voter@example.com",
  "voterId": "voter123",
  "electionId": "election2024"
}
```

**Response:**

```json
{
  "message": "Voter added successfully",
  "voter": {
    "id": 1,
    "email": "voter@example.com",
    "voterId": "voter123",
    "electionId": "election2024"
  }
}
```

### 2. Register Voter

**POST** `/register`

Register a voter with a password. The voter must already exist in the system.

**Request Body:**

```json
{
  "email": "voter@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "message": "Voter registered successfully"
}
```

### 3. Login Voter

**POST** `/login`

Authenticate a voter and receive a JWT token.

**Request Body:**

```json
{
  "email": "voter@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "voter": {
    "email": "voter@example.com",
    "voterId": "voter123",
    "electionId": "election2024"
  }
}
```

### 4. Get Voter Profile (Protected)

**GET** `/profile`

Get the current voter's profile information. Requires authentication.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "voter": {
    "id": 1,
    "email": "voter@example.com",
    "voterId": "voter123",
    "electionId": "election2024",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Get All Voters

**GET** `/all`

Get a list of all voters in the system (admin endpoint).

**Response:**

```json
{
  "voters": [
    {
      "id": 1,
      "email": "voter1@example.com",
      "voterId": "voter123",
      "electionId": "election2024",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Missing required fields: email, voterId, electionId"
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid credentials"
}
```

### 404 Not Found

```json
{
  "error": "Voter not found. Please contact administrator to be added to the system."
}
```

### 409 Conflict

```json
{
  "error": "Voter already exists for this election"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to add voter"
}
```

## Database Schema

The voter data is stored in the `voter_data` table with the following structure:

- `id`: Primary key (auto-increment)
- `voterId`: Voter identifier
- `email`: Unique email address
- `password`: Hashed password (nullable)
- `ci`: Ciphertext (nullable)
- `auxi`: Auxiliary value (nullable)
- `electionId`: Election identifier
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

**Constraints:**

- `email` is unique
- `voterId` + `electionId` combination is unique
- `password` is hashed using bcrypt

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
2. **JWT Authentication**: Tokens contain voter email, voterId, and electionId
3. **Token Expiration**: JWT tokens expire after 24 hours
4. **Input Validation**: All required fields are validated
5. **Unique Constraints**: Prevents duplicate voters per election

## Testing

Run the test script to verify all endpoints:

```bash
node test-voter-routes.js
```

Make sure the server is running on port 3000 before running the tests.
