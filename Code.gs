// 2️⃣ CORE CONFIGURATION
const CONFIG = {
  SPREADSHEET_ID: '1Ehk-uAUMzDsBQX1ptCBU2Vn_CRCzVbYKFs-gO0SF5k8',
  FOLDER_ID: '1M0xyDZGceyjFVVDRL2bJ2-4amJliJ1av',
  APP_TITLE: 'BonCafeReport',
  HEADER_TITLE: 'Management Report | New Bon Café Co.',
  FOOTER_TEXT: 'Created by Training-Coordinator | New Bon Café Co. Ltd.'
};

/**
 * Serves the Web App
 */
function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.config = CONFIG;
  return template.evaluate()
    .setTitle(CONFIG.APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper to include HTML files
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 6️⃣ AUTHENTICATION SYSTEM & DATA FETCHING
 */

// --- Get Dropdown Data ---
function getFormDropdowns() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
  // Position from 'Management' Col A (Index 0)
  const mgtSheet = ss.getSheetByName('Management');
  const positions = mgtSheet ? mgtSheet.getRange(2, 1, mgtSheet.getLastRow() - 1).getValues().flat().filter(String) : [];

  // Area from 'Checklist Q' Col AE (Index 30 => Column 31)
  const chkSheet = ss.getSheetByName('Checklist Q');
  const areas = chkSheet ? chkSheet.getRange(2, 31, chkSheet.getLastRow() - 1).getValues().flat().filter(String) : [];

  return { positions: positions, areas: areas };
}

// --- Registration Logic ---
function registerUser(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const regSheet = ss.getSheetByName('Register');
  
  if (!regSheet) return { success: false, message: 'Sheet "Register" not found.' };

  const values = regSheet.getDataRange().getValues();
  const emailIndex = 1; // Col B
  const idIndex = 2;    // Col C

  // Check duplicates
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(data.id)) return { success: false, message: 'ID Number already exists.' };
    if (String(values[i][emailIndex]) === String(data.email)) return { success: false, message: 'Email already exists.' };
  }

  // Hash Password
  const hashedPassword = hashPassword(data.password);

  // Append Data: Timestamp, Email, ID, Name, Position, Area, Password
  regSheet.appendRow([
    new Date(),
    data.email,
    "'" + data.id, // Force string for ID to prevent truncation
    data.name,
    data.position,
    data.area,
    hashedPassword
  ]);

  return { success: true };
}

// --- Login Logic ---
function loginUser(id, password) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const regSheet = ss.getSheetByName('Register');
  const loginSheet = ss.getSheetByName('Logins');
  
  if (!regSheet || !loginSheet) return { success: false, message: 'Database error.' };

  const users = regSheet.getDataRange().getValues();
  let userFound = null;

  // Authenticate
  for (let i = 1; i < users.length; i++) {
    // Col 3 is ID (index 2), Col 7 is Pass (index 6)
    if (String(users[i][2]) === String(id)) {
      const dbHash = users[i][6];
      const inputHash = hashPassword(password);
      if (dbHash === inputHash) {
        userFound = {
          name: users[i][3],
          position: users[i][4],
          area: users[i][5]
        };
        break;
      }
    }
  }

  if (userFound) {
    // Log Login Time
    // Columns: Timestamp, ID, Login Time, Logout Time
    const now = new Date();
    loginSheet.appendRow([now, "'" + id, now.toLocaleTimeString(), ""]);
    return { success: true, user: userFound, message: "Enjoy your day working @Bon Cafe'! 😊" };
  } else {
    return { success: false, message: 'Invalid ID or Password.' };
  }
}

// --- Logout Logic ---
function logoutUser(id) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const loginSheet = ss.getSheetByName('Logins');
  const lastRow = loginSheet.getLastRow();
  const data = loginSheet.getRange(2, 1, lastRow - 1, 4).getValues();

  // Find last entry for this user that has no logout time
  for (let i = data.length - 1; i >= 0; i--) {
    // Col B is ID (index 1), Col D is Logout (index 3)
    if (String(data[i][1]) === String(id) && data[i][3] === "") {
      const rowIndex = i + 2; // +2 because of header and 0-index
      const now = new Date();
      loginSheet.getRange(rowIndex, 4).setValue(now.toLocaleTimeString());
      break;
    }
  }
  return { success: true, message: "Tomorrow is another challenging day!" };
}

// --- Utility: SHA-256 Hashing ---
function hashPassword(rawPassword) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawPassword);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) {
      hashVal += 256;
    }
    if (hashVal.toString(16).length == 1) {
      txtHash += '0';
    }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}