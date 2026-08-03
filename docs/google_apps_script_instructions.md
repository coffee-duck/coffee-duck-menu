# Google Apps Script Setup Instructions

Follow these steps exactly to create the API for your menu.

## 1. Prepare Your Google Sheet

Open your Google Sheet: https://docs.google.com/spreadsheets/d/1FeIoDsecnkCbgOLQQ98CPFOOIvxrZpJxjgGSIVYwOkE/edit?gid=0#gid=0

Create a sheet named exactly **Products** (case-sensitive) with the following headers in Row 1:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| id | category_en | category_ar | name_en | name_ar | price | availability | order | image_key |

**Explanation of Columns:**
- `id`: A unique number for each item (1, 2, 3...).
- `category_en`: Category name in English (e.g., "Duck Espresso Corner").
- `category_ar`: Category name in Arabic (e.g., "ركن الإسبريسو").
- `name_en`: Product name in English.
- `name_ar`: Product name in Arabic.
- `price`: The price (can be a number like 90, or text like "45 / 55").
- `availability`: Type `TRUE` if available, `FALSE` if sold out.
- `order`: A number indicating the order of the product within the category (1, 2, 3...).
- `image_key`: Used for the category background image. Just set this to the filename of the image on the first item of a category. Example: `espresso.jpeg`.

*(Optional) Create a second sheet named **Settings** if you want to store store hours, but for now we will keep them static.*

## 2. Add the Apps Script Code

1. In your Google Sheet menu, click **Extensions** > **Apps Script**.
2. Delete any code in the editor and replace it with the code below:

```javascript
// Code.gs
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Products");
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Sheet 'Products' not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const items = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let item = {};
    for (let j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }
    
    // Only include available items
    if (item.availability === true || item.availability === 'TRUE' || item.availability === 1) {
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
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}
```

## 3. Deploy as Web App

1. Click the **Deploy** button (top right) > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Under Description, type "Menu API v1".
4. Under "Execute as", choose **Me (your email)**.
5. Under "Who has access", select **Anyone**.
6. Click **Deploy**.
7. If prompted, click "Authorize access" and allow the permissions (you might see an "unsafe" warning, click "Advanced" and then "Go to project").
8. **Copy the "Web app URL"**. You will paste this URL into the `config.js` file of your project.
