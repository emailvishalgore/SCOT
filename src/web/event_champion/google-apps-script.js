// Google Apps Script code for SCOT Events Team Portal
// Paste this code inside your Google Sheet's Apps Script editor (Extensions -> Apps Script)
// Remember to deploy the script as a Web App:
// 1. Click "Deploy" -> "New deployment"
// 2. Select type: "Web app"
// 3. Set "Execute as" to "Me"
// 4. Set "Who has access" to "Anyone"
// 5. Authorize access, copy the Web App URL, and paste it into the portal settings.

var CONFIG_SHEET = "WingsConfig";
var EVENTS_SHEET = "Events";
var COMPETITIONS_SHEET = "Competitions";
var REGISTRATIONS_SHEET = "Registrations";
var FIXTURES_SHEET = "Fixtures";
var LEADERBOARD_SHEET = "Leaderboard";

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === "auth") {
    return handleAuth(e.parameter.role, e.parameter.pin);
  } else if (action === "register") {
    return handleRegister(e.parameter.role, e.parameter.pin);
  } else if (action === "getData") {
    return handleGetData();
  } else if (action === "updateEvent") {
    return handleUpdateEvent(e.parameter);
  } else if (action === "updateCompetition") {
    return handleUpdateCompetition(e.parameter);
  } else if (action === "updateRegistration") {
    return handleUpdateRegistration(e.parameter);
  } else if (action === "updateFixture") {
    return handleUpdateFixture(e.parameter);
  } else if (action === "saveLeaderboard") {
    return handleSaveLeaderboard(e.parameter);
  } else if (action === "bulkCreateFixtures") {
    // Allows POST or GET wrapper for fixtures generation
    return handleBulkCreateFixtures(e.parameter);
  }
  
  return jsonResponse({ success: false, error: "Invalid action: " + action });
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === "updateEvent") return handleUpdateEvent(postData);
    if (action === "updateCompetition") return handleUpdateCompetition(postData);
    if (action === "updateRegistration") return handleUpdateRegistration(postData);
    if (action === "updateFixture") return handleUpdateFixture(postData);
    if (action === "bulkCreateFixtures") return handleBulkCreateFixtures(postData);
    
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
  
  // 1. Fetch Events
  var eventsSheet = getOrCreateSheet(ss, EVENTS_SHEET, ["EventName", "Description", "StartDate", "EndDate", "Venue", "Status"]);
  var events = [];
  var eVals = eventsSheet.getDataRange().getValues();
  for (var i = 1; i < eVals.length; i++) {
    events.push({
      eventName: eVals[i][0].toString(),
      description: eVals[i][1].toString(),
      startDate: eVals[i][2].toString(),
      endDate: eVals[i][3].toString(),
      venue: eVals[i][4].toString(),
      status: eVals[i][5].toString()
    });
  }
  
  // 2. Fetch Competitions
  var compSheet = getOrCreateSheet(ss, COMPETITIONS_SHEET, ["EventName", "CompetitionName", "Category", "Format", "Status"]);
  var competitions = [];
  var cVals = compSheet.getDataRange().getValues();
  for (var i = 1; i < cVals.length; i++) {
    competitions.push({
      eventName: cVals[i][0].toString(),
      competitionName: cVals[i][1].toString(),
      category: cVals[i][2].toString(),
      format: cVals[i][3].toString(),
      status: cVals[i][4].toString()
    });
  }

  // 3. Fetch Registrations
  var regSheet = getOrCreateSheet(ss, REGISTRATIONS_SHEET, ["ID", "ResidentName", "Wing", "Flat", "EventName", "CompetitionName", "Status"]);
  var registrations = [];
  var rVals = regSheet.getDataRange().getValues();
  for (var i = 1; i < rVals.length; i++) {
    registrations.push({
      id: rVals[i][0].toString(),
      residentName: rVals[i][1].toString(),
      wing: rVals[i][2].toString(),
      flat: rVals[i][3].toString(),
      eventName: rVals[i][4].toString(),
      competitionName: rVals[i][5].toString(),
      status: rVals[i][6].toString()
    });
  }

  // 4. Fetch Fixtures
  var fixSheet = getOrCreateSheet(ss, FIXTURES_SHEET, ["ID", "CompetitionName", "Round", "Participant1", "Participant2", "Score1", "Score2", "Winner", "Status"]);
  var fixtures = [];
  var fVals = fixSheet.getDataRange().getValues();
  for (var i = 1; i < fVals.length; i++) {
    fixtures.push({
      id: fVals[i][0].toString(),
      competitionName: fVals[i][1].toString(),
      round: Number(fVals[i][2]) || 1,
      participant1: fVals[i][3].toString(),
      participant2: fVals[i][4].toString(),
      score1: fVals[i][5] !== "" ? Number(fVals[i][5]) : "",
      score2: fVals[i][6] !== "" ? Number(fVals[i][6]) : "",
      winner: fVals[i][7].toString(),
      status: fVals[i][8].toString()
    });
  }

  // 5. Fetch Leaderboard
  var leadSheet = getOrCreateSheet(ss, LEADERBOARD_SHEET, ["Wing", "Points"]);
  var leaderboard = [];
  var lVals = leadSheet.getDataRange().getValues();
  for (var i = 1; i < lVals.length; i++) {
    leaderboard.push({
      wing: lVals[i][0].toString(),
      points: Number(lVals[i][1]) || 0
    });
  }

  return jsonResponse({
    success: true,
    events: events,
    competitions: competitions,
    registrations: registrations,
    fixtures: fixtures,
    leaderboard: leaderboard
  });
}

function handleUpdateEvent(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(EVENTS_SHEET);
  var values = sheet.getDataRange().getValues();
  
  var name = data.eventName;
  var desc = data.description;
  var start = data.startDate;
  var end = data.endDate;
  var venue = data.venue;
  var status = data.status;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString() === name) {
      sheet.getRange(i + 1, 2).setValue(desc);
      sheet.getRange(i + 1, 3).setValue(start);
      sheet.getRange(i + 1, 4).setValue(end);
      sheet.getRange(i + 1, 5).setValue(venue);
      sheet.getRange(i + 1, 6).setValue(status);
      return jsonResponse({ success: true });
    }
  }
  
  sheet.appendRow([name, desc, start, end, venue, status]);
  return jsonResponse({ success: true });
}

function handleUpdateCompetition(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(COMPETITIONS_SHEET);
  var values = sheet.getDataRange().getValues();
  
  var eventName = data.eventName;
  var name = data.competitionName;
  var category = data.category;
  var format = data.format;
  var status = data.status;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString() === eventName && values[i][1].toString() === name) {
      sheet.getRange(i + 1, 3).setValue(category);
      sheet.getRange(i + 1, 4).setValue(format);
      sheet.getRange(i + 1, 5).setValue(status);
      return jsonResponse({ success: true });
    }
  }
  
  sheet.appendRow([eventName, name, category, format, status]);
  return jsonResponse({ success: true });
}

function handleUpdateRegistration(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(REGISTRATIONS_SHEET);
  var values = sheet.getDataRange().getValues();
  
  var id = data.id || Utilities.getUuid();
  var name = data.residentName;
  var wing = data.wing;
  var flat = data.flat;
  var eventName = data.eventName;
  var compName = data.competitionName;
  var status = data.status;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString() === id) {
      sheet.getRange(i + 1, 2).setValue(name);
      sheet.getRange(i + 1, 3).setValue(wing);
      sheet.getRange(i + 1, 4).setValue(flat);
      sheet.getRange(i + 1, 5).setValue(eventName);
      sheet.getRange(i + 1, 6).setValue(compName);
      sheet.getRange(i + 1, 7).setValue(status);
      return jsonResponse({ success: true });
    }
  }
  
  sheet.appendRow([id, name, wing, flat, eventName, compName, status]);
  return jsonResponse({ success: true });
}

function handleUpdateFixture(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FIXTURES_SHEET);
  var values = sheet.getDataRange().getValues();
  
  var id = data.id;
  var score1 = data.score1 !== "" ? Number(data.score1) : "";
  var score2 = data.score2 !== "" ? Number(data.score2) : "";
  var winner = data.winner;
  var status = data.status;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString() === id) {
      sheet.getRange(i + 1, 6).setValue(score1);
      sheet.getRange(i + 1, 7).setValue(score2);
      sheet.getRange(i + 1, 8).setValue(winner);
      sheet.getRange(i + 1, 9).setValue(status);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: "Fixture match not found." });
}

function handleBulkCreateFixtures(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FIXTURES_SHEET);
  
  var compName = data.competitionName;
  var matches = JSON.parse(data.matches); // Array of match objects
  
  matches.forEach(function(m) {
    sheet.appendRow([m.id, compName, m.round, m.participant1, m.participant2, "", "", "", "SCHEDULED"]);
  });
  
  return jsonResponse({ success: true });
}

function handleSaveLeaderboard(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LEADERBOARD_SHEET);
  var values = sheet.getDataRange().getValues();
  
  var wing = data.wing.trim().toUpperCase();
  var points = Number(data.points);
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim().toUpperCase() === wing) {
      sheet.getRange(i + 1, 2).setValue(points);
      return jsonResponse({ success: true });
    }
  }
  
  sheet.appendRow([wing, points]);
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
