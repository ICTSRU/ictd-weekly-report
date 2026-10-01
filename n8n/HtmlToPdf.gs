/**
 * ICTD — HTML to PDF endpoint
 * ------------------------------------------------------------------
 * Version : 1.0
 * Used by : n8n workflow "ICTD Weekly Report — Email to CIO" v1.1
 * Author  : Mohamed ElMahdy, IT Operations Manager, SRU
 *
 * WHAT THIS IS
 * A renderer, nothing more. n8n builds the report HTML and posts it here;
 * this returns the same thing as a base64 PDF. n8n then attaches it and
 * sends the mail.
 *
 * WHY IT IS SO SMALL
 * n8n Cloud has no HTML-to-PDF node, and Apps Script converts HTML to PDF
 * natively and for free. Keeping ONLY the conversion here means the report
 * layout lives in exactly one place — the n8n Build Email node — so the
 * email body and the PDF can never drift apart.
 *
 * DEPLOY
 *   1. Apps Script (any project) -> paste this in -> Save
 *   2. Deploy -> New deployment -> Web app
 *        Execute as : Me
 *        Access     : Anyone
 *   3. Copy the /exec URL into the n8n node "Render PDF"
 *
 * SECURITY
 * The endpoint is public, so it is gated on a shared token. TOKEN here must
 * match the token the n8n node sends. Without it, anyone with the URL has a
 * free HTML-to-PDF converter running under your Google account.
 */

var TOKEN = '4Gh59SgzSL65T1T1wDGEilCFqydgDZrg';

var MAX_HTML_BYTES = 8 * 1024 * 1024;   // refuse absurd payloads

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > MAX_HTML_BYTES) return json_({ok: false, error: 'Payload too large.'});

    var req;
    try { req = JSON.parse(raw); }
    catch (err) { return json_({ok: false, error: 'Body is not valid JSON.'}); }

    if (TOKEN && req.token !== TOKEN) return json_({ok: false, error: 'Unauthorized.'});

    var html = String(req.html || '');
    if (!html) return json_({ok: false, error: 'No html supplied.'});

    var name = String(req.filename || 'report.pdf');
    if (name.slice(-4).toLowerCase() !== '.pdf') name += '.pdf';

    var pdf = Utilities
      .newBlob(html, MimeType.HTML, 'src.html')
      .getAs(MimeType.PDF)
      .setName(name);

    return json_({
      ok: true,
      filename: name,
      bytes: pdf.getBytes().length,
      base64: Utilities.base64Encode(pdf.getBytes())
    });

  } catch (err) {
    return json_({ok: false, error: String(err && err.message || err)});
  }
}

/** Lets you confirm the deployment is live from a browser. */
function doGet() {
  return json_({ok: true, service: 'ICTD HTML to PDF', version: '1.0'});
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run from the editor to confirm conversion works before wiring n8n up. */
function testRender() {
  var res = doPost({postData: {contents: JSON.stringify({
    token: TOKEN,
    filename: 'test.pdf',
    html: '<html><body><h1 style="font-family:Arial;color:#501e8c;">ICTD test</h1>' +
          '<p style="font-family:Arial;">If you can read this in a PDF, the renderer works.</p></body></html>'
  })}});
  var out = JSON.parse(res.getContent());
  Logger.log('ok=' + out.ok + '  bytes=' + out.bytes + '  error=' + (out.error || '-'));
  if (out.ok) {
    var f = DriveApp.createFile(Utilities.newBlob(
      Utilities.base64Decode(out.base64), 'application/pdf', 'ICTD renderer test.pdf'));
    Logger.log('Preview: ' + f.getUrl());
  }
}
