# --- UNIVERSAL PROPERTY SEARCH ---
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, array
from data.models.models import Property
from sqlalchemy.ext.asyncio import AsyncSession


import json as _json

async def universal_property_search(db: AsyncSession, filters: dict, limit=50, offset=0):
    """
    Search properties matching any filter across all fields (top-level, JSONB, arrays, stringified JSON).
    Decodes stringified JSON fields before matching.
    """
    queries = []
    # Expanded field map: all columns and JSONB fields
    field_map = {
        'property_type': ['category_id', ('details', 'property_type'), ('parcel_information', 'property_type')],
        'min_size': ['size', ('details', 'size'), ('parcel_information', 'size')],
        'max_size': ['size', ('details', 'size'), ('parcel_information', 'size')],
        'budget': ['estimated_amount', ('details', 'budget'), ('parcel_information', 'budget')],
        'location': ['location', 'district', 'sector', 'cell', 'village', ('details', 'location'), ('parcel_information', 'location')],
        'bedrooms': [('details', 'bedrooms'), ('parcel_information', 'bedrooms')],
        'bathrooms': [('details', 'bathrooms'), ('parcel_information', 'bathrooms')],
        'status': ['status', ('details', 'status'), ('parcel_information', 'status')],
        'furnished': [('details', 'furnished'), ('parcel_information', 'furnished')],
        'amenities': [('details', 'amenities'), ('parcel_information', 'amenities')],
        # Add all other columns for full-text fallback
        'owner_id': ['owner_id'],
        'owner_name': ['owner_name'],
        'category_id': ['category_id'],
        'subcategory_id': ['subcategory_id'],
        'parcel_id': ['parcel_id'],
        'land_use': ['land_use'],
        'estimated_amount': ['estimated_amount'],
        'latitude': ['latitude'],
        'longitude': ['longitude'],
        'right_type': ['right_type'],
        'gis_coordinates': ['gis_coordinates'],
        'amount_paid': ['amount_paid'],
        'new_owner_id': ['new_owner_id'],
        'video_link': ['video_link'],
        'uploaded_by_user_id': ['uploaded_by_user_id'],
        'uploader_type': ['uploader_type'],
        'created_at': ['created_at'],
        'updated_at': ['updated_at'],
    }
    for key, value in filters.items():
        if value is None or (isinstance(value, list) and not value):
            continue
        field_targets = field_map.get(key, [])
        for target in field_targets:
            if isinstance(target, str):
                col = getattr(Property, target, None)
                if col is not None:
                    if key == 'min_size':
                        queries.append(col >= value)
                    elif key == 'max_size':
                        queries.append(col <= value)
                    elif key == 'budget':
                        queries.append(col <= value)
                    elif key == 'location':
                        queries.append(col.ilike(f"%{value}%"))
                    elif key == 'status':
                        queries.append(col == value)
                    else:
                        queries.append(col == value)
            elif isinstance(target, tuple) and len(target) == 2:
                jsonb_col = getattr(Property, target[0], None)
                if jsonb_col is not None:
                    # Try to query as JSONB, but also decode stringified JSON if needed
                    # (Postgres can query JSONB, but if stored as string, decode in Python after fetch)
                    if key == 'min_size':
                        queries.append(jsonb_col[target[1]].as_float() >= value)
                    elif key == 'max_size':
                        queries.append(jsonb_col[target[1]].as_float() <= value)
                    elif key == 'budget':
                        queries.append(jsonb_col[target[1]].as_float() <= value)
                    elif key == 'location':
                        queries.append(jsonb_col[target[1]].astext.ilike(f"%{value}%"))
                    elif key == 'status':
                        queries.append(jsonb_col[target[1]].astext == value)
                    elif key == 'furnished':
                        queries.append(jsonb_col[target[1]].astext == str(value).lower())
                    elif key == 'bedrooms' or key == 'bathrooms':
                        queries.append(jsonb_col[target[1]].as_integer() >= value)
                    elif key == 'amenities':
                        queries.append(jsonb_col[target[1]].contains(value))
                    else:
                        queries.append(jsonb_col[target[1]].astext == str(value))
    # Compose query: AND for all filters
    q = sa.select(Property).where(sa.and_(*queries)).limit(limit).offset(offset)
    result = await db.execute(q)
    properties = result.scalars().all()
    # Post-process: decode stringified JSON fields for details/parcel_information and re-filter in Python if needed
    def decode_json_field(val):
        if isinstance(val, dict):
            return val
        if isinstance(val, str):
            try:
                return _json.loads(val)
            except Exception:
                return None
        return None
    filtered = []
    for p in properties:
        match = True
        for key, value in filters.items():
            if value is None or (isinstance(value, list) and not value):
                continue
            # Check JSON fields if present as string
            for json_field in ['details', 'parcel_information']:
                raw = getattr(p, json_field, None)
                decoded = decode_json_field(raw)
                if decoded and key in decoded:
                    v = decoded[key]
                    if isinstance(value, list):
                        if not (isinstance(v, list) and set(value) & set(v)):
                            match = False
                    elif str(v).lower() != str(value).lower():
                        match = False
        if match:
            filtered.append(p)
    # Deduplicate by id
    seen = set()
    unique_props = []
    for p in filtered:
        if p.id not in seen:
            unique_props.append(p)
            seen.add(p.id)
    return unique_props
import requests
import json
import re
from typing import Dict, Any, List

def parse_search_ollama_enhanced(user_text):
    prompt = f"""
    You are a search parser API for a property database.
    User Query: "{user_text}"

    Extract ALL possible search filters from this query into a JSON object.
    
    Common fields to look for:
    - property_type (string): type of property (land, house, apartment, villa, commercial,INZU, UBUTAKA, etc.)
    - min_size (integer): minimum size in sqm
    - max_size (integer): maximum size in sqm
    - budget (integer): total budget in local currency (expand numbers: '50m' = 50000000, '500k' = 500000,1 grands = 1000 usd which is like 1.5 million rwandan francs, etc.)
    - location (string): area, district, sector, or specific location mentioned
    - bedrooms (integer): number of bedrooms
    - bathrooms (integer): number of bathrooms
    - status (string): for sale, for rent, under construction, etc.
    - furnished (boolean): whether property is furnished
    - amenities (array): list of desired amenities (parking, garden, pool, security, etc.)
    
    Also extract any other relevant fields that could be used for database filtering.
    
    Return ONLY the JSON object with these fields (use null for missing values).
    No markdown, no explanations, just the raw JSON.
    """
    
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3",  # or "mistral", "phi", "llama2"
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Lower temperature for consistent parsing
                    "max_tokens": 500
                }
            },
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        response_text = result.get('response', '')
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            parsed_data = json.loads(json_match.group())
            
            # Process any shorthand numbers in budget
            if 'budget' in parsed_data and isinstance(parsed_data['budget'], str):
                parsed_data['budget'] = expand_number_shorthand(parsed_data['budget'])
            
            return parsed_data
        else:
            # Fallback to basic extraction if LLM fails
            return extract_basic_filters(user_text)
            
    except Exception as e:
        print(f"Error calling Ollama: {e}")
        # Fallback to basic extraction
        return extract_basic_filters(user_text)

def expand_number_shorthand(value):
    """Convert shorthand numbers like '50m' to integers"""
    if isinstance(value, (int, float)):
        return int(value)
    
    if not isinstance(value, str):
        return None
    
    value = value.lower().strip()
    
    # Handle million (m, million)
    if re.search(r'(\d+(?:\.?\d*)?)\s*(m|million)', value):
        match = re.search(r'(\d+(?:\.?\d*)?)\s*(m|million)', value)
        num = float(match.group(1))
        return int(num * 1000000)
    
    # Handle thousand (k, thousand)
    elif re.search(r'(\d+(?:\.?\d*)?)\s*(k|thousand)', value):
        match = re.search(r'(\d+(?:\.?\d*)?)\s*(k|thousand)', value)
        num = float(match.group(1))
        return int(num * 1000)
    
    # Handle plain number
    elif re.search(r'^\d+$', value):
        return int(value)
    
    return None

def extract_basic_filters(user_text: str) -> Dict[str, Any]:
    """Fallback basic extraction when LLM fails"""
    result = {
        "property_type": None,
        "min_size": None,
        "max_size": None,
        "budget": None,
        "location": None,
        "raw_query": user_text
    }
    
    # Extract property type
    property_keywords = {
        "land": "land",
        "plot": "land",
        "house": "house",
        "home": "house",
        "apartment": "apartment",
        "flat": "apartment",
        "villa": "villa",
        "commercial": "commercial",
        "office": "commercial",
        "shop": "commercial",
        "ubutaka": "UBUTAKA",
        "inzu": "INZU"
    }
    
    for keyword, prop_type in property_keywords.items():
        if keyword in user_text.lower():
            result["property_type"] = prop_type
            break
    
    # Extract budget with shorthand
    budget_patterns = [
        r'(\d+(?:\.?\d*)?)\s*(m|million|M)\s*',  # 50m
        r'(\d+(?:\.?\d*)?)\s*(k|thousand|K)\s*',  # 500k
        r'budget[:\s]*(\d+(?:\.?\d*)?)',  # budget: 50000000
        r'for\s*(\d+(?:\.?\d*)?)\s*(?:$|\s)'  # for 50000000
    ]
    
    for pattern in budget_patterns:
        match = re.search(pattern, user_text.lower())
        if match:
            if len(match.groups()) >= 2 and match.group(2) in ['m', 'million', 'M']:
                result["budget"] = int(float(match.group(1)) * 1000000)
            elif len(match.groups()) >= 2 and match.group(2) in ['k', 'thousand', 'K']:
                result["budget"] = int(float(match.group(1)) * 1000)
            else:
                result["budget"] = int(float(match.group(1)))
            break
    
    # Extract size range
    size_range_patterns = [
        r'(\d+)\s*-\s*(\d+)\s*(?:sqm|sq m|square meters?)',
        r'(\d+)\s*(?:to|and|-)\s*(\d+)\s*(?:sqm|sq m|square meters?)',
        r'size\s*(?:of)?\s*(\d+)\s*-\s*(\d+)'
    ]
    
    for pattern in size_range_patterns:
        match = re.search(pattern, user_text.lower())
        if match:
            result["min_size"] = int(match.group(1))
            result["max_size"] = int(match.group(2))
            break
    
    # Extract location
    location_keywords = ["in", "near", "at", "around", "location"]
    words = user_text.split()
    for i, word in enumerate(words):
        if word.lower() in location_keywords and i + 1 < len(words):
            # Take the next word(s) as location
            location_parts = []
            for j in range(i + 1, min(i + 4, len(words))):
                if words[j].lower() not in property_keywords:
                    location_parts.append(words[j])
                else:
                    break
            if location_parts:
                result["location"] = " ".join(location_parts)
                break
    
    return result

def build_database_query(parsed_filters: Dict[str, Any]) -> Dict[str, Any]:
    """Convert parsed filters to database query parameters"""
    query = {}
    
    # Map parsed fields to database fields
    field_mapping = {
        "property_type": "type",
        "min_size": "size__gte",
        "max_size": "size__lte",
        "budget": "price__lte",
        "location": "location__icontains",
        "bedrooms": "bedrooms__gte",
        "bathrooms": "bathrooms__gte",
        "furnished": "is_furnished",
        "status": "status"
    }
    
    for key, value in parsed_filters.items():
        if value is None or key not in field_mapping:
            continue

        # Normalize values returned by LLMs: unwrap single-item lists, join lists of strings
        def normalize(val):
            # Preserve lists for amenities
            if key == 'amenities' and isinstance(val, list):
                return val
            if isinstance(val, list):
                if len(val) == 0:
                    return None
                # If list of strings, join into a single string
                if all(isinstance(x, str) for x in val):
                    return " ".join(x for x in val if x)
                # If single-item list, return first element
                return val[0]
            return val

        norm_value = normalize(value)
        if norm_value is None:
            continue
        query[field_mapping[key]] = norm_value
    
    # Handle amenities as array contains
    if "amenities" in parsed_filters and parsed_filters["amenities"]:
        query["amenities__overlap"] = parsed_filters["amenities"]
    
    return query

# Test with various queries
test_queries = [
    "ndashaka ubutaka kuri 50m size of 607 - 1000 sqm near Kigali",
    "Land for sale in Gasabo, any size, budget under 100m"
]

if __name__ == "__main__":
    print("Testing Enhanced Ollama Parser:\n")
    for i, query in enumerate(test_queries, 1):
        print(f"Query {i}: {query}")
        result = parse_search_ollama_enhanced(query)
        print(f"Parsed: {json.dumps(result, indent=2)}")

