using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Messaging.Entities;
using Messaging.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Messaging.Features.Messages;

/// <summary>Yeni bir Message oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateMessageCommand : ICommand<Guid>
{
    /// <summary>Body.</summary>
    [MaxLength(2000)]
    public string Body { get; set; } = string.Empty;
    /// <summary>OfferId.</summary>
    public Guid OfferId { get; set; }
    /// <summary>SenderId.</summary>
    public Guid SenderId { get; set; }
}

internal sealed class CreateMessageHandler : ICommandHandler<CreateMessageCommand, Guid>
{
    private readonly IRepository<Message> _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IHubContext<MessageHub> _hub;
    public CreateMessageHandler(IRepository<Message> repository, IUnitOfWork unitOfWork, IHubContext<MessageHub> hub)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _hub = hub;
    }

    public async Task<Guid> Handle(CreateMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new Message
        {
            Body = request.Body,
            OfferId = request.OfferId,
            SenderId = request.SenderId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // REST üzerinden yazılan mesaj, aynı Offer odasındaki bağlı istemcilere gerçek zamanlı iletilir
        // (bkz. Hubs/MessageHub.cs — CodeGen dışı, elle eklendi).
        await _hub.Clients.Group(MessageHub.GroupName(entity.OfferId))
            .SendAsync("messageReceived", MessageDto.From(entity), cancellationToken);

        return entity.Id;
    }
}

/// <summary>Var olan bir Message kaydını günceller.</summary>
public sealed class UpdateMessageCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Body.</summary>
    [MaxLength(2000)]
    public string Body { get; set; } = string.Empty;
    /// <summary>OfferId.</summary>
    public Guid OfferId { get; set; }
    /// <summary>SenderId.</summary>
    public Guid SenderId { get; set; }
}

internal sealed class UpdateMessageHandler : ICommandHandler<UpdateMessageCommand>
{
    private readonly IRepository<Message> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateMessageHandler(IRepository<Message> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Message", request.Id);
        entity.Body = request.Body;
        entity.OfferId = request.OfferId;
        entity.SenderId = request.SenderId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Message kaydını siler (soft delete).</summary>
public sealed class DeleteMessageCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteMessageHandler : ICommandHandler<DeleteMessageCommand>
{
    private readonly IRepository<Message> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteMessageHandler(IRepository<Message> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Message", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
