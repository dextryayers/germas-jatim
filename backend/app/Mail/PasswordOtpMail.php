<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public string $otp;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $otp)
    {
        $this->user = $user;
        $this->otp = $otp;
    }

    /**
     * Build the message.
     */
    public function build(): self
    {
        return $this
            ->subject('Kode OTP Reset Password Akun GERMAS')
            ->view('emails.password-otp')
            ->with([
                'name' => $this->user->name,
                'otp' => $this->otp,
            ]);
    }
}
