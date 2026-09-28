import { ChecklistSection, PictureFieldConfig } from '../types/inspection';

// BATTERY TYPE PICTURES CONFIGURATION
export const batteryPictureFieldsConfig: PictureFieldConfig[] = [
  { key: 'FRONT_MACHINE', label: 'FRONT MACHINE', required: true },
  { key: 'REAR_MACHINE', label: 'REAR MACHINE', required: true },
  { key: 'LEFT_SIDE_MACHINE', label: 'LEFT SIDE MACHINE', required: true },
  { key: 'RIGHT_SIDE_MACHINE', label: 'RIGHT SIDE MACHINE', required: true },
  { key: 'LEFT_FRONT_TIRE', label: 'LEFT FRONT TIRE', required: true },
  { key: 'RIGHT_FRONT_TIRE', label: 'RIGHT FRONT TIRE', required: true },
  { key: 'LEFT_REAR_TIRE', label: 'LEFT REAR TIRE', required: true },
  { key: 'RIGHT_REAR_TIRE', label: 'RIGHT REAR TIRE', required: true },
  { key: 'BATTERY_COMPARTMENT', label: 'BATTERY COMPARTMENT', required: true },
  { key: 'TANK_COMPARTMENT', label: 'TANK COMPARTMENT', required: true },
  { key: 'JOYSTICK', label: 'JOYSTICK', required: true },
  { key: 'DATA_PLATES', label: 'DATA PLATES', required: true },
  { key: 'PLATFORM_BASKET', label: 'PLATFORM BASKET', required: true },
  { key: 'JIB_STRUCTURE', label: 'JIB STRUCTURE (IF APPLICABLE)', required: false, hint: 'Optional if machine does not have a jib' }
];

// ENGINE TYPE PICTURES CONFIGURATION
export const enginePictureFieldsConfig: PictureFieldConfig[] = [
  { key: 'FRONT_MACHINE', label: 'FRONT MACHINE', required: true },
  { key: 'REAR_MACHINE', label: 'REAR MACHINE', required: true },
  { key: 'LEFT_SIDE_MACHINE', label: 'LEFT SIDE MACHINE', required: true },
  { key: 'RIGHT_SIDE_MACHINE', label: 'RIGHT SIDE MACHINE', required: true },
  { key: 'LEFT_FRONT_TIRE', label: 'LEFT FRONT TIRE', required: true },
  { key: 'RIGHT_FRONT_TIRE', label: 'RIGHT FRONT TIRE', required: true },
  { key: 'LEFT_REAR_TIRE', label: 'LEFT REAR TIRE', required: true },
  { key: 'RIGHT_REAR_TIRE', label: 'RIGHT REAR TIRE', required: true },
  { key: 'ENGINE_COMPARTMENT', label: 'ENGINE COMPARTMENT', required: true },
  { key: 'TANK_COMPARTMENT', label: 'TANK COMPARTMENT', required: true },
  { key: 'JOYSTICK', label: 'JOYSTICK', required: true },
  { key: 'DATA_PLATES', label: 'DATA PLATES', required: true },
  { key: 'PLATFORM_BASKET', label: 'PLATFORM BASKET', required: true },
  { key: 'JIB_STRUCTURE', label: 'JIB STRUCTURE (IF APPLICABLE)', required: false, hint: 'Optional if machine does not have a jib' }
];

// BATTERY TYPE CHECKLIST STRUCTURE
export const batterySections: ChecklistSection[] = [
  {
    id: 'battery',
    title: 'BATTERY (FOR DC MODEL ONLY)',
    commentName: 'batt_comment',
    commentRequired: true,
    commentLabel: 'Section Comment (Battery voltage/drop & charger amp output reading required)',
    items: [
      { name: 'batt_1', label: 'Battery 1' },
      { name: 'batt_2', label: 'Battery 2' },
      { name: 'batt_3', label: 'Battery 3' },
      { name: 'batt_4', label: 'Battery 4' },
      { name: 'batt_5', label: 'Battery 5' },
      { name: 'batt_6', label: 'Battery 6' },
      { name: 'batt_7', label: 'Battery 7' },
      { name: 'batt_8', label: 'Battery 8' },
      { name: 'batt_cables', label: 'Battery cables & terminals' },
      { name: 'batt_overall', label: 'Battery overall' }
    ]
  },
  {
    id: 'hydraulics',
    title: 'HYDRAULICS SYSTEM',
    commentName: 'hyd_comment',
    commentRequired: false,
    commentLabel: 'Section Comment',
    items: [
      { name: 'hyd_oil', label: 'Hydraulic oil level' },
      { name: 'hyd_leaks', label: 'Hydraulic leaks' },
      { name: 'hyd_filter', label: 'Hydraulic tank filter' },
      { name: 'hyd_valve', label: 'Valve leak' },
      { name: 'hyd_hose', label: 'Hydraulic hose/fitting' },
      { name: 'hyd_drive', label: 'Drive and braking system' },
      { name: 'hyd_temp', label: 'Hydraulic temperature' },
      { name: 'hyd_damage', label: 'Damage, loose or missing parts' }
    ]
  },
  {
    id: 'structure',
    title: 'STRUCTURE',
    commentName: 'str_comment',
    commentRequired: false,
    commentLabel: 'Section Comment',
    items: [
      { name: 'str_damage', label: 'Damage, loose or missing parts' },
      { name: 'str_axle', label: 'Oscillate axle' },
      { name: 'str_tires', label: 'Tires and wheels' },
      { name: 'str_boom', label: 'Boom wear pads' },
      { name: 'str_turntable', label: 'Turntable bearing bolts' },
      { name: 'str_freewheel', label: 'Free-wheel configurations' },
      { name: 'str_pins', label: 'Pins, bearing & bush' },
      { name: 'str_basket', label: 'Basket platform' },
      { name: 'str_grease', label: 'Grease rotation bearing/Gearbox Wheel' }
    ]
  },
  {
    id: 'electrical',
    title: 'ELECTRICAL SYSTEM',
    commentName: 'elec_comment',
    commentRequired: false,
    commentLabel: 'Section Comment',
    items: [
      { name: 'elec_estop', label: 'Emergency stop button' },
      { name: 'elec_key', label: 'Key switch' },
      { name: 'elec_foot', label: 'Foot switch/Enable switch' },
      { name: 'elec_platform', label: 'Platform and Ground function test' },
      { name: 'elec_drive_speed', label: 'Drive speed stowed and elevating' },
      { name: 'elec_horn', label: 'Horn system' },
      { name: 'elec_drive_enable', label: 'Drive enable system' },
      { name: 'elec_charger', label: 'Charger Ampere' },
      { name: 'elec_battery_conn', label: 'Battery/battery connection/water' },
      { name: 'elec_wiring', label: 'Wiring and connector' },
      { name: 'elec_motor', label: 'AC/DC motor (Carbon brush & Amps)' },
      { name: 'elec_plug', label: 'Plug point (3 pin/industrial)' }
    ]
  },
  {
    id: 'safety',
    title: 'SAFETY DEVICES',
    commentName: 'saf_comment',
    commentRequired: false,
    commentLabel: 'Section Comment',
    items: [
      { name: 'saf_manual', label: 'Manual lowering and AUX power' },
      { name: 'saf_tilt', label: 'Tilt sensor' },
      { name: 'saf_limit', label: 'Limit switch' },
      { name: 'saf_motion', label: 'Motion & warning alarm' },
      { name: 'saf_beacon', label: 'Beacon light' },
      { name: 'saf_scissor', label: 'Scissor safety features (Pothole/arm)' },
      { name: 'saf_gates', label: 'Platform entry gates and railings' },
      { name: 'saf_freewheel', label: 'Free wheeling functions' }
    ]
  },
  {
    id: 'others',
    title: 'OTHERS',
    commentName: 'oth_comment',
    commentRequired: false,
    commentLabel: 'Section Comment',
    items: [
      { name: 'oth_labels', label: 'Labels, decals and painting' },
      { name: 'oth_sticker', label: 'Eastway Engineering sticker' },
      { name: 'oth_swl', label: 'Safe working load (SWL)' }
    ]
  }
];

// ENGINE TYPE CHECKLIST STRUCTURE
export const engineSections: ChecklistSection[] = [
  {
    id: 'engine',
    title: 'ENGINE',
    commentName: 'eng_comment',
    commentRequired: true,
    commentLabel: 'Engine Section Comment (Battery voltage & Alternator amp output reading required)',
    items: [
      { name: 'eng_oil', label: 'Engine oil level' },
      { name: 'eng_leaks', label: 'Fuel/oil leaks' },
      { name: 'eng_belt', label: 'Engine belting' },
      { name: 'eng_timing_belt', label: 'Timing belt' },
      { name: 'eng_oil_filter', label: 'Engine oil filter' },
      { name: 'eng_fuel_filter', label: 'Fuel filter' },
      { name: 'eng_air_filter', label: 'Air filter clean/Replace new' },
      { name: 'eng_idle_rpm', label: 'Engine idle/RPM speed' },
      { name: 'eng_exhaust', label: 'Exhaust system' },
      { name: 'eng_radiator', label: 'Engine radiator/Oil cooler' },
      { name: 'eng_temp', label: 'Engine temperature' },
      { name: 'eng_diesel_level', label: 'Diesel oil level' },
      { name: 'eng_starter', label: 'Starter' },
      { name: 'eng_alternator', label: 'Alternator' },
      { name: 'eng_solenoid', label: 'Fuel solenoid' },
      { name: 'eng_water_separator', label: 'Water seperator' },
      { name: 'eng_mounting', label: 'Engine mounting' },
      { name: 'eng_diesel_tank', label: 'Diesel tank' },
      { name: 'eng_fip', label: 'FIP' }
    ]
  },
  {
    id: 'hydraulics',
    title: 'HYDRAULIC SYSTEM',
    commentName: 'hyd_comment',
    commentRequired: false,
    commentLabel: 'Hydraulics System Section Comment',
    items: [
      { name: 'hyd_oil', label: 'Hydraulic oil level' },
      { name: 'hyd_leaks', label: 'Hydraulic leaks' },
      { name: 'hyd_filter', label: 'Hydraulic tank filter' },
      { name: 'hyd_valve', label: 'Valve leak' },
      { name: 'hyd_hose', label: 'Hydraulic hose/fitting' },
      { name: 'hyd_drive', label: 'Drive and braking system' },
      { name: 'hyd_temp', label: 'Hydraulic temperature' }
    ]
  },
  {
    id: 'structure',
    title: 'STRUCTURE',
    commentName: 'str_comment',
    commentRequired: false,
    commentLabel: 'Structure Section Comment',
    items: [
      { name: 'str_damage', label: 'Damage, loose or missing parts' },
      { name: 'str_axle', label: 'Oscillate axle' },
      { name: 'str_tires', label: 'Tires and wheels' },
      { name: 'str_boom', label: 'Boom wear pads' },
      { name: 'str_turntable', label: 'Turntable bearing bolts' },
      { name: 'str_freewheel', label: 'Free-wheel configurations' },
      { name: 'str_pins', label: 'Pins, bearing & bush' },
      { name: 'str_basket', label: 'Basket platform' },
      { name: 'str_grease', label: 'Grease rotation bearing/Gearbox Wheel' }
    ]
  },
  {
    id: 'electrical',
    title: 'ELECTRICAL SYSTEM',
    commentName: 'elec_comment',
    commentRequired: false,
    commentLabel: 'Electrical System Comment',
    items: [
      { name: 'elec_estop', label: 'Emergency stop button' },
      { name: 'elec_key', label: 'Key switch' },
      { name: 'elec_foot', label: 'Foot switch/Enable switch' },
      { name: 'elec_platform', label: 'Platform and Ground function test' },
      { name: 'elec_drive_speed', label: 'Drive speed stowed and elevating' },
      { name: 'elec_horn', label: 'Horn system' },
      { name: 'elec_drive_enable', label: 'Drive enable system' },
      { name: 'elec_alt_amp', label: 'Alternator Ampere Output' },
      { name: 'elec_battery_conn', label: 'Battery/battery connection/battery water' },
      { name: 'elec_wiring', label: 'Wiring and connector' },
      { name: 'elec_motor', label: 'AC/DC motor (Carbon brush & Amps)' },
      { name: 'elec_plug', label: 'Plug point (3 pin/industrial)' }
    ]
  },
  {
    id: 'safety',
    title: 'SAFETY DEVICES',
    commentName: 'saf_comment',
    commentRequired: false,
    commentLabel: 'Safety Devices Comment',
    items: [
      { name: 'saf_manual', label: 'Manual lowering and AUX power' },
      { name: 'saf_tilt', label: 'Tilt sensor' },
      { name: 'saf_limit', label: 'Limit switch' },
      { name: 'saf_motion', label: 'Motion & warning alarm' },
      { name: 'saf_beacon', label: 'Beacon light' },
      { name: 'saf_scissor', label: 'Scissor safety features (Pothole/arm)' },
      { name: 'saf_gates', label: 'Platform entry gates and railings' },
      { name: 'saf_freewheel', label: 'Free wheeling functions' }
    ]
  },
  {
    id: 'others',
    title: 'OTHERS',
    commentName: 'oth_comment',
    commentRequired: false,
    commentLabel: 'Others Section Comment',
    items: [
      { name: 'oth_labels', label: 'Labels, decals and painting' },
      { name: 'oth_sticker', label: 'Eastway sticker' },
      { name: 'oth_swl', label: 'Safe working load (SWL)' }
    ]
  }
];
