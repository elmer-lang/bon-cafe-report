/**
 * NEW BON CAFE CO. LTD - MANAGEMENT REPORT SYSTEM
 * 
 * GITHUB REPOSITORY: https://elmer-lang.github.io/Management-Report/
 * VERSION: 1.0.0
 * AUTHOR: Elmer
 */

// --- CONFIGURATION ---
const CONFIG = {
  SHEET_ID: "1Ehk-uAUMzDsBQX1ptCBU2Vn_CRCzVbYKFs-gO0SF5k8", 
  DRIVE_FOLDER_ID: "1M0xyDZGceyjFVVDRL2bJ2-4amJliJ1av",
  ADMIN_EMAIL: "elmer@bon.com.sa",
  GITHUB_URL: "https://elmer-lang.github.io/Management-Report/" // UPDATE THIS LINK
};

// --- WEB APP SERVING ---
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('BonCafeReport')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setFaviconUrl('https://img.icons8.com/color/48/coffee-bean.png'); 
}

function getGithubLink() {
  return CONFIG.GITHUB_URL;
}

// --- DATABASE HELPERS ---
function getSheet(name) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

// --- AUTHENTICATION ---

function registerUser(form) {
  const sheet = getSheet("Register");
  const data = sheet.getDataRange().getValues();
  
  for(let i=1; i<data.length; i++) {
    if(String(data[i][2]) === String(form.id)) {
      return {success: false, message: "ID Number already registered."};
    }
  }

  sheet.appendRow([
    new Date(), 
    form.email, 
    "'" + form.id, 
    form.name, 
    form.position, 
    form.area, 
    form.password
  ]);
  
  return {success: true, message: "Registration Successful"};
}

function loginUser(id, password) {
  const regSheet = getSheet("Register");
  const logSheet = getSheet("Logins");
  const data = regSheet.getDataRange().getValues();
  let user = null;

  for(let i=1; i<data.length; i++) {
    if(String(data[i][2]) === String(id) && String(data[i][6]) === String(password)) {
      user = {
        name: data[i][3],
        position: data[i][4],
        area: data[i][5],
        id: data[i][2],
        email: data[i][1]
      };
      break;
    }
  }

  if(user) {
    const loginTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");
    logSheet.appendRow([new Date(), "'" + id, loginTime, ""]);
    return {success: true, user: user, message: "Enjoy your day working @Bon Cafe'!😊"};
  } else {
    return {success: false, message: "Invalid ID or Password."};
  }
}

function logoutUser(id) {
  const sheet = getSheet("Logins");
  const data = sheet.getDataRange().getValues();
  let rowToUpdate = -1;
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === String(id) && data[i][3] === "") {
      rowToUpdate = i + 1;
      break;
    }
  }

  const logoutTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");
  
  if (rowToUpdate > 0) {
    sheet.getRange(rowToUpdate, 4).setValue(logoutTime);
  } else {
    sheet.appendRow([new Date(), "'" + id, "", logoutTime]);
  }
  
  return {success: true, message: "Tomorrow is another challenging day!"};
}

function forgotPassword(id) {
  const sheet = getSheet("Register");
  const data = sheet.getDataRange().getValues();
  let email = null; 
  let pass = null;

  for(let i=1; i<data.length; i++) {
    if(String(data[i][2]) === String(id)) {
      email = data[i][1];
      pass = data[i][6];
      break;
    }
  }

  if(email && pass) {
    try {
      MailApp.sendEmail({
        to: email,
        subject: "Bon Café - Password Recovery",
        body: `Your password is: ${pass}`
      });
      return {success: true, message: "Password sent to your registered email."};
    } catch(e) {
      return {success: false, message: "Error sending email. Please check server logs."};
    }
  }
  return {success: false, message: "ID not found."};
}

// --- DATA FETCHING ---

function getAppData(userArea) {
  const sheet = getSheet("Checklist Q");
  const data = sheet.getDataRange().getValues();
  
  const questions = [];
  const branches = [];
  let teamLeaders = [];

  for(let i=1; i<data.length; i++) {
    if(data[i][0] && data[i][2]) {
      questions.push({
        id: data[i][0], 
        category: data[i][1], 
        text: data[i][2], 
        type: data[i][3], 
        options: data[i][4],
        isExtra: false
      });
    }
    
    if(data[i][26]) {
       questions.push({
        id: "EXTRA_" + i, 
        category: data[i][25], 
        text: data[i][26],     
        type: 'Dropdown',      
        options: data[i][28],  
        isExtra: true
      });
    }

    if(data[i][23]) branches.push(data[i][23]);
  }

  let colIdx = -1;
  const areaLower = userArea.toLowerCase();

  if(areaLower.includes("north jeddah district 1")) colIdx = 13; 
  else if(areaLower.includes("north jeddah district 2")) colIdx = 15; 
  else if(areaLower.includes("central east jeddah")) colIdx = 16; 
  else if(areaLower.includes("central west jeddah")) colIdx = 17; 
  else if(areaLower.includes("south jeddah")) colIdx = 18; 
  else if(areaLower.includes("west makkah")) colIdx = 19; 
  else if(areaLower.includes("east makkah")) colIdx = 20; 
  else if(areaLower.includes("taif")) colIdx = 21; 
  else if(areaLower.includes("al-madina")) colIdx = 22; 

  if(colIdx > -1) {
    for(let i=1; i<data.length; i++) {
      if(data[i][colIdx]) teamLeaders.push(data[i][colIdx]);
    }
  }

  return {
    questions: questions,
    branches: [...new Set(branches)], 
    teamLeaders: [...new Set(teamLeaders)]
  };
}

function getReportData() {
  const sheet = getSheet("DCL");
  if(sheet.getLastRow() < 2) return [];
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).getValues();
  
  const idxDate = headers.indexOf("Date");
  const idxBranch = headers.indexOf("Branch");
  const idxTL = headers.indexOf("Team Leader");
  const idxArea = headers.indexOf("Area");
  const idxRate = headers.indexOf("Rate");
  const idxViolations = headers.indexOf("Staff Violations");
  const idxSupervisor = headers.indexOf("Supervisor");

  return data.map(r => ({
    date: r[idxDate] instanceof Date ? Utilities.formatDate(r[idxDate], Session.getScriptTimeZone(), "yyyy-MM-dd") : r[idxDate],
    branch: r[idxBranch],
    tl: r[idxTL],
    area: r[idxArea],
    rate: r[idxRate],
    supervisor: r[idxSupervisor],
    hygieneViolations: (r[idxViolations] && r[idxViolations] !== '[]') ? "Yes" : "No"
  }));
}

// --- SUBMISSION & PDF ---

function submitReport(data) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let dclSheet = ss.getSheetByName("DCL");
    
    const staticHeaders = ["Timestamp", "Date", "Branch", "Supervisor", "Area", "Team Leader", "Staff Violations", "Rate"];
    
    if(dclSheet.getLastRow() === 0) {
      let allHeaders = [...staticHeaders];
      data.answers.forEach(a => allHeaders.push(a.question));
      dclSheet.appendRow(allHeaders);
    }

    const currentHeaders = dclSheet.getRange(1, 1, 1, dclSheet.getLastColumn()).getValues()[0];
    const rowData = new Array(currentHeaders.length).fill(""); 

    const timestamp = new Date();
    
    let rateSum = 0; let rateCount = 0;
    data.answers.forEach(a => {
      if(a.type === 'Rate' && a.answer) {
        rateSum += parseFloat(a.answer);
        rateCount++;
      }
    });
    const finalRate = rateCount > 0 ? (rateSum / rateCount).toFixed(1) : "0.0";

    const staticMap = {
      "Timestamp": timestamp,
      "Date": data.date,
      "Branch": data.branch,
      "Supervisor": data.supervisor,
      "Area": data.area,
      "Team Leader": data.teamLeader,
      "Staff Violations": JSON.stringify(data.staff),
      "Rate": finalRate
    };

    for(let i=0; i<currentHeaders.length; i++) {
      const header = currentHeaders[i];
      if(staticMap[header] !== undefined) {
        rowData[i] = staticMap[header];
      } else {
        const ans = data.answers.find(a => a.question === header);
        if(ans) rowData[i] = ans.answer;
      }
    }

    dclSheet.appendRow(rowData);
    const pdfUrl = createAndSendPDF(data, finalRate, timestamp);

    return {success: true, message: "Report Submitted Successfully", pdfUrl: pdfUrl};
  } catch(e) {
    Logger.log(e);
    return {success: false, message: "Error: " + e.toString()};
  }
}

function createAndSendPDF(data, rate, timestamp) {
  const formattedDate = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  const rootFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  let branchFolder;
  const folders = rootFolder.getFoldersByName(data.branch);
  if(folders.hasNext()) branchFolder = folders.next();
  else branchFolder = rootFolder.createFolder(data.branch);

  let staffHtml = "";
  if(data.staff.length > 0) {
    staffHtml = `
    <div style="margin-bottom: 20px;">
      <h3 style="color:#ff6600; border-bottom: 2px solid #ff6600;">Staff & Compliance Violations</h3>
      <table border="1" cellpadding="5" cellspacing="0" width="100%" style="border-collapse:collapse; font-size:12px;">
        <tr style="background:#eee;"><th>ID</th><th>Name</th><th>Violations</th></tr>`;
    data.staff.forEach(s => {
      staffHtml += `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.violations.join(', ')}</td></tr>`;
    });
    staffHtml += `</table></div>`;
  } else {
    staffHtml = `<div style="margin-bottom: 20px;"><h3>Staff Compliance: <span style="color:green;">All Good</span></h3></div>`;
  }

  let qaHtml = `<h3 style="color:#ff6600; border-bottom: 2px solid #ff6600;">Checklist Details</h3>`;
  
  const grouped = {};
  data.answers.forEach(a => {
    if(!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  });

  qaHtml += `<table border="0" cellpadding="5" cellspacing="0" width="100%" style="font-size:12px;">`;
  for(let cat in grouped) {
    qaHtml += `<tr><td colspan="2" style="background:#333; color:white; font-weight:bold; padding:8px;">${cat}</td></tr>`;
    grouped[cat].forEach((q, idx) => {
      const bg = idx % 2 === 0 ? '#fff' : '#f9f9f9';
      qaHtml += `<tr style="background:${bg};"><td width="70%" style="border-bottom:1px solid #ddd;">${q.question}</td><td style="border-bottom:1px solid #ddd; font-weight:bold;">${q.answer}</td></tr>`;
    });
  }
  qaHtml += `</table>`;

  const htmlContent = `
    <html><head><style>
      @page { margin: 0.25in; }
      body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; }
      .header { text-align:center; margin-bottom: 20px; }
      .meta { width: 100%; margin-bottom: 20px; font-size: 14px; }
      .meta td { padding: 4px; }
      .score { font-size: 24px; color: #ff6600; font-weight: bold; }
    </style></head><body>
      <div class="header">
        <h1 style="margin:0; color:#ff6600;">NEW BON CAFE CO. LTD.</h1>
        <h2 style="margin:5px 0; color:#555;">Daily Branch Visit Report</h2>
      </div>
      
      <table class="meta">
        <tr>
          <td><strong>Date:</strong> ${data.date}</td>
          <td><strong>Branch:</strong> ${data.branch}</td>
        </tr>
        <tr>
          <td><strong>Supervisor:</strong> ${data.supervisor}</td>
          <td><strong>Area:</strong> ${data.area}</td>
        </tr>
        <tr>
          <td><strong>Team Leader:</strong> ${data.teamLeader}</td>
          <td><strong>Overall Rate:</strong> <span class="score">${rate} ⭐</span></td>
        </tr>
      </table>
      
      ${staffHtml}
      ${qaHtml}
      
      <br><br>
      <hr>
      <p style="font-size:10px; color:grey; text-align:center;">Created by Training-Coordinator | New Bon Café Co. Ltd.</p>
    </body></html>
  `;

  const blob = Utilities.newBlob(htmlContent, MimeType.HTML).getAs(MimeType.PDF);
  blob.setName(`${data.branch}_${formattedDate}.pdf`);
  const file = branchFolder.createFile(blob);

  const subject = `Daily Branch Visit Report - ${data.branch}`;
  const body = `Daily Branch Visit Report\n\nDate: ${data.date}\nBranch: ${data.branch}\nName: ${data.supervisor}\nArea: ${data.area}\n\nPlease see the attach file for reference Report, during the Branch Visit.\n\nThank you.`;
  
  MailApp.sendEmail({
    to: `${data.userEmail},${CONFIG.ADMIN_EMAIL}`,
    subject: subject,
    body: body,
    attachments: [file]
  });

  return file.getUrl();
}

function sendFilteredReport(email, pdfHtml) {
   const blob = Utilities.newBlob(pdfHtml, MimeType.HTML).getAs(MimeType.PDF).setName("Team_Leader_Status_Report.pdf");
   
   MailApp.sendEmail({
     to: email,
     subject: "Filtered Team Leader Status Report",
     htmlBody: "Please find the requested report attached.<br><br>New Bon Café Co. Ltd.",
     attachments: [blob]
   });
   return "Sent";
}
