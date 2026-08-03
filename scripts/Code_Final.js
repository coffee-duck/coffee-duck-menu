const SHEET_ID = "1FeIoDsecnkCbgOLQQ98CPFOOIvxrZpJxjgGSIVYwOkE";

function doGet(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheets()[0]; // Get the first tab regardless of its name
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "No sheets found!" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const headers = ["id", "category_en", "category_ar", "name_en", "name_ar", "price", "availability", "order", "image_key"];
  const items = [];

  // Check if first row is header, if so skip it
  let startIndex = 0;
  if (String(data[0][0]).toLowerCase() === "id") {
      startIndex = 1;
  }

  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    let item = {};
    for (let j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }
    
    // Default to true if empty, otherwise check value
    let isAvailable = item.availability;
    if (isAvailable === "" || isAvailable === true || String(isAvailable).toUpperCase() === 'TRUE' || isAvailable === 1) {
       items.push(item);
    }
  }

  // Sort items by order column
  items.sort((a, b) => {
    let orderA = parseInt(a.order) || 0;
    let orderB = parseInt(b.order) || 0;
    return orderA - orderB;
  });

  return ContentService.createTextOutput(JSON.stringify({ data: items }))
    .setMimeType(ContentService.MimeType.JSON);
}
