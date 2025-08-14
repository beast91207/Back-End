# SmartClean Live Backend

A Node.js/Express backend for the SmartClean Live robot control demo application with real-time queue management using Server-Sent Events (SSE).

## Features

- **Real-time Queue Management**: Users can join/leave a queue to control the robot
- **Server-Sent Events (SSE)**: Real-time updates to all connected clients
- **Robot Control**: Start, stop, and reboot robot commands
- **Turn-based Access**: Only one user can control the robot at a time
- **Auto-turn Management**: Automatic turn ending after 4 minutes

## Installation

```bash
npm install
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Test SSE Functionality
```bash
npm run test-sse
```

## API Endpoints

### Queue Management

#### `POST /api/queue/join`
Join the robot control queue.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "queueCount": 3
}
```

#### `POST /api/queue/leave`
Leave the robot control queue.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### `GET /api/queue/status`
Get current queue status.

**Response:**
```json
{
  "queueCount": 2,
  "currentTurn": "user@example.com",
  "robotStatus": "idle",
  "queue": ["user@example.com", "another@example.com"]
}
```

### Robot Control

#### `POST /api/robot/start`
Start the robot cleaning (requires active turn).

**Response:**
```json
{
  "status": "success",
  "message": "Robot started cleaning"
}
```

#### `POST /api/robot/stop`
Stop the robot (requires active turn).

**Response:**
```json
{
  "status": "success",
  "message": "Robot stopped"
}
```

#### `POST /api/robot/reboot`
Reboot the robot (requires active turn).

**Response:**
```json
{
  "status": "success",
  "message": "Robot rebooting"
}
```

### Server-Sent Events

#### `GET /api/queue/updates`
Real-time updates stream for queue and robot status changes.

**Event Data Format:**
```json
{
  "queueCount": 2,
  "currentTurn": "user@example.com",
  "robotStatus": "cleaning",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Health Check

#### `GET /api/health`
Server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "activeClients": 5,
  "queueLength": 2,
  "currentUser": "user@example.com",
  "robotStatus": "idle"
}
```

## Robot Status Values

- `idle`: Robot is ready but not cleaning
- `cleaning`: Robot is actively cleaning
- `stopped`: Robot has been stopped
- `rebooting`: Robot is rebooting

## Queue Management Logic

1. **Joining Queue**: Users can join with a unique email
2. **Turn Assignment**: First user in queue gets immediate access
3. **Turn Duration**: Each turn lasts 4 minutes maximum
4. **Auto-advance**: Turns automatically advance to next user
5. **Manual Leave**: Users can leave queue at any time

## SSE Implementation

The server uses Server-Sent Events to provide real-time updates to all connected clients:

- **Connection Management**: Tracks active client connections
- **Event Broadcasting**: Sends updates when queue or robot status changes
- **Error Handling**: Automatically removes disconnected clients
- **CORS Support**: Handles cross-origin requests properly

## Environment Variables

- `PORT`: Server port (default: 3000)

## Testing

Use the included test script to verify SSE functionality:

```bash
npm run test-sse
```

This will:
1. Connect to the SSE endpoint
2. Join the queue with a test email
3. Test robot control commands
4. Display all received events

## CORS Configuration

The server is configured to allow cross-origin requests for development. In production, you should configure specific origins:

```javascript
app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true
}));
```
