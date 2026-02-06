// Field Types
export type FieldType = 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'multiselect' | 'section_header';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  conditional?: { field: string; value: any }; // Only show if another field has this value
  width?: 'full' | 'half' | 'third';
}

export interface SubCategory {
  id: string;
  label: string;
  fields: FormField[];
}

export interface Category {
  id: string;
  label: string;
  icon: string; // Icon name from Lucide
  subCategories: SubCategory[];
}

// --- SHARED OPTION LISTS (For consistency) ---
const YES_NO = ['Yes', 'No'];
const CROP_SIZES = ['Young', 'Medium', 'Mature'];
const COVERAGE_RATIO = ['Less than 25%', 'Between 25% – 50%', 'Between 50% – 75%', 'Above 75%'];
const FENCE_MATERIALS = ['No Information', 'Concrete/Cement', 'Wired', 'Wood/Grass', 'Brick/Block', 'Steel', 'Natural Stone'];
const BUILDING_CONDITIONS = ['Poor', 'Fair', 'Good', 'Excellent'];
const ROOF_TYPES = ['Double-Pitch', 'Mono-Pitch', 'Versatile', 'Flat roof'];
const WALL_MATERIALS = ['Clay burnt Bricks', 'Adobe blocks', 'Cement blocks', 'Reinforced concrete', 'Non-reinforced concrete', 'Wood and mud'];
const PRODUCT_TYPES = ['Potatoes/Cassava', 'Vegetables', 'Maize/Sorghum/Wheat/Corn', 'Rice', 'Banana', 'Coffee', 'Tea', 'Fruits', 'Other'];

// --- REUSABLE FIELD GROUPS ---
const BUILDING_BASE_FIELDS: FormField[] = [
  { name: 'condition', label: 'Building Condition', type: 'select', options: BUILDING_CONDITIONS, width: 'half' },
  { name: 'built_area', label: 'Built-up Area (sqm)', type: 'number', width: 'half' },
  { name: 'building_type', label: 'Building Type', type: 'select', options: ['Detached', 'Semi-Detached', 'Terrace/Row House'], width: 'half' },
  { name: 'floors', label: 'Number of Floors', type: 'number', width: 'half' },
  { name: 'roof_type', label: 'Roof Type', type: 'select', options: ROOF_TYPES, width: 'half' },
  { name: 'roof_material', label: 'Roof Covering Material', type: 'select', options: ['Corrugated Iron Sheets', 'Versatile Sheets', 'Tile', 'Traditional tiles', 'Reinforced Concrete', 'Grass'], width: 'half' },
  { name: 'wall_material', label: 'Wall Material', type: 'select', options: WALL_MATERIALS, width: 'half' },
  { name: 'floor_material', label: 'Floor Material', type: 'select', options: ['Mud floor', 'Sand Cement creed', 'Floor tiles', 'Wood', 'Texture'], width: 'half' },
  { name: 'under_construction', label: 'Is this building under construction?', type: 'radio', options: YES_NO, width: 'full' },
  { name: 'construction_year', label: 'Year of Construction', type: 'number', width: 'full', conditional: { field: 'under_construction', value: 'No' } },
];

const LAND_INFRA_FIELDS: FormField[] = [
  { name: 'has_electricity', label: 'Electricity Connected?', type: 'radio', options: YES_NO, width: 'half' },
  { name: 'has_water', label: 'Water Connected?', type: 'radio', options: YES_NO, width: 'half' },
  { name: 'has_parking', label: 'Is there car parking?', type: 'radio', options: YES_NO, width: 'full' },
  { name: 'parking_material', label: 'Parking Material', type: 'select', options: ['Cabro Blocks', 'Concrete Pavement', 'Clay Bricks/Blocks', 'Natural Stone', 'Gravel'], width: 'half', conditional: { field: 'has_parking', value: 'Yes' } },
  { name: 'parking_capacity', label: 'Number of Cars', type: 'number', width: 'half', conditional: { field: 'has_parking', value: 'Yes' } },
  { name: 'sewage_type', label: 'Sewage System', type: 'select', options: ['Central Sewage', 'Septic Tank', 'Pit latrines', 'Missing'], width: 'full' },
  { name: 'has_fence', label: 'Is there a fence?', type: 'radio', options: YES_NO, width: 'full' },
  { name: 'fence_material', label: 'Fence Material', type: 'select', options: FENCE_MATERIALS, width: 'full', conditional: { field: 'has_fence', value: 'Yes' } },
];

export const FORM_CONFIG: Category[] = [
  {
    id: 'forest',
    label: 'Forest',
    icon: 'TreePine',
    subCategories: [
      {
        id: 'forest_plot',
        label: 'Forest Plot',
        fields: [
          { name: 'products', label: 'Product Type (Main 3)', type: 'multiselect', options: PRODUCT_TYPES, width: 'full' },
          { name: 'crop_size', label: 'Crop Size', type: 'select', options: CROP_SIZES, width: 'half' },
          { name: 'coverage', label: 'Crop Coverage Ratio', type: 'select', options: COVERAGE_RATIO, width: 'half' },
          { name: 'has_fence', label: 'Is there a fence?', type: 'radio', options: YES_NO, width: 'full' },
          { name: 'fence_material', label: 'Fence Material', type: 'select', options: FENCE_MATERIALS, width: 'full', conditional: { field: 'has_fence', value: 'Yes' } },
        ]
      }
    ]
  },
  {
    id: 'agriculture',
    label: 'Agriculture',
    icon: 'Tractor',
    subCategories: [
      {
        id: 'seasonal_crops',
        label: 'Seasonal/Perennial Crops Plot',
        fields: [
          { name: 'seasonal', label: 'Seasonal Crops', type: 'radio', options: YES_NO, width: 'half' },
          { name: 'perennial', label: 'Perennial Crops', type: 'radio', options: YES_NO, width: 'half' },
          { name: 'products', label: 'Product Type', type: 'multiselect', options: PRODUCT_TYPES, width: 'full' },
          { name: 'crop_size', label: 'Crop Size', type: 'select', options: CROP_SIZES, width: 'half' },
          { name: 'coverage', label: 'Crop Coverage Ratio', type: 'select', options: COVERAGE_RATIO, width: 'half' },
          { name: 'irrigation', label: 'Has Irrigation?', type: 'radio', options: YES_NO, width: 'full' },
          { name: 'has_fence', label: 'Is there a fence?', type: 'radio', options: YES_NO, width: 'full' },
          { name: 'fence_material', label: 'Fence Material', type: 'select', options: FENCE_MATERIALS, width: 'full', conditional: { field: 'has_fence', value: 'Yes' } },
        ]
      },
      {
        id: 'family_house',
        label: 'Farmers Family House',
        fields: [
          ...BUILDING_BASE_FIELDS,
          { name: 'hdr_accom', label: 'Accommodation Details', type: 'section_header', width: 'full' },
          { name: 'units', label: 'Number of Units', type: 'number', width: 'full' },
          { name: 'bedrooms', label: 'Bedrooms (per unit)', type: 'number', width: 'half' },
          { name: 'bathrooms', label: 'Bathrooms (per unit)', type: 'number', width: 'half' },
          { name: 'sitting_rooms', label: 'Sitting Rooms', type: 'number', width: 'half' },
          { name: 'kitchens', label: 'Kitchens', type: 'number', width: 'half' },
        ]
      },
      {
        id: 'farm_building',
        label: 'Other Farm Building (Livestock)',
        fields: [...BUILDING_BASE_FIELDS] // Reusing the base building fields without unit details
      }
    ]
  },
  {
    id: 'residential',
    label: 'Residential',
    icon: 'Home',
    subCategories: [
      {
        id: 'res_plot',
        label: 'Land for Family House',
        fields: [...LAND_INFRA_FIELDS]
      },
      {
        id: 'condo_plot',
        label: 'Land for Condominium',
        fields: [
          ...LAND_INFRA_FIELDS,
          { name: 'amenities', label: 'Existing Amenities', type: 'multiselect', width: 'full', options: ['Swimming pool', 'Gym & fitness', 'Car parking', 'Garden', 'Sports pitch', 'Kids play area', 'Laundry services', 'EV Charging'] }
        ]
      },
      {
        id: 'res_building',
        label: 'Family House (Building)',
        fields: [
            ...BUILDING_BASE_FIELDS,
            { name: 'bedrooms', label: 'Bedrooms', type: 'number', width: 'half' },
            { name: 'bathrooms', label: 'Bathrooms', type: 'number', width: 'half' },
        ]
      },
      {
        id: 'condo_unit',
        label: 'Condominium Unit',
        fields: [
            { name: 'condition', label: 'Condition', type: 'select', options: BUILDING_CONDITIONS, width: 'half' },
            { name: 'floor_level', label: 'Unit Floor Level', type: 'number', width: 'half' },
            { name: 'bedrooms', label: 'Bedrooms', type: 'number', width: 'half' },
            { name: 'bathrooms', label: 'Bathrooms', type: 'number', width: 'half' },
            { name: 'under_construction', label: 'Under Construction?', type: 'radio', options: YES_NO, width: 'full' },
        ]
      }
    ]
  },
  {
    id: 'commercial',
    label: 'Commercial',
    icon: 'Building2',
    subCategories: [
      { id: 'com_plot', label: 'Commercial Plot', fields: [...LAND_INFRA_FIELDS] },
      { 
        id: 'office_block', 
        label: 'Office Block', 
        fields: [
          ...BUILDING_BASE_FIELDS,
          { name: 'is_rented', label: 'Is this for rent?', type: 'radio', options: YES_NO, width: 'full' },
          { name: 'rent_price', label: 'Rent Price (per sqm)', type: 'number', width: 'half', conditional: { field: 'is_rented', value: 'Yes' } },
        ]
      },
      {
        id: 'petrol_station',
        label: 'Petrol Station',
        fields: [
           { name: 'condition', label: 'Building Condition', type: 'select', options: BUILDING_CONDITIONS, width: 'full' },
           { name: 'pumps', label: 'Number of Pumps', type: 'number', width: 'half' },
           { name: 'tanks', label: 'Underground Tanks', type: 'number', width: 'half' },
           { name: 'is_rented', label: 'Is it rented?', type: 'radio', options: YES_NO, width: 'full' },
           { name: 'rent_price', label: 'Monthly Rent', type: 'number', width: 'full', conditional: { field: 'is_rented', value: 'Yes' } },
        ]
      }
    ]
  },
  {
      id: 'industrial',
      label: 'Industrial',
      icon: 'Factory',
      subCategories: [
          {
              id: 'ind_plot',
              label: 'Industrial Plot',
              fields: [
                  { name: 'machinery_included', label: 'Price includes machinery?', type: 'radio', options: YES_NO, width: 'full' },
                  ...LAND_INFRA_FIELDS,
                  { name: 'infrastructure', label: 'Existing Infrastructure', type: 'multiselect', width: 'full', options: ['Loading Docks', 'Internal Road (Murram)', 'Internal Road (Tarmac)', 'Generators', 'Water Treatment', 'Gas Storage', 'Weighbridge'] }
              ]
          },
          {
              id: 'ind_building',
              label: 'Industrial Building',
              fields: [...BUILDING_BASE_FIELDS]
          }
      ]
  }
];