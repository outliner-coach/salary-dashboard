/**
 * 제어 문자를 제거하는 함수 (필요한 경우)
 */
function sanitizeString(str) {
  return str.replace(/[\u0000-\u001F\u007F]/g, '');
}

/**
 * doGet() 함수
 * - "access list" 탭에서 허용된 이메일 목록(화이트리스트)을 가져와
 *   현재 사용자의 이메일이 화이트리스트에 포함되어 있는지 검사합니다.
 * - 허용된 경우, 메인 데이터 시트(예: "시트이름")에서 데이터를 읽어 템플릿에 전달합니다.
 */
function doGet(e) {
  // 1. 동일한 스프레드시트 내의 두 시트를 사용한다고 가정합니다.
  const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/시트아이디/edit");
  
  // 2. "access list" 시트에서 허용된 이메일 목록 추출
  var accessSheet = ss.getSheetByName("access list");
  if (!accessSheet) {
    return HtmlService.createHtmlOutput("<h1>Error</h1><p>'access list' 시트를 찾을 수 없습니다.</p>");
  }
  var accessValues = accessSheet.getDataRange().getValues();
  if (accessValues.length < 2) {
    return HtmlService.createHtmlOutput("<h1>Error</h1><p>화이트리스트 데이터가 없습니다.</p>");
  }
  // 첫 행에서 "access list"라는 헤더가 있는 열의 인덱스를 찾음 (대소문자 무시)
  var headerRow = accessValues[0];
  var colIndex = -1;
  for (var i = 0; i < headerRow.length; i++) {
    if (String(headerRow[i]).trim().toLowerCase() === "access list") {
      colIndex = i;
      break;
    }
  }
  if (colIndex < 0) {
    return HtmlService.createHtmlOutput("<h1>Error</h1><p>'access list' 헤더를 찾을 수 없습니다.</p>");
  }
  
  var allowedEmails = [];
  for (var i = 1; i < accessValues.length; i++) {
    var email = accessValues[i][colIndex];
    if (email) {
      allowedEmails.push(String(email).trim());
    }
  }
  Logger.log("Whitelist emails: " + allowedEmails.join(", "));
  
  // 3. 현재 사용자 이메일 확인 (실행 권한을 "내가 실행"으로 설정)
  var userEmail = Session.getActiveUser().getEmail();
  if (allowedEmails.indexOf(userEmail) === -1) {
    return HtmlService.createHtmlOutput("<h1>Access Denied</h1><p>You do not have permission to view this page.</p>");
  }
  
  // 4. 메인 데이터 시트 ("시트이름")에서 데이터 읽기
  var mainSheet = ss.getSheetByName("시트(탭)이름");
  if (!mainSheet) {
    return HtmlService.createHtmlOutput("<h1>Error</h1><p>Main data 시트를 찾을 수 없습니다.</p>");
  }
  var values = mainSheet.getDataRange().getValues();
  var headers = values[0];
  var data = values.slice(1).map(function(row) {
    var obj = {};
    row.forEach(function(val, idx) {
      // 필요 시 제어 문자 제거 (옵션)
      if (typeof val === 'string') {
        val = sanitizeString(val);
      }
      obj[headers[idx]] = val;
    });
    return obj;
  });
  
  // 5. JSON으로 직렬화하여 템플릿에 주입
  const jsonString = JSON.stringify(data);
  const template = HtmlService.createTemplateFromFile("index");
  template.jsonData = jsonString;
  
  return template.evaluate().setTitle("직군별 경력연차 연봉 그래프");
}
