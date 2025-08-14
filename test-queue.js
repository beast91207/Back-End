// Comprehensive test script for enhanced queue functionality
const EventSource = require('eventsource');

// Testing Enhanced Queue System...

let eventSource;
let testResults = {
  sseConnection: false,
  queueJoin: false,
  queuePosition: false,
  robotControl: false,
  queueLeave: false,
  adminClear: false
};

// Test SSE connection
function testSSEConnection() {
  // Testing SSE Connection...
  
  eventSource = new EventSource('http://localhost:3000/api/queue/updates');
  
  eventSource.onopen = () => {
    // SSE connection opened
    testResults.sseConnection = true;
  };
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // SSE Update received
  };
  
  eventSource.onerror = (error) => {
    // SSE connection error
  };
}

// Test queue join
async function testQueueJoin() {
  // Testing Queue Join...
  
  try {
    const response = await fetch('http://localhost:3000/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com' })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Queue join successful
      testResults.queueJoin = true;
    } else {
      const error = await response.json();
      // Queue join response
    }
  } catch (error) {
    // Queue join error
  }
}

// Test queue position
async function testQueuePosition() {
  // Testing Queue Position...
  
  try {
    const response = await fetch('http://localhost:3000/api/queue/position/test1@example.com');
    
    if (response.ok) {
      const data = await response.json();
      // Queue position successful
      testResults.queuePosition = true;
    } else {
      const error = await response.json();
      // Queue position response
    }
  } catch (error) {
    // Queue position error
  }
}

// Test robot control
async function testRobotControl() {
  // Testing Robot Control...
  
  try {
    const response = await fetch('http://localhost:3000/api/robot/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com' })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Robot start successful
      testResults.robotControl = true;
    } else {
      const error = await response.json();
      // Robot start response
    }
  } catch (error) {
    // Robot control error
  }
}

// Test queue leave
async function testQueueLeave() {
  // Testing Queue Leave...
  
  try {
    const response = await fetch('http://localhost:3000/api/queue/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com' })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Queue leave successful
      testResults.queueLeave = true;
    } else {
      const error = await response.json();
      // Queue leave response
    }
  } catch (error) {
    // Queue leave error
  }
}

// Test admin clear queue
async function testAdminClear() {
  // Testing Admin Clear Queue...
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/clear-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'admin123' })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Admin clear successful
      testResults.adminClear = true;
    } else {
      const error = await response.json();
      // Admin clear response
    }
  } catch (error) {
    // Admin clear error
  }
}

// Test multiple users joining
async function testMultipleUsers() {
  // Testing Multiple Users...
  
  const users = ['user1@test.com', 'user2@test.com', 'user3@test.com'];
  
  for (const user of users) {
    try {
      const response = await fetch('http://localhost:3000/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user })
      });
      
      if (response.ok) {
        const data = await response.json();
        // User joined successfully
      } else {
        const error = await response.json();
        // User join failed
      }
    } catch (error) {
      // User join error
    }
    
    // Small delay between joins
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Test invalid email
async function testInvalidEmail() {
  // Testing Invalid Email...
  
  try {
    const response = await fetch('http://localhost:3000/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email' })
    });
    
    if (!response.ok) {
      const error = await response.json();
      // Invalid email properly rejected
    } else {
      // Invalid email was accepted (should be rejected)
    }
  } catch (error) {
    // Invalid email test error
  }
}

// Test duplicate join
async function testDuplicateJoin() {
  // Testing Duplicate Join...
  
  try {
    // First join
    const response1 = await fetch('http://localhost:3000/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'duplicate@test.com' })
    });
    
    if (response1.ok) {
      // First join successful
      
      // Second join (should fail)
      const response2 = await fetch('http://localhost:3000/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'duplicate@test.com' })
      });
      
      if (!response2.ok) {
        const error = await response2.json();
        // Duplicate join properly rejected
      } else {
        // Duplicate join was accepted (should be rejected)
      }
    }
  } catch (error) {
    // Duplicate join test error
  }
}

// Print test results
function printResults() {
  // Test Results:
  // ================
  
  Object.entries(testResults).forEach(([test, passed]) => {
    const status = passed ? 'PASS' : 'FAIL';
    // Test status
  });
  
  const passedCount = Object.values(testResults).filter(Boolean).length;
  const totalCount = Object.keys(testResults).length;
  
  // Overall test results
  
  if (eventSource) {
    eventSource.close();
  }
  
  process.exit(0);
}

// Run all tests
async function runAllTests() {
  testSSEConnection();
  
  // Wait for SSE connection
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testQueueJoin();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testQueuePosition();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testRobotControl();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testQueueLeave();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testAdminClear();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testMultipleUsers();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testInvalidEmail();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testDuplicateJoin();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  printResults();
}

// Start tests
runAllTests().catch(() => {});
