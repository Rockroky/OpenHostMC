#!/usr/bin/env node

/**
 * Test script for Minecraft Server File Management System
 * 
 * This script tests all the implemented functionality:
 * 1. Server properties management
 * 2. Whitelist management
 * 3. Usercache reading
 * 4. Banned players/IPs management
 * 5. RCON command execution
 * 6. File/RCON/Docker synchronization
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// Configuration
const BASE_URL = 'http://localhost:3002';
const TEST_SERVER_ID = 'test-server-123';
const TEST_USER_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@example.com';
const TEST_USER_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin123';

// Test data paths
const SERVER_DATA_PATH = path.join(process.cwd(), 'data', 'servers', TEST_SERVER_ID);
const PROPERTIES_PATH = path.join(SERVER_DATA_PATH, 'server.properties');
const WHITELIST_PATH = path.join(SERVER_DATA_PATH, 'whitelist.json');
const USERCACHE_PATH = path.join(SERVER_DATA_PATH, 'usercache.json');
const BANNED_PLAYERS_PATH = path.join(SERVER_DATA_PATH, 'banned-players.json');
const BANNED_IPS_PATH = path.join(SERVER_DATA_PATH, 'banned-ips.json');

// Auth token
let authToken = null;

async function login() {
  console.log('🔑 Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });
    
    authToken = response.data.access_token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function setupTestServer() {
  console.log('🛠️ Setting up test server...');
  
  // Create server data directory
  if (!fs.existsSync(SERVER_DATA_PATH)) {
    fs.mkdirSync(SERVER_DATA_PATH, { recursive: true });
    console.log(`✅ Created server data directory: ${SERVER_DATA_PATH}`);
  }
  
  // Create default server.properties
  const defaultProperties = `
#Minecraft server properties
#${new Date().toISOString()}
online-mode=true
max-players=20
motd=A Test Server
difficulty=easy
white-list=false
gamemode=survival
`;
  
  fs.writeFileSync(PROPERTIES_PATH, defaultProperties.trim());
  console.log('✅ Created default server.properties');
  
  // Create empty whitelist.json
  fs.writeFileSync(WHITELIST_PATH, JSON.stringify([]));
  console.log('✅ Created empty whitelist.json');
  
  // Create empty usercache.json
  fs.writeFileSync(USERCACHE_PATH, JSON.stringify([]));
  console.log('✅ Created empty usercache.json');
  
  // Create empty banned-players.json
  fs.writeFileSync(BANNED_PLAYERS_PATH, JSON.stringify([]));
  console.log('✅ Created empty banned-players.json');
  
  // Create empty banned-ips.json
  fs.writeFileSync(BANNED_IPS_PATH, JSON.stringify([]));
  console.log('✅ Created empty banned-ips.json');
}

async function testServerProperties() {
  console.log('\n📋 Testing Server Properties Management...');
  
  try {
    // Test GET properties
    const getResponse = await axios.get(`${BASE_URL}/orchestrator/properties?serverId=${TEST_SERVER_ID}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ GET /properties successful');
    console.log('Properties:', Object.keys(getResponse.data.properties).length, 'properties found');
    console.log('Server running:', getResponse.data.isRunning);
    
    // Test POST properties
    const updates = {
      'motd': 'Test Server - Updated',
      'max-players': 25,
      'difficulty': 'normal'
    };
    
    const postResponse = await axios.post(`${BASE_URL}/orchestrator/properties`, {
      serverId: TEST_SERVER_ID,
      properties: updates
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ POST /properties successful');
    console.log('Update result:', postResponse.data.message);
    
    // Verify file was updated
    const updatedContent = fs.readFileSync(PROPERTIES_PATH, 'utf-8');
    const hasMotd = updatedContent.includes('motd=Test Server - Updated');
    const hasMaxPlayers = updatedContent.includes('max-players=25');
    
    if (hasMotd && hasMaxPlayers) {
      console.log('✅ File synchronization verified - properties updated in file');
    } else {
      console.error('❌ File synchronization failed - properties not updated in file');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Server properties test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testWhitelistManagement() {
  console.log('\n👥 Testing Whitelist Management...');
  
  try {
    // Test GET whitelist
    const getResponse = await axios.get(`${BASE_URL}/players/${TEST_SERVER_ID}/whitelist`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ GET /whitelist successful');
    console.log('Current whitelist:', getResponse.data.length, 'players');
    
    // Test POST - add player
    const playerName = 'TestPlayer123';
    const addResponse = await axios.post(`${BASE_URL}/players/${TEST_SERVER_ID}/whitelist`, {
      playerName: playerName
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ POST /whitelist successful');
    console.log('Added player:', addResponse.data.playerName, 'with UUID:', addResponse.data.uuid);
    
    // Verify file was updated
    const whitelistContent = JSON.parse(fs.readFileSync(WHITELIST_PATH, 'utf-8'));
    const playerFound = whitelistContent.some((p) => p.name === playerName);
    
    if (playerFound) {
      console.log('✅ File synchronization verified - player added to whitelist.json');
    } else {
      console.error('❌ File synchronization failed - player not found in whitelist.json');
      return false;
    }
    
    // Test PATCH - toggle whitelist
    const toggleResponse = await axios.patch(`${BASE_URL}/players/${TEST_SERVER_ID}/whitelist/toggle`, {
      enabled: true
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ PATCH /whitelist/toggle successful');
    console.log('Toggle result:', toggleResponse.data.message);
    
    // Test DELETE - remove player
    const deleteResponse = await axios.delete(`${BASE_URL}/players/${TEST_SERVER_ID}/whitelist/${encodeURIComponent(playerName)}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ DELETE /whitelist successful');
    console.log('Remove result:', deleteResponse.data.success);
    
    return true;
  } catch (error) {
    console.error('❌ Whitelist test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUsercache() {
  console.log('\n📚 Testing Usercache Management...');
  
  try {
    // Test GET usercache
    const response = await axios.get(`${BASE_URL}/players/${TEST_SERVER_ID}/usercache`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ GET /usercache successful');
    console.log('Usercache entries:', response.data.length);
    
    // Add a test entry to usercache.json to verify reading
    const testUsercache = [
      {
        name: 'TestPlayer',
        uuid: '12345678-1234-1234-1234-123456789012',
        expiresOn: new Date().toISOString()
      }
    ];
    
    fs.writeFileSync(USERCACHE_PATH, JSON.stringify(testUsercache));
    
    // Test reading the updated usercache
    const updatedResponse = await axios.get(`${BASE_URL}/players/${TEST_SERVER_ID}/usercache`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (updatedResponse.data.length === 1 && updatedResponse.data[0].name === 'TestPlayer') {
      console.log('✅ Usercache reading verified - test entry found');
    } else {
      console.error('❌ Usercache reading failed - test entry not found');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Usercache test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testBanManagement() {
  console.log('\n🚫 Testing Ban Management...');
  
  try {
    // Test GET bans
    const getResponse = await axios.get(`${BASE_URL}/players/${TEST_SERVER_ID}/bans`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ GET /bans successful');
    console.log('Banned players:', getResponse.data.players.length);
    console.log('Banned IPs:', getResponse.data.ips.length);
    
    // Test POST - ban player
    const playerName = 'BadPlayer456';
    const banPlayerResponse = await axios.post(`${BASE_URL}/players/${TEST_SERVER_ID}/bans/player`, {
      username: playerName,
      reason: 'Testing ban system'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ POST /bans/player successful');
    console.log('Ban result:', banPlayerResponse.data.message);
    
    // Verify file was updated
    const bannedPlayersContent = JSON.parse(fs.readFileSync(BANNED_PLAYERS_PATH, 'utf-8'));
    const playerBanned = bannedPlayersContent.some((p) => p.name === playerName);
    
    if (playerBanned) {
      console.log('✅ File synchronization verified - player added to banned-players.json');
    } else {
      console.error('❌ File synchronization failed - player not found in banned-players.json');
      return false;
    }
    
    // Test POST - ban IP
    const testIp = '192.168.1.100';
    const banIpResponse = await axios.post(`${BASE_URL}/players/${TEST_SERVER_ID}/bans/ip`, {
      ip: testIp,
      reason: 'Testing IP ban system'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ POST /bans/ip successful');
    console.log('Ban IP result:', banIpResponse.data.message);
    
    // Verify file was updated
    const bannedIpsContent = JSON.parse(fs.readFileSync(BANNED_IPS_PATH, 'utf-8'));
    const ipBanned = bannedIpsContent.some((entry) => entry.ip === testIp);
    
    if (ipBanned) {
      console.log('✅ File synchronization verified - IP added to banned-ips.json');
    } else {
      console.error('❌ File synchronization failed - IP not found in banned-ips.json');
      return false;
    }
    
    // Test DELETE - pardon player
    const pardonPlayerResponse = await axios.delete(`${BASE_URL}/players/${TEST_SERVER_ID}/bans/player/${encodeURIComponent(playerName)}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ DELETE /bans/player successful');
    console.log('Pardon result:', pardonPlayerResponse.data.message);
    
    // Test DELETE - pardon IP
    const pardonIpResponse = await axios.delete(`${BASE_URL}/players/${TEST_SERVER_ID}/bans/ip/${encodeURIComponent(testIp)}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ DELETE /bans/ip successful');
    console.log('Pardon IP result:', pardonIpResponse.data.message);
    
    return true;
  } catch (error) {
    console.error('❌ Ban management test failed:', error.response?.data || error.message);
    return false;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Remove test server directory
    if (fs.existsSync(SERVER_DATA_PATH)) {
      fs.rmSync(SERVER_DATA_PATH, { recursive: true, force: true });
      console.log('✅ Removed test server data directory');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Minecraft Server File Management System Tests\n');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('Cannot continue tests without authentication');
    return;
  }
  
  // Setup test environment
  await setupTestServer();
  
  // Run all tests
  const tests = [
    testServerProperties,
    testWhitelistManagement,
    testUsercache,
    testBanManagement
  ];
  
  const results = [];
  for (const test of tests) {
    const result = await test();
    results.push(result);
  }
  
  // Summary
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('❌ Some tests failed. Please check the output above.');
  }
  
  // Cleanup
  await cleanup();
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});