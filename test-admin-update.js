/**
 * Test script to verify admin order status update functionality
 */

const http = require('http');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

// Setup for making authenticated requests
let sessionCookie = '';
let csrfToken = '';

async function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        'Cookie': sessionCookie
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Save session cookie from Set-Cookie header
        if (res.headers['set-cookie']) {
          const cookies = res.headers['set-cookie'];
          cookies.forEach(cookie => {
            if (cookie.includes('sessionId')) {
              sessionCookie = cookie.split(';')[0];
            }
          });
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function extractCSRFToken(html) {
  const match = html.match(/meta name="csrf-token" content="([^"]+)"/);
  return match ? match[1] : null;
}

async function runTests() {
  console.log('🧪 Testing Admin Order Status Update\n');

  try {
    // Step 1: Get admin orders page to extract CSRF token
    console.log('1️⃣  Fetching admin orders page...');
    const adminResponse = await makeRequest('GET', '/orders/admin/all');

    if (adminResponse.statusCode !== 200) {
      console.error('❌ Failed to fetch admin orders page. Status:', adminResponse.statusCode);
      console.error('Make sure you\'re logged in as an admin');
      process.exit(1);
    }

    csrfToken = await extractCSRFToken(adminResponse.body);
    if (!csrfToken) {
      console.error('❌ CSRF token not found in admin orders page');
      console.error('Response:', adminResponse.body.substring(0, 500));
      process.exit(1);
    }
    console.log('✅ Got CSRF token:', csrfToken.substring(0, 20) + '...');

    // Step 2: Update order status
    console.log('\n2️⃣  Updating order 1 status from "pending" to "processing"...');

    const updateBody = {
      status: 'processing',
      _csrf: csrfToken
    };

    const updateResponse = await makeRequest(
      'POST',
      '/orders/1/status',
      updateBody,
      {
        'x-csrf-token': csrfToken
      }
    );

    console.log('Response status:', updateResponse.statusCode);
    console.log('Response body:', updateResponse.body);

    if (updateResponse.statusCode === 200) {
      console.log('✅ Order status updated successfully!');

      // Parse response to verify
      const responseData = JSON.parse(updateResponse.body);
      console.log('Order status is now:', responseData.order?.status);
    } else if (updateResponse.statusCode === 403) {
      console.error('❌ CSRF token validation failed (403 Forbidden)');
      console.error('Response:', updateResponse.body);
    } else {
      console.error('❌ Status update failed with status:', updateResponse.statusCode);
      console.error('Response:', updateResponse.body);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Test completed');
  process.exit(0);
}

// Note: This test assumes you're already logged in as admin
// If not, you need to login first or modify this script to handle login
console.log('ℹ️  Note: Make sure you have an active admin session first');
console.log('ℹ️  Waiting 2 seconds before starting test...\n');

setTimeout(runTests, 2000);
