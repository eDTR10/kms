// Curated Lucide icons offered for the Map widget's custom marker (Data Source → Map →
// Icon mode — see FreeWifiCharts.tsx's DataSourceModal and FreeWifiMap.tsx's divIcon
// construction). Lives in its own module, not inside either of those two files, because
// FreeWifiCharts.tsx already imports FreeWifiMap — a shared constant living in one of them
// and imported by the other would make that a circular import.
import {
  MapPin, Navigation, Flag, Star, Home, Building2, School, GraduationCap, Landmark, Hospital,
  ShoppingBag, Wifi, Signal, Radio, TreePine, Factory, Warehouse, Store, Users, Droplet, Zap,
} from 'lucide-react';

export const MARKER_ICON_OPTIONS = [
  { name: 'MapPin', Icon: MapPin },
  { name: 'Navigation', Icon: Navigation },
  { name: 'Flag', Icon: Flag },
  { name: 'Star', Icon: Star },
  { name: 'Home', Icon: Home },
  { name: 'Building2', Icon: Building2 },
  { name: 'School', Icon: School },
  { name: 'GraduationCap', Icon: GraduationCap },
  { name: 'Landmark', Icon: Landmark },
  { name: 'Hospital', Icon: Hospital },
  { name: 'ShoppingBag', Icon: ShoppingBag },
  { name: 'Wifi', Icon: Wifi },
  { name: 'Signal', Icon: Signal },
  { name: 'Radio', Icon: Radio },
  { name: 'TreePine', Icon: TreePine },
  { name: 'Factory', Icon: Factory },
  { name: 'Warehouse', Icon: Warehouse },
  { name: 'Store', Icon: Store },
  { name: 'Users', Icon: Users },
  { name: 'Droplet', Icon: Droplet },
  { name: 'Zap', Icon: Zap },
];
