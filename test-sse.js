// Simple test script to verify SSE functionality
const EventSource = require('eventsource');

// Testing SSE connection...

const eventSource = new EventSource('http://localhost:3000/api/queue/updates');

eventSource.onopen = () => {
  // SSE connection opened
};

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Received SSE message
};

eventSource.onerror = (error) => {
  // SSE connection error
};

// Test queue join
setTimeout(async () => {
  // Testing queue join...
  try {
    const response = await fetch('http://localhost:3000/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    const data = await response.json();
          // Queue join response received
    } catch (error) {
      // Queue join error
    }
}, 1000);

// Test robot control
setTimeout(async () => {
  // Testing robot start...
  try {
    const response = await fetch('http://localhost:3000/api/robot/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
          // Robot start response received
    } catch (error) {
      // Robot start error
    }
}, 2000);

// Close connection after 5 seconds
setTimeout(() => {
  // Closing SSE connection...
  eventSource.close();
  process.exit(0);
}, 5000);
