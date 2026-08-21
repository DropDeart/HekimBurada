using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Community.Entities;
using Community.Integration;

namespace Community.Features.CommunityCategorys;

/// <summary>Yeni bir CommunityCategory oluşturur; üretilen kimliği döndürür. CodeGen dışı: doktorlar
/// kendi topluluklarını kurabilir (bkz. plan "Topluluk oluştur" kararı) — oluşturan otomatik ilk üye +
/// moderatör (IsAdmin) olur.</summary>
public sealed class CreateCommunityCategoryCommand : ICommand<Guid>
{
    /// <summary>Name.</summary>
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    /// <summary>Kind — Branş/Cihaz/Bölge. CodeGen dışı, elle eklendi.</summary>
    [MaxLength(30)]
    public string Kind { get; set; } = "Branş";
    /// <summary>Description. CodeGen dışı, elle eklendi.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>IsClosed. CodeGen dışı, elle eklendi.</summary>
    public bool IsClosed { get; set; } = true;
    /// <summary>Rules. CodeGen dışı, elle eklendi.</summary>
    public string Rules { get; set; } = string.Empty;
    /// <summary>Oluşturan doktor — controller tarafından JWT'den ezilir (bkz. Topic/Comment/Like'daki
    /// "client-supplied değerine güvenilmiyor" kalıbı). CodeGen dışı, elle eklendi.</summary>
    public Guid CreatorId { get; set; }
}

internal sealed class CreateCommunityCategoryHandler : ICommandHandler<CreateCommunityCategoryCommand, Guid>
{
    private readonly IRepository<CommunityCategory> _repository;
    private readonly IRepository<Membership> _membershipRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    public CreateCommunityCategoryHandler(
        IRepository<CommunityCategory> repository,
        IRepository<Membership> membershipRepository,
        IUnitOfWork unitOfWork,
        IUserClient userClient)
    {
        _repository = repository;
        _membershipRepository = membershipRepository;
        _unitOfWork = unitOfWork;
        _userClient = userClient;
    }

    public async Task<Guid> Handle(CreateCommunityCategoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await VerificationGate.EnsureApprovedAsync(_userClient, request.CreatorId, cancellationToken);

        var entity = new CommunityCategory
        {
            Name = request.Name,
            Kind = request.Kind,
            Description = request.Description,
            IsClosed = request.IsClosed,
            Rules = request.Rules,
        };
        await _repository.AddAsync(entity, cancellationToken);

        var membership = new Membership
        {
            CategoryId = entity.Id,
            UserId = request.CreatorId,
            IsAdmin = true,
            AutoJoined = false,
        };
        await _membershipRepository.AddAsync(membership, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir CommunityCategory kaydını günceller.</summary>
public sealed class UpdateCommunityCategoryCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Name.</summary>
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    /// <summary>Kind. CodeGen dışı, elle eklendi.</summary>
    [MaxLength(30)]
    public string Kind { get; set; } = "Branş";
    /// <summary>Description. CodeGen dışı, elle eklendi.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>IsClosed. CodeGen dışı, elle eklendi.</summary>
    public bool IsClosed { get; set; } = true;
    /// <summary>Rules. CodeGen dışı, elle eklendi.</summary>
    public string Rules { get; set; } = string.Empty;
}

internal sealed class UpdateCommunityCategoryHandler : ICommandHandler<UpdateCommunityCategoryCommand>
{
    private readonly IRepository<CommunityCategory> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateCommunityCategoryHandler(IRepository<CommunityCategory> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateCommunityCategoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("CommunityCategory", request.Id);
        entity.Name = request.Name;
        entity.Kind = request.Kind;
        entity.Description = request.Description;
        entity.IsClosed = request.IsClosed;
        entity.Rules = request.Rules;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir CommunityCategory kaydını siler (soft delete).</summary>
public sealed class DeleteCommunityCategoryCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteCommunityCategoryHandler : ICommandHandler<DeleteCommunityCategoryCommand>
{
    private readonly IRepository<CommunityCategory> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteCommunityCategoryHandler(IRepository<CommunityCategory> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteCommunityCategoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("CommunityCategory", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
