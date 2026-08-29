import type { ComponentType, SVGProps } from "react";
import { SolarPanelIcon } from "./SolarPanelIcon";
import { BatteryIcon } from "./BatteryIcon";
import { ControllerIcon } from "./ControllerIcon";
import { CableIcon } from "./CableIcon";
import { ConnectorIcon } from "./ConnectorIcon";
import { InverterIcon } from "./InverterIcon";
import { GenericCategoryIcon } from "./GenericCategoryIcon";

export { SolarPanelIcon } from "./SolarPanelIcon";
export { BatteryIcon } from "./BatteryIcon";
export { ControllerIcon } from "./ControllerIcon";
export { CableIcon } from "./CableIcon";
export { ConnectorIcon } from "./ConnectorIcon";
export { InverterIcon } from "./InverterIcon";
export { GenericCategoryIcon } from "./GenericCategoryIcon";

// Одна таблиця «ключ категорії → іконка» на весь застосунок.
//
// Раніше відповідність жила ЛИШЕ всередині головної сторінки, до того ж
// списком із трьох жорстко прописаних пунктів, а все інше (CABLE,
// CONNECTOR, INVERTER) отримувало GenericCategoryIcon — три однакові
// кубики поспіль у сітці категорій. Тепер кожна наявна категорія має
// власну іконку, а таблиця лежить поруч із самими іконками: завести
// категорію й намалювати їй іконку — одна правка в одному місці, а не
// пошук усіх сторінок, що показують категорії.
//
// GenericCategoryIcon лишається — саме як фолбек для категорії, яку
// завели в адмінці, а іконку ще не намалювали. Нейтральний кубик
// кращий за порожнє місце.
const CATEGORY_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  SOLAR_PANEL: SolarPanelIcon,
  BATTERY: BatteryIcon,
  CONTROLLER: ControllerIcon,
  CABLE: CableIcon,
  CONNECTOR: ConnectorIcon,
  INVERTER: InverterIcon,
};

export function categoryIconFor(categoryKey: string): ComponentType<SVGProps<SVGSVGElement>> {
  return CATEGORY_ICONS[categoryKey] ?? GenericCategoryIcon;
}
