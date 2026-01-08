<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kode OTP Reset Password - SI-PORSI GERMAS</title>
</head>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color:#f5f5f5; padding:24px;">
    <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px 24px 20px;border:1px solid #e5e7eb;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">
            Halo {{ $name }},
        </h2>

        <p style="margin:0 0 12px;font-size:14px;color:#4b5563;line-height:1.6;">
            Berikut kode OTP untuk reset password akun <strong>SI-PORSI GERMAS</strong> Anda:
        </p>

        <div style="margin:16px 0;padding:12px 16px;border-radius:999px;background:#ecfdf5;border:1px solid #bbf7d0;text-align:center;">
            <span style="font-size:24px;font-weight:700;letter-spacing:0.2em;color:#16a34a;font-family:'SF Mono','Menlo',monospace;">
                {{ $otp }}
            </span>
        </div>

        <p style="margin:0 0 12px;font-size:14px;color:#4b5563;line-height:1.6;">
            Kode ini berlaku selama <strong>10 menit</strong>. 
            Jangan berikan kode ini kepada siapa pun, termasuk pihak yang mengaku dari SI-PORSI GERMAS.
        </p>

        <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Jika Anda tidak merasa meminta reset password, Anda dapat mengabaikan email ini.
        </p>

        <p style="margin:16px 0 0;font-size:14px;color:#4b5563;">
            Terima kasih,<br>
            <strong>SI-PORSI GERMAS &mdash; Dinas Kesehatan Provinsi Jawa Timur</strong>
        </p>
    </div>
</body>
</html>