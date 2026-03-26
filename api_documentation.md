# TerraTrack API Documentation

## Base URL
`https://api.terrasocial.dummy` (or the value of `VITE_API_BASE_URL` in your [.env](file:///Users/saismaran/TERRA-Social/.env) file).

## Authentication
All endpoints except `/auth/login` and `/auth/register` require a valid JWT token to be passed in the `Authorization` header as `Bearer <token>`.

---

## Endpoints

### 1. Authentication

#### `POST /auth/login`
Authenticates a user and returns a JWT token.
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:** `200 OK`
```json
{
  "success": true,
  "token": "ey...",
  "user": {
    "id": "123",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

#### `POST /auth/register`
Registers a new user.
**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:** `201 Created`
```json
{
  "success": true,
  "token": "ey...",
  "user": {
    "id": "123",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

---

### 2. User Profile

#### `GET /users/me`
Retrieves the profile and stats of the currently authenticated user.
**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "bio": "Software engineer turning the world greener.",
    "memberSince": "Aug 2026",
    "avatar": "JD",
    "stats": {
      "treesPlanted": 142,
      "co2Saved": 4520,
      "guildsActive": 3,
      "globalRank": 89,
      "totalScore": 12450,
      "level": "Level 12 Eco Warrior"
    },
    "heatmap": [2, 4, 1, 0, 5, ...],
    "activities": [
      { "id": 1, "desc": "Planted an Oak tree in Brazil", "time": "2 hours ago", "points": "+50" }
    ],
    "timeline": [
      { "date": "Oct 24, 2026", "title": "Reached Level 12", "desc": "Promoted to Eco Warrior rank" }
    ]
  }
}
```

---

### 3. Trees

#### `GET /trees`
Retrieves a list of trees planted globally for the map view.
**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    { "id": 1, "top": "40%", "left": "20%", "label": "Amazon Reforestation" },
    { "id": 2, "top": "35%", "left": "50%", "label": "European Green Belt" }
  ],
  "totalTrees": 4520391
}
```

#### `POST /trees`
Logs a new tree planted by the user.
**Request Body:** Form Data (multipart/form-data)
- `type`: String (e.g., 'oak')
- `latitude`: Number
- `longitude`: Number
- `notes`: String
- `image`: File (optional)

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Tree successfully planted",
  "pointsAdded": 50
}
```

---

### 4. Guilds

#### `GET /guilds`
Retrieves a list of available guilds.
**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Eco Warriors LA",
      "members": 1240,
      "target": "Plant 10k Trees by 2027",
      "joined": false,
      "image": "https://images.unsplash.com/..."
    }
  ]
}
```

#### `POST /guilds/:id/join`
Joins or leaves a specific guild.
**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Successfully joined the guild."
}
```

---

### 5. Leaderboard

#### `GET /leaderboard`
Retrieves the global user leaderboard.
**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    { "rank": 1, "name": "Elena R.", "score": 145200, "level": "Earth Guardian", "avatar": "ER" },
    { "rank": 2, "name": "Marcus T.", "score": 132450, "level": "Forest Master", "avatar": "MT" },
    { "rank": 89, "name": "John Doe", "score": 12450, "level": "Eco Warrior", "avatar": "JD", "isCurrentUser": true }
  ]
}
```
