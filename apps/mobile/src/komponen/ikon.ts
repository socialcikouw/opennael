import type { LucideIcon } from "lucide-react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import ArrowLeftRight from "lucide-react-native/icons/arrow-left-right";
import ArrowUpDown from "lucide-react-native/icons/arrow-up-down";
import BadgeCheck from "lucide-react-native/icons/badge-check";
import Banknote from "lucide-react-native/icons/banknote";
import Bell from "lucide-react-native/icons/bell";
import Calculator from "lucide-react-native/icons/calculator";
import Calendar from "lucide-react-native/icons/calendar";
import Camera from "lucide-react-native/icons/camera";
import Check from "lucide-react-native/icons/check";
import CheckCheck from "lucide-react-native/icons/check-check";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ChevronUp from "lucide-react-native/icons/chevron-up";
import Circle from "lucide-react-native/icons/circle";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import CirclePause from "lucide-react-native/icons/circle-pause";
import Clock from "lucide-react-native/icons/clock";
import CloudOff from "lucide-react-native/icons/cloud-off";
import Delete from "lucide-react-native/icons/delete";
import Eye from "lucide-react-native/icons/eye";
import FileText from "lucide-react-native/icons/file-text";
import HandCoins from "lucide-react-native/icons/hand-coins";
import House from "lucide-react-native/icons/house";
import ImageIcon from "lucide-react-native/icons/image";
import Lock from "lucide-react-native/icons/lock";
import LogOut from "lucide-react-native/icons/log-out";
import MapPin from "lucide-react-native/icons/map-pin";
import Maximize2 from "lucide-react-native/icons/maximize-2";
import Moon from "lucide-react-native/icons/moon";
import Plus from "lucide-react-native/icons/plus";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Repeat from "lucide-react-native/icons/repeat";
import Search from "lucide-react-native/icons/search";
import SearchX from "lucide-react-native/icons/search-x";
import TrendingDown from "lucide-react-native/icons/trending-down";
import TrendingUp from "lucide-react-native/icons/trending-up";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import UserPlus from "lucide-react-native/icons/user-plus";
import Users from "lucide-react-native/icons/users";
import UsersRound from "lucide-react-native/icons/users-round";
import X from "lucide-react-native/icons/x";

/**
 * IKON HP = Lucide (sama dengan web bos, shadcn/ui) — keputusan pemilik 27 Okt
 * 2026. Impor PER IKON (`lucide-react-native/icons/<nama>`), bukan dari akar
 * paket: Metro tidak membuang ikon tak terpakai, impor akar membawa ±1.600
 * ikon (+2 MB bundel / OTA). Nama = nama Lucide (lucide.dev/icons). Ikon
 * baru: impor lalu tambahkan di peta ini.
 */
export const IKON = {
  eye: Eye,
  calendar: Calendar,
  camera: Camera,
  "circle-pause": CirclePause,
  "user-plus": UserPlus,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  lock: Lock,
  "search-x": SearchX,
  "hand-coins": HandCoins,
  "arrow-left": ArrowLeft,
  "arrow-left-right": ArrowLeftRight,
  "arrow-up-down": ArrowUpDown,
  delete: Delete,
  "badge-check": BadgeCheck,
  banknote: Banknote,
  bell: Bell,
  calculator: Calculator,
  check: Check,
  "check-check": CheckCheck,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  circle: Circle,
  "circle-alert": CircleAlert,
  "circle-check": CircleCheck,
  "users-round": UsersRound,
  clock: Clock,
  "cloud-off": CloudOff,
  "file-text": FileText,
  house: House,
  image: ImageIcon,
  "log-out": LogOut,
  "map-pin": MapPin,
  "maximize-2": Maximize2,
  moon: Moon,
  plus: Plus,
  "refresh-cw": RefreshCw,
  repeat: Repeat,
  search: Search,
  "triangle-alert": TriangleAlert,
  users: Users,
  x: X,
} as const satisfies Record<string, LucideIcon>;

export type NamaIkon = keyof typeof IKON;
