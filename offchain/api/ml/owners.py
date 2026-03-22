import re
import numpy as np
import cv2
import pytesseract
from pdf2image import convert_from_path
from PIL import Image

# PDF_PATH = "yuni.pdf"  # change if needed

# images = convert_from_path(PDF_PATH, dpi=300)
# image = np.array(images[0])

# Preview
Image.fromarray(image)
gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

ocr_text = pytesseract.image_to_string(gray, lang='eng+kin')

# DEBUG: Print the raw OCR text to see what we're working with
print("="*50)
print("RAW OCR TEXT (first 1000 chars):")
print("="*50)
print(ocr_text[:1000])
print("="*50)

def extract_upi(text):
    """Extract UPI number"""
    match = re.search(r'UPI:?\s*([\d/]+)', text)
    if match:
        return match.group(1).strip()
    return None

def extract_owners_simple(text):
    """Simple direct extraction of owner lines"""
    owners = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        # Look for lines that start with a number and dot
        if re.match(r'^\d+\.', line):
            # Clean up the line
            line = re.sub(r'\s+', ' ', line)
            owners.append(line)
    
    return owners

def extract_owners_structured(text):
    """Extract structured owner information"""
    owners = []
    lines = text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Look for owner lines (starting with number and dot)
        if re.match(r'^\d+\.', line):
            owner_info = {
                'raw_line': line,
                'number': re.match(r'^(\d+)\.', line).group(1)
            }
            
            # Try to parse the line
            parts = re.split(r'\s+', line)
            
            # Find the name (all caps words until we hit a number)
            name_parts = []
            id_number = None
            percentage = None
            address_parts = []
            
            j = 1  # Skip the number part
            # Collect name (should be uppercase words)
            while j < len(parts) and not re.match(r'^\d+$', parts[j]):
                if parts[j].isalpha() and parts[j].isupper():
                    name_parts.append(parts[j])
                elif re.match(r'^\d{10,}$', parts[j]):  # ID number
                    id_number = parts[j]
                elif re.match(r'^\d+\.?\d*$', parts[j]):  # Percentage
                    percentage = parts[j]
                else:
                    address_parts.append(parts[j])
                j += 1
            
            # If we found an ID number, collect remaining as address
            if id_number:
                owner_info['id_number'] = id_number
                if percentage:
                    owner_info['percentage'] = percentage
            
            if name_parts:
                owner_info['name'] = ' '.join(name_parts)
            
            # Check next lines for continuation
            next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
            if next_line and not re.match(r'^\d+\.', next_line):
                # This line might contain address or additional info
                owner_info['additional_info'] = next_line
                i += 1  # Skip the next line
            
            owners.append(owner_info)
        i += 1
    
    return owners

# Extract information
upi = extract_upi(ocr_text)
print(f"\nUPI: {upi}")

# Try simple extraction first
simple_owners = extract_owners_simple(ocr_text)
print("\nSimple Owner Lines:")
for owner in simple_owners:
    print(owner)

# Try structured extraction
structured_owners = extract_owners_structured(ocr_text)
print("\nStructured Owners:")
for owner in structured_owners:
    print(owner)

# If simple extraction worked, let's parse them more carefully
if simple_owners:
    print("\n" + "="*50)
    print("PARSED OWNER INFORMATION:")
    print("="*50)
    
    for owner_line in simple_owners:
        # Split the line into parts
        parts = owner_line.split()
        
        # The first part is the number (e.g., "1.")
        number = parts[0].replace('.', '')
        
        # Find the ID number (long sequence of digits)
        id_number = None
        id_index = -1
        for i, part in enumerate(parts):
            if re.match(r'^\d{10,}$', part):
                id_number = part
                id_index = i
                break
        
        if id_number:
            # Name is everything between number and ID
            name = ' '.join(parts[1:id_index])
            
            # Look for percentage after ID
            percentage = None
            if id_index + 1 < len(parts) and re.match(r'^\d+\.?\d*$', parts[id_index + 1]):
                percentage = parts[id_index + 1]
            
            # Everything after percentage (if exists) or after ID is additional info
            start_idx = id_index + 2 if percentage else id_index + 1
            additional = ' '.join(parts[start_idx:]) if start_idx < len(parts) else ""
            
            print(f"\nOwner {number}:")
            print(f"  Name: {name}")
            print(f"  ID Number: {id_number}")
            if percentage:
                print(f"  Percentage: {percentage}%")
            if additional:
                print(f"  Additional Info: {additional}")
        else:
            # If no ID number found, treat the rest as name and address
            name_parts = []
            address_parts = []
            
            for part in parts[1:]:
                if part.isalpha() and part.isupper():
                    name_parts.append(part)
                else:
                    address_parts.append(part)
            
            print(f"\nOwner {number}:")
            if name_parts:
                print(f"  Name: {' '.join(name_parts)}")
            if address_parts:
                print(f"  Address: {' '.join(address_parts)}")

# If still no owners, try a more aggressive approach
if not simple_owners:
    print("\nAttempting aggressive owner extraction...")
    
    # Look for lines that might contain owner information
    lines = ocr_text.split('\n')
    for i, line in enumerate(lines):
        line = line.strip()
        # Look for any line with digits and uppercase words
        if re.search(r'[A-Z]{3,}', line) and re.search(r'\d', line):
            # Check if it might be an owner line
            if not re.match(r'^\s*\d+\.', line):
                # Try to find the number from context
                if i > 0 and re.match(r'^\s*\d+\.', lines[i-1].strip()):
                    print(f"Found potential owner continuation: {line}")
                else:
                    print(f"Potential owner line: {line}")