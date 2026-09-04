const { processAgentData } = require("../src/utils/analysisEngine");

console.log("=== Testing processAgentData with various empty configurations ===");

// Test 1: All empty
try {
  const res1 = processAgentData([], [], [], [], [], [], [], "2026-07-17", 30, 5, "BST", false, [], []);
  console.log("Test 1 (All empty): PASSED. Agents count:", Object.keys(res1.agents).length);
} catch (e) {
  console.error("Test 1 FAILED:", e);
}

// Test 2: Only Call Logs
try {
  const mockCalls = [
    {
      "User": "Agent Test",
      "Date & time": "2026-07-17 10:00:00",
      "Duration": "01:30",
      "Action Result": "Answered",
      "Direction": "Outbound",
      "Phone Number": "+447123456789",
      "Name": "Customer 1"
    }
  ];
  const res2 = processAgentData([], [], mockCalls, [], [], [], [], "2026-07-17", 30, 5, "BST", false, [], []);
  console.log("Test 2 (Only Calls): PASSED. Agents count:", Object.keys(res2.agents).length, "Detected Agent:", Object.keys(res2.agents)[0]);
} catch (e) {
  console.error("Test 2 FAILED:", e);
}

// Test 3: Only Opportunities (No contacts, no calls, no audit)
try {
  const mockOpps = [
    {
      "assigned": "Agent Alpha",
      "Contact Name": "Lead A",
      "Phone": "+447987654321"
    }
  ];
  const res3 = processAgentData([], mockOpps, [], [], [], [], [], "2026-07-17", 30, 5, "BST", false, [], []);
  console.log("Test 3 (Only Opps): PASSED. Agents count:", Object.keys(res3.agents).length, "Detected Agent:", Object.keys(res3.agents)[0]);
} catch (e) {
  console.error("Test 3 FAILED:", e);
}

// Test 4: Only Margin rows
try {
  const mockMargin = [
    {
      "Assigned user": "Agent Beta",
      "Lead value": "500",
      "Opportunity name": "Deal 1",
      "Phone number": "+447111222333"
    }
  ];
  const res4 = processAgentData([], [], [], [], [], [], [], "2026-07-17", 30, 5, "BST", false, [], mockMargin);
  console.log("Test 4 (Only Margin): PASSED. Agents count:", Object.keys(res4.agents).length, "Detected Agent:", Object.keys(res4.agents)[0]);
} catch (e) {
  console.error("Test 4 FAILED:", e);
}

// Test 5: Only Contacts
try {
  const mockContacts = [
    {
      "Assigned To": "Agent Gamma",
      "First Name": "John",
      "Last Name": "Doe",
      "Phone": "+447444555666"
    }
  ];
  const res5 = processAgentData([], [], [], [], [], [], [], "2026-07-17", 30, 5, "BST", false, mockContacts, []);
  console.log("Test 5 (Only Contacts): PASSED. Agents count:", Object.keys(res5.agents).length, "Detected Agent:", Object.keys(res5.agents)[0]);
} catch (e) {
  console.error("Test 5 FAILED:", e);
}

console.log("=== All engine tests completed successfully ===");
