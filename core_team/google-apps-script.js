// Google Apps Script code for SCOT Core Team Portal
// Paste this code inside your Google Sheet's Apps Script editor (Extensions -> Apps Script)
// Remember to deploy the script as a Web App:
// 1. Click "Deploy" -> "New deployment"
// 2. Select type: "Web app"
// 3. Set "Execute as" to "Me"
// 4. Set "Who has access" to "Anyone"
// 5. Authorize access, copy the Web App URL, and paste it into the portal settings.

var CONFIG_SHEET = "WingsConfig"; // Shares config or has role/PIN maps
var FLATS_DATA_SHEET = "FlatsData"; // Read-only for dashboard total stats
var SPONSORS_SHEET = "Sponsors";
var VENDORS_SHEET = "Vendors";
var QUOTATIONS_SHEET = "Quotations";
var EXPENSES_SHEET = "Expenses";
var LOGISTICS_TASKS_SHEET = "LogisticsTasks";

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === "auth") {
    return handleAuth(e.parameter.role, e.parameter.pin);
  } else if (action === "register") {
    return handleRegister(e.parameter.role, e.parameter.pin);
  } else if (action === "getData") {
    return handleGetData();
  } else if (action === "updateSponsor") {
    return handleUpdateSponsor(e.parameter);
  } else if (action === "updateVendor") {
    return handleUpdateVendor(e.parameter);
  } else if (action === "updateQuotation") {
    return handleUpdateQuotation(e.parameter);
  } else if (action === "updateExpense") {
    return handleUpdateExpense(e.parameter);
  } else if (action === "updateTask") {
    return handleUpdateTask(e.parameter);
  }
  
  return jsonResponse({ success: false, error: "Invalid action: " + action });
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === "updateSponsor") return handleUpdateSponsor(postData);
    if (action === "updateVendor") return handleUpdateVendor(postData);
    if (action === "updateQuotation") return handleUpdateQuotation(postData);
    if (action === "updateExpense") return handleUpdateExpense(postData);
    if (action === "updateTask") return handleUpdateTask(postData);
    
    return jsonResponse({ success: false, error: "Invalid action in POST" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function handleAuth(role, pin) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG_SHEET);
  if (!sheet) {
    return jsonResponse({ success: false, error: "Configuration sheet 'WingsConfig' not found." });
  }
  var values = sheet.getDataRange().getValues();
  role = role.trim().toUpperCase();
  pin = pin.trim();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim().toUpperCase() === role) {
      var savedPin = values[i][1].toString().trim().padStart(4, '0');
      if (savedPin === pin.padStart(4, '0')) {
        return jsonResponse({ success: true, role: role });
      } else {
        return jsonResponse({ success: false, error: "Incorrect PIN." });
      }
    }
  }
  return jsonResponse({ success: false, error: "Role is not registered. Please register first." });
}

function handleRegister(role, pin) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG_SHEET);
    sheet.appendRow(["WingOrRole", "PIN"]);
  }
  var values = sheet.getDataRange().getValues();
  role = role.trim().toUpperCase();
  pin = pin.trim();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim().toUpperCase() === role) {
      var savedPin = values[i][1].toString().trim();
      if (savedPin !== "") {
        return jsonResponse({ success: false, error: "Role is already registered. Please contact Admin." });
      } else {
        sheet.getRange(i + 1, 2).setNumberFormat('@').setValue(pin);
        return jsonResponse({ success: true });
      }
    }
  }
  
  sheet.appendRow([role, pin]);
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 2).setNumberFormat('@').setValue(pin);
  return jsonResponse({ success: true });
}

function handleGetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get flat collections ratio from FlatsData
  var flatsSheet = ss.getSheetByName(FLATS_DATA_SHEET);
  var flats = [];
  if (flatsSheet) {
    var vals = flatsSheet.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      flats.push({
        wing: vals[i][0].toString(),
        flat: vals[i][1].toString(),
        paid: vals[i][2].toString(),
        amount: vals[i][5] !== "" ? Number(vals[i][5]) : 0
      });
    }
  }
  
  // 2. Get Sponsors
  var sponsorsSheet = getOrCreateSheet(ss, SPONSORS_SHEET, ["ID", "Company", "Contact", "Phone", "Committed", "Collected", "Status"]);
  var sponsors = [];
  var sVals = sponsorsSheet.getDataRange().getValues();
  for (var i = 1; i < sVals.length; i++) {
    sponsors.push({
      id: sVals[i][0].toString(),
      company: sVals[i][1].toString(),
      contact: sVals[i][2].toString(),
      phone: sVals[i][3].toString(),
      committed: Number(sVals[i][4]) || 0,
      collected: Number(sVals[i][5]) || 0,
      status: sVals[i][6].toString()
    });
  }
  
  // 3. Get Vendors
  var vendorsSheet = getOrCreateSheet(ss, VENDORS_SHEET, ["ID", "Name", "Contact", "Phone", "Category", "Rating"]);
  var vendors = [];
  var vVals = vendorsSheet.getDataRange().getValues();
  for (var i = 1; i < vVals.length; i++) {
    vendors.push({
      id: vVals[i][0].toString(),
      name: vVals[i][1].toString(),
      contact: vVals[i][2].toString(),
      phone: vVals[i][3].toString(),
      category: vVals[i][4].toString(),
      rating: Number(vVals[i][5]) || 0
    });
  }
  
  // 4. Get Quotations
  var quotesSheet = getOrCreateSheet(ss, QUOTATIONS_SHEET, ["ID", "VendorName", "EventName", "Amount", "FileURL", "Status"]);
  var quotations = [];
  var qVals = quotesSheet.getDataRange().getValues();
  for (var i = 1; i < qVals.length; i++) {
    quotations.push({
      id: qVals[i][0].toString(),
      vendorName: qVals[i][1].toString(),
      eventName: qVals[i][2].toString(),
      amount: Number(qVals[i][3]) || 0,
      fileUrl: qVals[i][4].toString(),
      status: qVals[i][5].toString()
    });
  }

  // 5. Get Expenses
  var expensesSheet = getOrCreateSheet(ss, EXPENSES_SHEET, ["ID", "Category", "Description", "Amount", "ReceiptURL", "Status", "ApprovedBy"]);
  var expenses = [];
  var eVals = expensesSheet.getDataRange().getValues();
  for (var i = 1; i < eVals.length; i++) {
    expenses.push({
      id: eVals[i][0].toString(),
      category: eVals[i][1].toString(),
      description: eVals[i][2].toString(),
      amount: Number(eVals[i][3]) || 0,
      receiptUrl: eVals[i][4].toString(),
      status: eVals[i][5].toString(),
      approvedBy: eVals[i][6].toString()
    });
  }

  // 6. Get Logistics Tasks
  var tasksSheet = getOrCreateSheet(ss, LOGISTICS_TASKS_SHEET, ["ID", "EventName", "Task", "Assignee", "Status"]);
  var tasks = [];
  var tVals = tasksSheet.getDataRange().getValues();
  for (var i = 1; i < tVals.length; i++) {
    tasks.push({
      id: tVals[i][0].toString(),
      eventName: tVals[i][1].toString(),
      task: tVals[i][2].toString(),
      assignee: tVals[i][3].toString(),
      status: tVals[i][4].toString()
    });
  }
  
  return jsonResponse({
    success: true,
    flats: flats,
    sponsors: sponsors,
    vendors: vendors,
    quotations: quotations,
    expenses: expenses,
    tasks: tasks
  });
}

function handleUpdateSponsor(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SPONSORS_SHEET);
  var values = sheet.getDataRange().getValues();
  
  var id = data.id || Utilities.getUuid();
  var company = data.company;
  var contact = data.contact;
  var phone = data.phone;
  var committed = Number(data.committed);
  var collected = Number(data.collected);
  var status = data.status;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString() === id) {
      sheet.getRange(i + 1, 2).setValue(company);
      sheet.getRange(i + 1, 3).setValue(contact);
      sheet.getRange(i + 1, 4).setValue(phone);
      sheet.getRange(i + 1, 5).setValue(committed);
      sheet.getRange(i + 1, 6).setValue(collected);
      sheet.getRange(i + 1, 7).setValue(status);
      return jsonResponse({ success: true });
    }
  }
  
  sheet.appendRow([id, company, contact, phone, committed, collected, status]);
  return jsonResponse({ success: true });
}

function handleUpdateVendor(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(VENDORS_SHEET);
  var values = sheet.getDataRange().getValues();
  
  var id = data.id || Utilities.getUuid();
  var name = data.name;
  var contact = data.contact;
  var phone = data.phone;
  var category = data.category;
  var rating = Number(data.rating);
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString() === id) {
      sheet.getRange(i + 1, 2).setValue(name);
      sheet.getRange(i + 1, 3).setValue(contact);
      sheet.getRange(i + 1, 4).setValue(phone);
      sheet.getRange(i + 1, 5).setValue(category);
      sheet.getRange(i + 1, 6).setValue(rating);
      return jsonResponse({ success: true });
    }
  }
  
  sheet.appendRow([id, name, contact, phone, category, rating]);
  return jsonResponse({ success: true });
}

function handleUpdateQuotation(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(QUOTATIONS_SHEET);
  var values = sheet.getDataRange().getValues();
  
  var id = data.id || Utilities.getUuid();
  var vendorName = data.vendorName;
  var eventName = data.eventName;
  var amount = Number(data.amount);
  var fileUrl = data.fileUrl;
  var status = data.status;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString() === id) {
      sheet.getRange(i + 1, 2).setValue(vendorName);
      sheet.getRange(i + 1, 3).setValue(eventName);
      sheet.getRange(i + 1, 4).setValue(amount);
      sheet.getRange(i + 1, 5).setValue(fileUrl);
      sheet.getRange(i + 1, 6).setValue(status);
      return jsonResponse({ success: true });
    }
  }
  
  sheet.appendRow([id, vendorName, eventName, amount, fileUrl, status]);
  return jsonResponse({ success: true });
}

function handleUpdateExpense(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(EXPENSES_SHEET);
  var values = sheet.getDataRange().getValues();
  
  var id = data.id || Utilities.getUuid();
  var category = data.category;
  var description = data.description;
  var amount = Number(data.amount);
  var receiptUrl = data.receiptUrl;
  var status = data.status;
  var approvedBy = data.approvedBy;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString() === id) {
      sheet.getRange(i + 1, 2).setValue(category);
      sheet.getRange(i + 1, 3).setValue(description);
      sheet.getRange(i + 1, 4).setValue(amount);
      sheet.getRange(i + 1, 5).setValue(receiptUrl);
      sheet.getRange(i + 1, 6).setValue(status);
      sheet.getRange(i + 1, 7).setValue(approvedBy);
      return jsonResponse({ success: true });
    }
  }
  
  sheet.appendRow([id, category, description, amount, receiptUrl, status, approvedBy]);
  return jsonResponse({ success: true });
}

function handleUpdateTask(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LOGISTICS_TASKS_SHEET);
  var values = sheet.getDataRange().getValues();
  
  var id = data.id || Utilities.getUuid();
  var eventName = data.eventName;
  var task = data.task;
  var assignee = data.assignee;
  var status = data.status;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString() === id) {
      sheet.getRange(i + 1, 2).setValue(eventName);
      sheet.getRange(i + 1, 3).setValue(task);
      sheet.getRange(i + 1, 4).setValue(assignee);
      sheet.getRange(i + 1, 5).setValue(status);
      return jsonResponse({ success: true });
    }
  }
  
  sheet.appendRow([id, eventName, task, assignee, status]);
  return jsonResponse({ success: true });
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
