using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Gateway.Entities;

/// <summary>
/// Header/Footer navigasyon linki (CodeGen dışı, elle eklendi). <see cref="Location"/> hangi
/// menüde göründüğünü belirler — bkz. <see cref="MenuItemLocations"/>.
/// </summary>
public sealed class MenuItem : BaseEntity
{
    [MaxLength(30)]
    public string Location { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Label { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Url { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}

/// <summary>Geçerli <see cref="MenuItem.Location"/> değerleri — Navbar/Footer'daki sabit slotlarla birebir eşleşir.</summary>
public static class MenuItemLocations
{
    public const string Header = "header";
    public const string FooterPlatform = "footer_platform";
    public const string FooterRules = "footer_rules";

    public static readonly IReadOnlySet<string> All = new HashSet<string> { Header, FooterPlatform, FooterRules };
}
