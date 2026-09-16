using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Gateway.Entities;

namespace Gateway.Features.ContactMessages;

/// <summary>Yeni bir ContactMessage oluşturur (herkese açık iletişim formu); üretilen kimliği döndürür.</summary>
public sealed class CreateContactMessageCommand : ICommand<Guid>
{
    /// <summary>Gönderenin adı.</summary>
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Gönderenin e-postası.</summary>
    [Required]
    [EmailAddress]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    /// <summary>Mesaj içeriği.</summary>
    [Required]
    public string Body { get; set; } = string.Empty;
}

internal sealed class CreateContactMessageHandler : ICommandHandler<CreateContactMessageCommand, Guid>
{
    private readonly IRepository<ContactMessage> _repository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateContactMessageHandler(IRepository<ContactMessage> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateContactMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new ContactMessage
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            Body = request.Body.Trim(),
            Status = "Yeni",
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Bir ContactMessage'ın durumunu günceller — CodeGen dışı, elle eklendi (admin moderasyonu).</summary>
public sealed class UpdateContactMessageStatusCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Yeni durum: Yeni | İnceleniyor | Çözüldü.</summary>
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = string.Empty;
}

internal sealed class UpdateContactMessageStatusHandler : ICommandHandler<UpdateContactMessageStatusCommand>
{
    private static readonly HashSet<string> ValidStatuses = ["Yeni", "İnceleniyor", "Çözüldü"];

    private readonly IRepository<ContactMessage> _repository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateContactMessageStatusHandler(IRepository<ContactMessage> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateContactMessageStatusCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!ValidStatuses.Contains(request.Status))
        {
            throw new BaseForge.Core.Exceptions.ValidationException("Status", $"Geçersiz durum: '{request.Status}'.");
        }

        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("ContactMessage", request.Id);
        entity.Status = request.Status;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir ContactMessage kaydını siler.</summary>
public sealed class DeleteContactMessageCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteContactMessageHandler : ICommandHandler<DeleteContactMessageCommand>
{
    private readonly IRepository<ContactMessage> _repository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteContactMessageHandler(IRepository<ContactMessage> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteContactMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("ContactMessage", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
