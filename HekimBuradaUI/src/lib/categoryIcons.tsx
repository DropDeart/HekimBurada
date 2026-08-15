import type { IconType } from "react-icons";
import {
  FaBaby,
  FaBook,
  FaBriefcase,
  FaCamera,
  FaCar,
  FaCouch,
  FaDumbbell,
  FaGift,
  FaGraduationCap,
  FaHeartPulse,
  FaHouse,
  FaLaptop,
  FaMobileScreenButton,
  FaMusic,
  FaPaw,
  FaScrewdriverWrench,
  FaShirt,
  FaStethoscope,
  FaSyringe,
  FaTag,
} from "react-icons/fa6";

/**
 * Kategori kartlarında gösterilen sabit ikon seti — admin kategori formunda bunlardan biri
 * seçilir (bkz. Category.Icon, backend'de serbest metin ama frontend yalnızca bu anahtarları
 * üretir). Yeni bir anahtar eklerseniz hem burada hem admin/kategoriler sayfasındaki listede
 * (aynı CATEGORY_ICON_KEYS'ten türer) otomatik görünür.
 */
export const CATEGORY_ICONS: Record<string, IconType> = {
  tag: FaTag,
  stethoscope: FaStethoscope,
  syringe: FaSyringe,
  heart_pulse: FaHeartPulse,
  book: FaBook,
  graduation_cap: FaGraduationCap,
  house: FaHouse,
  car: FaCar,
  briefcase: FaBriefcase,
  laptop: FaLaptop,
  mobile: FaMobileScreenButton,
  shirt: FaShirt,
  couch: FaCouch,
  dumbbell: FaDumbbell,
  music: FaMusic,
  camera: FaCamera,
  tool: FaScrewdriverWrench,
  baby: FaBaby,
  paw: FaPaw,
  gift: FaGift,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = CATEGORY_ICONS[icon] ?? FaTag;
  return <Icon className={className} />;
}
