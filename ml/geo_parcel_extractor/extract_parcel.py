import cv2
import numpy as np
import pytesseract
import argparse
import json
from sklearn.linear_model import LinearRegression
from shapely.geometry import Polygon, mapping
from shapely.ops import transform as shapely_transform
import math

# --- Utility Functions ---
def preprocess_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not load image: {image_path}. Please check the file path and format.")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return img, thresh

def detect_grid_lines(thresh_img):
    # Detect horizontal and vertical lines using morphology
    horizontal = thresh_img.copy()
    vertical = thresh_img.copy()
    cols = horizontal.shape[1]
    horizontal_size = max(10, cols // 30)
    horizontal_structure = cv2.getStructuringElement(cv2.MORPH_RECT, (horizontal_size, 1))
    horizontal = cv2.erode(horizontal, horizontal_structure)
    horizontal = cv2.dilate(horizontal, horizontal_structure)

    rows = vertical.shape[0]
    vertical_size = max(10, rows // 30)
    vertical_structure = cv2.getStructuringElement(cv2.MORPH_RECT, (1, vertical_size))
    vertical = cv2.erode(vertical, vertical_structure)
    vertical = cv2.dilate(vertical, vertical_structure)

    # Find lines using Hough transform
    lines_h = cv2.HoughLinesP(horizontal, 1, np.pi/180, threshold=100, minLineLength=50, maxLineGap=10)
    lines_v = cv2.HoughLinesP(vertical, 1, np.pi/180, threshold=100, minLineLength=50, maxLineGap=10)
    return lines_h, lines_v

def extract_axis_labels(img, lines, axis='x'):
    # Use pytesseract to extract numbers near grid lines
    labels = []
    positions = []
    for line in lines:
        for x1, y1, x2, y2 in line:
            if axis == 'x':
                # Crop above/below the line for x-axis
                y = y1
                crop = img[max(0, y-30):y+30, x1-15:x2+15]
            else:
                # Crop left/right of the line for y-axis
                x = x1
                crop = img[y1-15:y2+15, max(0, x-30):x+30]
            text = pytesseract.image_to_string(crop, config='--psm 7 -c tessedit_char_whitelist=0123456789')
            try:
                value = int(text.strip())
                if axis == 'x':
                    positions.append((x1 + x2) // 2)
                else:
                    positions.append((y1 + y2) // 2)
                labels.append(value)
            except:
                continue
    return positions, labels

def fit_coordinate_transform(pixels, coords):
    # Linear regression: pixel -> map coordinate
    X = np.array(pixels).reshape(-1, 1)
    y = np.array(coords)
    model = LinearRegression().fit(X, y)
    return model

def find_parcel_text(img, parcel_id):
    # Use pytesseract to find the parcel id location
    d = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config='--psm 6')
    for i, text in enumerate(d['text']):
        if str(parcel_id) == text.strip():
            x, y, w, h = d['left'][i], d['top'][i], d['width'][i], d['height'][i]
            return (x + w//2, y + h//2), (x, y, w, h)
    return None, None

def extract_boldest_contour(thresh_img, center):
    # Find all contours
    contours, _ = cv2.findContours(thresh_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    max_thickness = 0
    target_contour = None
    for cnt in contours:
        if cv2.pointPolygonTest(cnt, center, False) >= 0:
            # Estimate thickness by contour area vs perimeter
            area = cv2.contourArea(cnt)
            peri = cv2.arcLength(cnt, True)
            thickness = area / (peri + 1e-5)
            if thickness > max_thickness:
                max_thickness = thickness
                target_contour = cnt
    return target_contour

def contour_to_polygon(contour):
    epsilon = 0.01 * cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, epsilon, True)
    return [pt[0].tolist() for pt in approx]

def transform_polygon(polygon, x_model, y_model):
    coords = []
    for x, y in polygon:
        map_x = float(x_model.predict(np.array([[x]])))
        map_y = float(y_model.predict(np.array([[y]])))
        coords.append([map_x, map_y])
    # Ensure closed polygon
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    return coords

def calculate_area(coords):
    poly = Polygon(coords)
    return abs(poly.area)

def main():
    parser = argparse.ArgumentParser(description='Extract geospatial coordinates of a parcel from cadastral plan image.')
    parser.add_argument('--image', required=True, help='Path to input image')
    parser.add_argument('--parcel_id', required=True, help='Parcel ID to extract')
    parser.add_argument('--output', default='output.geojson', help='Output GeoJSON file')
    args = parser.parse_args()

    img, thresh = preprocess_image(args.image)
    lines_h, lines_v = detect_grid_lines(thresh)

    # Extract axis labels and positions
    x_pixels, x_labels = extract_axis_labels(img, lines_h, axis='x')
    y_pixels, y_labels = extract_axis_labels(img, lines_v, axis='y')

    # Fit pixel->map coordinate models
    x_model = fit_coordinate_transform(x_pixels, x_labels)
    y_model = fit_coordinate_transform(y_pixels, y_labels)

    # Find parcel center
    center, bbox = find_parcel_text(img, args.parcel_id)
    if not center:
        print(f"Parcel ID {args.parcel_id} not found.")
        return

    # Extract boldest contour containing the parcel text
    target_contour = extract_boldest_contour(thresh, center)
    if target_contour is None:
        print("Could not find parcel contour.")
        return
    polygon = contour_to_polygon(target_contour)

    # Transform to map coordinates
    coords = transform_polygon(polygon, x_model, y_model)
    area = calculate_area(coords)

    geojson = {
        "parcel_id": str(args.parcel_id),
        "crs": "EPSG:20202",  # Or local
        "geometry": {
            "type": "Polygon",
            "coordinates": [coords]
        },
        "calculated_area_sqm": area
    }
    with open(args.output, 'w') as f:
        json.dump(geojson, f, indent=2)
    print(json.dumps(geojson, indent=2))

if __name__ == "__main__":
    main()
