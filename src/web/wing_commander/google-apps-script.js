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
  } else if (action === "getPaymentReportPdf") {
    return handleGetPaymentReportPdf();
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
  var flats = [];
  
  wing = wing.trim().toUpperCase();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim().toUpperCase() === wing) {
      flats.push({
        wing: values[i][0].toString(),
        flat: values[i][1].toString(),
        paid: values[i][2].toString(),
        mode: values[i][3].toString(),
        date: formatDate(values[i][4]),
        amount: values[i][5] !== "" ? Number(values[i][5]) : ""
      });
    }
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
  var allFlats = [];
  
  for (var i = 1; i < values.length; i++) {
    allFlats.push({
      wing: values[i][0].toString(),
      flat: values[i][1].toString(),
      paid: values[i][2].toString(),
      mode: values[i][3].toString(),
      date: formatDate(values[i][4]),
      amount: values[i][5] !== "" ? Number(values[i][5]) : ""
    });
  }
  return jsonResponse({ success: true, allFlats: allFlats });
}

function handleUpdateFlat(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FLATS_DATA_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(FLATS_DATA_SHEET);
    sheet.appendRow(["Wing", "Flat", "Paid", "PaymentMode", "PaidDate", "Amount"]);
  }
  
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  var wing = data.wing.trim().toUpperCase();
  var flat = data.flat.trim().toUpperCase();
  var paid = data.paid;
  var mode = data.mode;
  var date = data.date;
  var amount = data.amount !== "" ? Number(data.amount) : "";
  
  var foundIndex = -1;
  
  // Search if row exists, handling and cleaning duplicate rows
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim().toUpperCase() === wing && values[i][1].toString().trim().toUpperCase() === flat) {
      if (foundIndex === -1) {
        foundIndex = i;
        sheet.getRange(i + 1, 3).setValue(paid);
        sheet.getRange(i + 1, 4).setValue(mode);
        sheet.getRange(i + 1, 5).setValue(date);
        sheet.getRange(i + 1, 6).setValue(amount);
      } else {
        // Delete the duplicate row
        sheet.deleteRow(i + 1);
        // Adjust array since row was deleted
        values.splice(i, 1);
        i--;
      }
    }
  }
  
  if (foundIndex !== -1) {
    return jsonResponse({ success: true });
  }
  
  // If not found, append a new row
  sheet.appendRow([wing, flat, paid, mode, date, amount]);
  return jsonResponse({ success: true });
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

function handleGetPaymentReportPdf() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var targetSheetName = "Payment_Report";
  
  // Find target sheet
  var targetSheet = ss.getSheetByName(targetSheetName);
  if (!targetSheet) {
    return jsonResponse({ success: false, error: "Payment_Report sheet tab not found. Please create a sheet tab named 'Payment_Report'." });
  }
  
  // Store the original visibility state of all sheets
  var originalStates = [];
  for (var i = 0; i < sheets.length; i++) {
    originalStates.push({
      sheet: sheets[i],
      visible: !sheets[i].isSheetHidden()
    });
  }
  
  // Hide all sheets EXCEPT the target sheet
  targetSheet.showSheet();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() !== targetSheetName) {
      sheets[i].hideSheet();
    }
  }
  
  // Generate the PDF blob of the active (only visible) sheet natively
  var pdfBlob;
  try {
    pdfBlob = ss.getAs('application/pdf');
  } catch(e) {
    // Restore states on error
    restoreSheetStates(originalStates);
    return jsonResponse({ success: false, error: "Failed to render PDF natively: " + e.toString() });
  }
  
  // Restore all sheets visibility states
  restoreSheetStates(originalStates);
  
  // Return base64 encoded PDF
  var base64 = Utilities.base64Encode(pdfBlob.getBytes());
  return jsonResponse({ success: true, pdfBase64: base64 });
}

function restoreSheetStates(states) {
  // Show target sheets first to ensure we don't violate "at least one visible sheet" rule
  for (var i = 0; i < states.length; i++) {
    if (states[i].visible) {
      states[i].sheet.showSheet();
    }
  }
  for (var i = 0; i < states.length; i++) {
    if (!states[i].visible) {
      states[i].sheet.hideSheet();
    }
  }
}

