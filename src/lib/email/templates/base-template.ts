export function baseTemplate(body: string, opts?: { preview?: string }): string {
  const preview = opts?.preview
    ? `<div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${opts.preview}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>DRMS Notification</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
  ${preview}
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <tr>
      <td style="background:#1e40af;padding:20px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">DRMS Borno</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;">
        ${body}
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#64748b;">
          Disaster Response Management System — Borno State, Nigeria
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
