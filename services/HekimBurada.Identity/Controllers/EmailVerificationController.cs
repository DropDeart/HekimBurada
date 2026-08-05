using Identity.Email;
using Identity.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Identity.Controllers;

/// <summary>Kayıt sonrası e-posta OTP doğrulama akışı. CodeGen dışı, elle eklendi.</summary>
[ApiController]
[Route("api/account")]
public sealed class EmailVerificationController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly EmailOtpService _otpService;

    public EmailVerificationController(UserManager<ApplicationUser> userManager, EmailOtpService otpService)
    {
        _userManager = userManager;
        _otpService = otpService;
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> Verify(VerifyEmailRequest request)
    {
        if (request.UserId == Guid.Empty || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new ErrorResponse("Kullanıcı ve kod gerekli."));
        }

        var user = await _userManager.FindByIdAsync(request.UserId.ToString());
        if (user is null)
        {
            return BadRequest(new ErrorResponse("Kullanıcı bulunamadı."));
        }

        if (user.EmailConfirmed)
        {
            return Ok();
        }

        var result = await _otpService.VerifyAsync(request.UserId, request.Code.Trim(), HttpContext.RequestAborted);
        var error = result switch
        {
            EmailOtpVerifyResult.Success => null,
            EmailOtpVerifyResult.Expired => "Kodun süresi doldu. Yeni kod isteyin.",
            EmailOtpVerifyResult.TooManyAttempts => "Çok fazla hatalı deneme. Yeni kod isteyin.",
            EmailOtpVerifyResult.NotFound => "Geçerli bir doğrulama kodu bulunamadı. Yeni kod isteyin.",
            EmailOtpVerifyResult.Invalid or _ => "Kod hatalı.",
        };

        if (error is not null)
        {
            return BadRequest(new ErrorResponse(error));
        }

        user.EmailConfirmed = true;
        await _userManager.UpdateAsync(user);
        return Ok();
    }

    [HttpPost("resend-verification")]
    public async Task<IActionResult> Resend(ResendVerificationRequest request)
    {
        if (request.UserId == Guid.Empty)
        {
            return BadRequest(new ErrorResponse("Kullanıcı gerekli."));
        }

        var user = await _userManager.FindByIdAsync(request.UserId.ToString());
        if (user is null)
        {
            // Kullanıcı numaralandırmasını önlemek için sessizce 200 döner (var/yok bilgisini sızdırmaz).
            return Ok();
        }

        if (user.EmailConfirmed)
        {
            return Ok();
        }

        await _otpService.IssueAndSendAsync(user, HttpContext.RequestAborted);
        return Ok();
    }
}

public sealed record VerifyEmailRequest(Guid UserId, string Code);

public sealed record ResendVerificationRequest(Guid UserId);
