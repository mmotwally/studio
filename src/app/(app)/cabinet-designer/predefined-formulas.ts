
import type { PredefinedFormula, CabinetPartType, CabinetTypeContext } from './types';

// Using PT for Panel Thickness as per existing global parameter
export const PREDEFINED_FORMULAS: PredefinedFormula[] = [
  // --- Side Panels ---
  {
    key: 'SIDE_BASE_STD_H', name: 'Side Height (Base H-PT)',
    description: 'Standard base cabinet side panel height: Overall Height - Panel Thickness.',
    example: 'H=720, PT=18 => 720 - 18 = 702',
    partType: 'Side Panel', context: ['Base'], dimension: 'Height', formula: 'H - PT'
  },
  {
    key: 'SIDE_BASE_STD_W', name: 'Side Depth (Base D)',
    description: 'Standard base cabinet side panel depth: Overall Depth.',
    example: 'D=580 => 580',
    partType: 'Side Panel', context: ['Base'], dimension: 'Width', formula: 'D'
  },
  {
    key: 'SIDE_BASE_INT_H', name: 'Side Height (Base Internal H-2PT)',
    description: 'Internal base cabinet side panel height: Overall Height - 2 * Panel Thickness (e.g. for inset bottom).',
    example: 'H=720, PT=18 => 720 - 2*18 = 684',
    partType: 'Side Panel', context: ['Base'], dimension: 'Height', formula: 'H - 2*PT'
  },
  // SIDE_BASE_INT_W is same as SIDE_BASE_STD_W
  {
    key: 'SIDE_WALL_STD_H', name: 'Side Height (Wall H)',
    description: 'Standard wall cabinet side panel height: Overall Height.',
    example: 'H=600 => 600',
    partType: 'Side Panel', context: ['Wall'], dimension: 'Height', formula: 'H'
  },
  {
    key: 'SIDE_WALL_STD_W', name: 'Side Depth (Wall D)',
    description: 'Standard wall cabinet side panel depth: Overall Depth.',
    example: 'D=300 => 300',
    partType: 'Side Panel', context: ['Wall'], dimension: 'Width', formula: 'D'
  },

  // --- Bottom Panels ---
  {
    key: 'BOTTOM_BASE_STD_W', name: 'Bottom Width (Base W)',
    description: 'Standard base cabinet bottom panel width: Overall Width.',
    example: 'W=600 => 600',
    partType: 'Bottom Panel', context: ['Base'], dimension: 'Width', formula: 'W'
  },
  {
    key: 'BOTTOM_BASE_STD_H', name: 'Bottom Depth (Base D)',
    description: 'Standard base cabinet bottom panel depth: Overall Depth.',
    example: 'D=580 => 580',
    partType: 'Bottom Panel', context: ['Base'], dimension: 'Height', formula: 'D' // Using 'Height' as the second dim for panels
  },
  {
    key: 'BOTTOM_WALL_STD_W', name: 'Bottom Width (Wall W-2PT)',
    description: 'Standard wall cabinet bottom panel width: Overall Width - 2 * Panel Thickness.',
    example: 'W=600, PT=18 => 600 - 2*18 = 564',
    partType: 'Bottom Panel', context: ['Wall'], dimension: 'Width', formula: 'W - 2*PT'
  },
  // BOTTOM_WALL_STD_H is same as BOTTOM_BASE_STD_H

  // --- Top Panels/Rails ---
  {
    key: 'TOP_BASE_RAIL_W', name: 'Top Rail Width (Base W-2PT)',
    description: 'Base cabinet top rail width: Overall Width - 2 * Panel Thickness.',
    example: 'W=600, PT=18 => 564',
    partType: ['Top Panel', 'Top Rail (Front)', 'Top Rail (Back)'], context: ['Base'], dimension: 'Width', formula: 'W - 2*PT'
  },
  {
    key: 'TOP_BASE_RAIL_H', name: 'Top Rail Depth (Base 96mm Fixed)',
    description: 'Base cabinet top rail depth (fixed at 96mm as per user spec).',
    example: '96',
    partType: ['Top Panel', 'Top Rail (Front)', 'Top Rail (Back)'], context: ['Base'], dimension: 'Height', formula: '96'
  },
  {
    key: 'TOP_WALL_FULL_W', name: 'Top Width (Wall W)',
    description: 'Standard wall cabinet top panel width: Overall Width.',
    example: 'W=600 => 600',
    partType: 'Top Panel', context: ['Wall'], dimension: 'Width', formula: 'W'
  },
  // TOP_WALL_FULL_H is same as BOTTOM_BASE_STD_H (D)

  // --- Back Panels ---
  {
    key: 'BACK_BASE_STD_W', name: 'Back Panel Width (Base W-2PT)',
    description: 'Standard base cabinet back panel width: Overall Width - 2 * Panel Thickness.',
    example: 'W=600, PT=18 => 564',
    partType: 'Back Panel', context: ['Base'], dimension: 'Width', formula: 'W - 2*PT'
  },
  {
    key: 'BACK_BASE_USER_H', name: 'Back Panel Height (Base 96mm Fixed)',
    description: 'Base cabinet back panel height (fixed at 96mm as per user spec, likely for a rail).',
    example: '96',
    partType: 'Back Panel', context: ['Base'], dimension: 'Height', formula: '96'
  },
  {
    key: 'BACK_BASE_FULL_H', name: 'Back Panel Height (Base Full H-2PT)',
    description: 'A more typical full base cabinet back panel height: Overall Height - 2 * Panel Thickness.',
    example: 'H=720, PT=18 => 684',
    partType: 'Back Panel', context: ['Base'], dimension: 'Height', formula: 'H - 2*PT'
  },
   {
    key: 'BACK_WALL_STD_W', name: 'Back Panel Width (Wall W-2PT-2mm)',
    description: 'Typical wall cabinet back panel width, slightly smaller for inset: Overall Width - 2*PT - 2mm tolerance.',
    example: 'W=600, PT=18 => 562',
    partType: 'Back Panel', context: ['Wall'], dimension: 'Width', formula: 'W - 2*PT - 2'
  },
  {
    key: 'BACK_WALL_STD_H', name: 'Back Panel Height (Wall H-2PT-2mm)',
    description: 'Typical wall cabinet back panel height, slightly smaller for inset: Overall Height - 2*PT - 2mm tolerance.',
    example: 'H=700, PT=18 => 662',
    partType: 'Back Panel', context: ['Wall'], dimension: 'Height', formula: 'H - 2*PT - 2'
  },

  // --- Double Back Panel (Base) ---
  {
    key: 'DBL_BACK_BASE_W', name: 'Double Back Width (Base W-14)',
    description: 'Double back panel width for base cabinet: Overall Width - 14mm.',
    example: 'W=600 => 586',
    partType: 'Double Back Panel', context: ['Base'], dimension: 'Width', formula: 'W - 14'
  },
  {
    key: 'DBL_BACK_BASE_H', name: 'Double Back Height (Base H-2PT+7)',
    description: 'Double back panel height for base: Overall Height - 2*Panel Thickness + 7mm.',
    example: 'H=720, PT=18 => 720 - 36 + 7 = 691',
    partType: 'Double Back Panel', context: ['Base'], dimension: 'Height', formula: 'H - 2*PT + 7'
  },

  // --- Door Sizes ---
  {
    key: 'DOOR_DOUBLE_W', name: 'Door Width (Double Doors)',
    description: 'Width per door for a double door cabinet: (Overall Width - 5mm Gap) / 2.',
    example: 'W=600 => (600-5)/2 = 297.5',
    partType: 'Doors', context: ['Base', 'Wall', 'General'], dimension: 'Width', formula: '(W - 5) / 2'
  },
  {
    key: 'DOOR_DOUBLE_H', name: 'Door Height (Double Doors)',
    description: 'Height for double doors: Overall Height - 4mm Gap.',
    example: 'H=720 => 720 - 4 = 716',
    partType: 'Doors', context: ['Base', 'Wall', 'General'], dimension: 'Height', formula: 'H - 4'
  },
  {
    key: 'DOOR_SINGLE_W', name: 'Door Width (Single Door)',
    description: 'Width for a single door cabinet: Overall Width - 2mm Gap.',
    example: 'W=450 => 450 - 2 = 448',
    partType: 'Door', context: ['Base', 'Wall', 'General'], dimension: 'Width', formula: 'W - 2'
  },
  {
    key: 'DOOR_SINGLE_H', name: 'Door Height (Single Door)',
    description: 'Height for a single door: Overall Height - 4mm Gap.',
    example: 'H=720 => 720 - 4 = 716',
    partType: 'Door', context: ['Base', 'Wall', 'General'], dimension: 'Height', formula: 'H - 4'
  },

  // --- Drawer Box Components ---
  // Note: DW, DD, DH, Clearance are new parameters that need to be in the template.
  {
    key: 'DRW_BACK_FRONT_W', name: 'Drawer Back/CounterFt Width',
    description: 'Drawer back or counter front width: DrawerWidth - (4*PanelThickness + 2*Clearance).',
    example: 'DW=500, PT=18, Clearance=3 => 500 - (4*18 + 2*3) = 500 - (72+6) = 422',
    partType: ['Drawer Back', 'Drawer Counter Front'], context: ['Drawer'], dimension: 'Width', formula: 'DW - (4*PT + 2*Clearance)'
  },
  {
    key: 'DRW_BACK_FRONT_H', name: 'Drawer Back/CounterFt Height',
    description: 'Drawer back or counter front height: DrawerSideHeight (DH) - 30mm.',
    example: 'DH=150 => 150 - 30 = 120',
    partType: ['Drawer Back', 'Drawer Counter Front'], context: ['Drawer'], dimension: 'Height', formula: 'DH - 30'
  },
  // Drawer Side Height & Depth are typically user-defined or direct parameters, not formulas selected here.
  // So, no PREDEFINED_FORMULAS for their primary dimensions.
  {
    key: 'DRW_SIDE_H', name: 'Drawer Side Height (User Input)',
    description: 'User-defined height for drawer sides (e.g., 100-200mm). Use DH parameter.',
    example: 'DH=150',
    partType: 'Drawer Side', context: ['Drawer'], dimension: 'Height', formula: 'DH'
  },
  {
    key: 'DRW_SIDE_D', name: 'Drawer Side Depth (User Input)',
    description: 'User-defined depth for drawer sides (e.g., 250-550mm). Use DD parameter.',
    example: 'DD=500',
    partType: 'Drawer Side', context: ['Drawer'], dimension: 'Width', formula: 'DD' // Width is the second dimension for sides
  },
  {
    key: 'DRW_BOTTOM_W', name: 'Drawer Bottom Width',
    description: 'Drawer bottom width: (DrawerWidth - (4*PT + 2*Clearance)) + 14mm.',
    example: 'DW=500, PT=18, Clearance=3 => (500 - (72+6)) + 14 = 422 + 14 = 436',
    partType: 'Drawer Bottom', context: ['Drawer'], dimension: 'Width', formula: '(DW - (4*PT + 2*Clearance)) + 14'
  },
  {
    key: 'DRW_BOTTOM_D', name: 'Drawer Bottom Depth',
    description: 'Drawer bottom depth: DrawerSideDepth (DD parameter).',
    example: 'DD=500',
    partType: 'Drawer Bottom', context: ['Drawer'], dimension: 'Height', formula: 'DD' // Height is the second dimension
  },
  {
    key: 'DRW_FRONT_PANEL_W', name: 'Drawer Front Panel Width (Overlay)',
    description: 'Drawer front panel width (similar to single door): Cabinet/Opening Width - 2mm.',
    example: 'W (opening)=500 => 498. Use W, or if specific drawer opening param exists, use that.',
    partType: 'Drawer Front', context: ['General', 'Base', 'Drawer'], dimension: 'Width', formula: 'W - 2'
  },
  // Drawer Front Panel Height is manual entry.

  // --- General Formulas ---
  {
    key: 'GEN_W', name: 'Overall Width (W)',
    description: 'Overall cabinet width.', partType: [], context: null, dimension: 'Width', formula: 'W'
  },
  {
    key: 'GEN_H', name: 'Overall Height (H)',
    description: 'Overall cabinet height.', partType: [], context: null, dimension: 'Height', formula: 'H'
  },
  {
    key: 'GEN_D', name: 'Overall Depth (D)',
    description: 'Overall cabinet depth.', partType: [], context: null, dimension: 'Width', formula: 'D' // For parts like shelves, D is width
  },
  {
    key: 'GEN_D_HT', name: 'Overall Depth (D) for Height',
    description: 'Overall cabinet depth, used as height for some parts.', partType: [], context: null, dimension: 'Height', formula: 'D'
  },
  {
    key: 'THICKNESS_PT', name: 'Panel Thickness (PT)',
    description: 'Global panel thickness from template parameters.',
    partType: [], context: null, dimension: 'Thickness', formula: 'PT'
  },
  {
    key: 'THICKNESS_BPT', name: 'Back Panel Thickness (BPT)',
    description: 'Global back panel thickness from template parameters.',
    partType: [], context: null, dimension: 'Thickness', formula: 'BPT'
  },
  {
    key: 'QTY_1', name: 'Quantity 1',
    description: 'Fixed quantity of 1.', partType: [], context: null, dimension: 'Quantity', formula: '1'
  },
  {
    key: 'QTY_2', name: 'Quantity 2',
    description: 'Fixed quantity of 2.', partType: [], context: null, dimension: 'Quantity', formula: '2'
  },
   {
    key: 'CUSTOM', name: 'Custom Formula...',
    description: 'Enter your own formula.', partType: [], context: null, dimension: 'Width', formula: '' // Placeholder for custom input
  },
];
