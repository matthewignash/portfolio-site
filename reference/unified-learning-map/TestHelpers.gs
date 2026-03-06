/**
 * QUICK FIX: Create a Test Map
 * Run this function once to add a test map to your database
 * UPDATED: Writes directly to avoid permission check issues
 */
function createTestMap() {
Logger.log('Creating test map...');
try {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const mapsSheet = ss.getSheetByName('Maps');
if (!mapsSheet) {
throw new Error('Maps sheet not found! Run setup first.');
    }
// Create a simple test map
const mapId = 'test-map-' + Date.now();
const currentUser = Session.getEffectiveUser().getEmail();
const now = new Date().toISOString();
const hexes = [
      {
id: 'hex-1',
label: 'Start Here',
icon: '🎯',
type: 'core',
row: 0,
col: 0
      }
    ];
const meta = {
description: 'Test map for builder',
createdAt: now,
createdBy: currentUser
    };
// Write directly to Maps sheet
// Columns: mapId, title, courseId, unitId, gridRows, gridCols, hexesJson, edgesJson, ubdDataJson, metaJson, teacherEmail, createdAt, updatedAt
const rowData = [
mapId,                          // mapId
'Test Map for Builder',         // title
'',                             // courseId
'',                             // unitId
12,                             // gridRows
12,                             // gridCols
JSON.stringify(hexes),          // hexesJson
JSON.stringify([]),             // edgesJson
JSON.stringify({}),             // ubdDataJson
JSON.stringify(meta),           // metaJson
currentUser,                    // teacherEmail
now,                            // createdAt
now                             // updatedAt
    ];
mapsSheet.appendRow(rowData);
Logger.log('✅ Test map created successfully!');
Logger.log('Map ID: ' + mapId);
Logger.log('Map title: Test Map for Builder');
Logger.log('Hexes: 1');
SpreadsheetApp.getUi().alert(
'Success!',
'Test map created: "Test Map for Builder"\n\n' +
'Map ID: ' + mapId + '\n' +
'Hexes: 1\n\n' +
'Now refresh your web app and try the Builder again!',
SpreadsheetApp.getUi().ButtonSet.OK
    );
return {
mapId: mapId,
title: 'Test Map for Builder',
hexes: hexes
    };
  } catch (err) {
Logger.log('❌ Error creating test map: ' + err.message);
Logger.log(err.stack);
SpreadsheetApp.getUi().alert(
'Error',
'Failed to create test map:\n\n' + err.message,
SpreadsheetApp.getUi().ButtonSet.OK
    );
throw err;
  }
}
/**
 * Check how many maps exist
 */
function checkMapCount() {
try {
const maps = getMaps();
Logger.log('Total maps in database: ' + maps.length);
if (maps.length === 0) {
SpreadsheetApp.getUi().alert(
'No Maps Found',
'Your database has 0 maps.\n\n' +
'This is why the Builder shows "Loading..." - there\'s nothing to load!\n\n' +
'Run createTestMap() to add a test map.',
SpreadsheetApp.getUi().ButtonSet.OK
      );
    } else {
let message = 'Found ' + maps.length + ' map(s):\n\n';
maps.forEach((map, i) => {
message += (i + 1) + '. ' + map.title + ' (' + (map.hexes ? map.hexes.length : 0) + ' hexes)\n';
      });
SpreadsheetApp.getUi().alert(
'Maps Found',
message,
SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
return maps.length;
  } catch (err) {
Logger.log('Error checking maps: ' + err.message);
SpreadsheetApp.getUi().alert(
'Error',
'Failed to check maps:\n\n' + err.message,
SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}
