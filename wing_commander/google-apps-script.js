// Google Apps Script code for SCOT Wing Commander Portal
// Paste this code inside your Google Sheet's Apps Script editor (Extensions -> Apps Script)
// Remember to deploy the script as a Web App:
// 1. Click "Deploy" -> "New deployment"
// 2. Select type: "Web app"
// 3. Set "Execute as" to "Me"
// 4. Set "Who has access" to "Anyone"
// 5. Authorize access, copy the Web App URL, and paste it into the portal settings.

var WINGS_CONFIG_SHEET = "WingsConfig";
var FLATS_DATA_SHEET = "FlatsData";

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === "auth") {
    return handleAuth(e.parameter.wing, e.parameter.pin);
  } else if (action === "register") {
    return handleRegister(e.parameter.wing, e.parameter.pin);
  } else if (action === "getData") {
    return handleGetData(e.parameter.wing);
  } else if (action === "getAdminData") {
    return handleGetAdminData();
  } else if (action === "updateFlat") {
    return handleUpdateFlat(e.parameter);
  } else if (action === "debugSheet") {
    return handleDebugSheet();
  }
  
  return jsonResponse({ success: false, error: "Invalid action" });
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === "updateFlat") {
      return handleUpdateFlat(postData);
    }
    return jsonResponse({ success: false, error: "Invalid action in POST" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function handleAuth(wing, pin) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WINGS_CONFIG_SHEET);
  if (!sheet) {
    return jsonResponse({ success: false, error: "Configuration sheet not found." });
  }
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  wing = wing.trim().toUpperCase();
  pin = pin.trim();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim().toUpperCase() === wing) {
      var savedPin = values[i][1].toString().trim().padStart(4, '0');
      if (savedPin === pin.padStart(4, '0')) {
        var role = (wing === "ADMIN") ? "ADMIN" : "COMMANDER";
        return jsonResponse({ success: true, role: role });
      } else {
        return jsonResponse({ success: false, error: "Incorrect PIN." });
      }
    }
  }
  return jsonResponse({ success: false, error: "Wing is not registered. Please register first." });
}

function handleRegister(wing, pin) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WINGS_CONFIG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(WINGS_CONFIG_SHEET);
    sheet.appendRow(["Wing", "PIN"]);
  }
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  wing = wing.trim().toUpperCase();
  pin = pin.trim();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim().toUpperCase() === wing) {
      var savedPin = values[i][1].toString().trim();
      if (savedPin !== "") {
        return jsonResponse({ success: false, error: "Wing is already registered. Please contact Admin." });
      } else {
        // Set PIN for existing listed wing (format as text to preserve leading zeros)
        sheet.getRange(i + 1, 2).setNumberFormat('@').setValue(pin);
        return jsonResponse({ success: true });
      }
    }
  }
  
  // Append new wing configuration (format PIN cell as text to preserve leading zeros)
  sheet.appendRow([wing, pin]);
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 2).setNumberFormat('@').setValue(pin);
  return jsonResponse({ success: true });
}

function handleGetData(wing) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FLATS_DATA_SHEET);
  if (!sheet) {
    return jsonResponse({ success: true, flats: [] });
  }
  var range = sheet.getDataRange();
  var values = range.getValues();
  var flatsMap = {};
  
  wing = wing.trim().toUpperCase();
  
  for (var i = 1; i < values.length; i++) {
    var rowWing = values[i][0].toString().trim().toUpperCase();
    var rowFlat = values[i][1].toString().trim().toUpperCase();
    if (rowWing === wing) {
      var record = {
        wing: values[i][0].toString(),
        flat: values[i][1].toString(),
        paid: values[i][2].toString(),
        mode: values[i][3].toString(),
        date: formatDate(values[i][4]),
        amount: values[i][5] !== "" ? Number(values[i][5]) : ""
      };
      
      // Deduplicate: Keep record with paid="Yes" or more details
      var existing = flatsMap[rowFlat];
      if (!existing || (record.paid === 'Yes' && existing.paid !== 'Yes') || (record.paid === 'Yes' && existing.paid === 'Yes' && record.amount !== '')) {
        flatsMap[rowFlat] = record;
      }
    }
  }
  
  // Convert map back to list
  var flats = [];
  for (var key in flatsMap) {
    flats.push(flatsMap[key]);
  }
  return jsonResponse({ success: true, flats: flats });
}

function handleGetAdminData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FLATS_DATA_SHEET);
  if (!sheet) {
    return jsonResponse({ success: true, allFlats: [] });
  }
  var range = sheet.getDataRange();
  var values = range.getValues();
  var allFlatsMap = {};
  
  for (var i = 1; i < values.length; i++) {
    var rowWing = values[i][0].toString().trim().toUpperCase();
    var rowFlat = values[i][1].toString().trim().toUpperCase();
    var key = rowWing + "_" + rowFlat;
    
    var record = {
      wing: values[i][0].toString(),
      flat: values[i][1].toString(),
      paid: values[i][2].toString(),
      mode: values[i][3].toString(),
      date: formatDate(values[i][4]),
      amount: values[i][5] !== "" ? Number(values[i][5]) : ""
    };
    
    var existing = allFlatsMap[key];
    if (!existing || (record.paid === 'Yes' && existing.paid !== 'Yes') || (record.paid === 'Yes' && existing.paid === 'Yes' && record.amount !== '')) {
      allFlatsMap[key] = record;
    }
  }
  
  var allFlats = [];
  for (var key in allFlatsMap) {
    allFlats.push(allFlatsMap[key]);
  }
  return jsonResponse({ success: true, allFlats: allFlats });
}

function handleUpdateFlat(data) {
  var lock = LockService.getScriptLock();
  try {
    // Wait for up to 10 seconds to acquire lock
    lock.waitLock(10000);
  } catch (e) {
    return jsonResponse({ success: false, error: "Could not obtain script lock: " + e.toString() });
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(FLATS_DATA_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(FLATS_DATA_SHEET);
      sheet.appendRow(["Wing", "Flat", "Paid", "PaymentMode", "PaidDate", "Amount"]);
    }
    
    var range = sheet.getDataRange();
    var values = range.getValues();
    
    // Validate inputs safely to avoid runtime NaN/undefined crashes
    var wing = data.wing ? data.wing.toString().trim().toUpperCase() : "";
    var flat = data.flat ? data.flat.toString().trim().toUpperCase() : "";
    var paid = data.paid ? data.paid.toString().trim() : "";
    var mode = data.mode ? data.mode.toString().trim() : "";
    var date = data.date ? data.date.toString().trim() : "";
    
    var amount = "";
    if (data.amount !== undefined && data.amount !== null && data.amount !== "") {
      var parsed = Number(data.amount);
      if (!isNaN(parsed)) {
        amount = parsed;
      }
    }
    
    var foundIndex = -1;
    
    // Search if row exists, handling and cleaning duplicate rows safely
    for (var i = 1; i < values.length; i++) {
      var rowWing = values[i][0] ? values[i][0].toString().trim().toUpperCase() : "";
      var rowFlat = values[i][1] ? values[i][1].toString().trim().toUpperCase() : "";
      if (rowWing === wing && rowFlat === flat) {
        if (foundIndex === -1) {
          foundIndex = i;
          sheet.getRange(i + 1, 3).setValue(paid);
          sheet.getRange(i + 1, 4).setValue(mode);
          sheet.getRange(i + 1, 5).setValue(date);
          sheet.getRange(i + 1, 6).setValue(amount);
        } else {
          // Delete duplicate row
          sheet.deleteRow(i + 1);
          // Adjust array size and index
          values.splice(i, 1);
          i--;
        }
      }
    }
    
    if (foundIndex !== -1) {
      return jsonResponse({ success: true });
    }
    
    // If not found, append new row
    sheet.appendRow([wing, flat, paid, mode, date, amount]);
    return jsonResponse({ success: true });
  } finally {
    // Always release the lock
    lock.releaseLock();
  }
}

function formatDate(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    var yyyy = dateVal.getFullYear();
    var mm = String(dateVal.getMonth() + 1).padStart(2, '0');
    var dd = String(dateVal.getDate()).padStart(2, '0');
    return yyyy + "-" + mm + "-" + dd;
  }
  return dateVal.toString();
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleDebugSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FLATS_DATA_SHEET);
  if (!sheet) return jsonResponse({ error: "No flats data sheet" });
  var values = sheet.getDataRange().getValues();
  
  var r403Matches = [];
  for (var i = 1; i < values.length; i++) {
    var rowWing = values[i][0] ? values[i][0].toString().trim().toUpperCase() : "";
    var rowFlat = values[i][1] ? values[i][1].toString().trim().toUpperCase() : "";
    if (rowWing === "R" && rowFlat === "403") {
      r403Matches.push({ rowIndex: i + 1, row: values[i] });
    }
  }
  
  return jsonResponse({
    flatsDataRowsCount: values.length,
    r403Matches: r403Matches
  });
}
