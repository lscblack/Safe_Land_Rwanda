import cv2
import pytesseract
import re
import numpy as np
import requests
import json
from pdf2image import convert_from_path
from shapely.geometry import Polygon
from pyproj import Transformer
import geopandas as gpd

class BoundaryVerificationSystem:
    def __init__(self, api_key=None):
        self.api_endpoint = "http://197.243.23.195/api/api/external/title_data"
        self.transformer = Transformer.from_crs("epsg:32736", "epsg:4326", always_xy=True)

    def extract_upi(self, pdf_path):
        """Step 1: Convert PDF to image and find UPI via OCR."""
        images = convert_from_path(pdf_path, dpi=300)
        img = np.array(images[0])
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        text = pytesseract.image_to_string(gray, lang='eng+kin')
        match = re.search(r'UPI:?\s*(\d+/\d+/\d+/\d+/\d+)', text)
        return match.group(1) if match else None, images[0]

    def get_official_data(self, upi):
        """Step 2: Fetch official data including polygons and legal status."""
        params = {"upi": upi, "language": "english"}
        try:
            response = requests.get(self.api_endpoint, params=params, timeout=10)
            data = response.json()
            if data.get('success'):
                details = data['data']['parcelDetails']
                return {
                    "polygon": details['parcelPolygon']['polygon'],
                    "inTransaction": details.get('inTransaction'),
                    "underMortgage": details.get('underMortgage'),
                    "hasCaveat": details.get('hasCaveat'),
                    "isProvisional": details.get('isProvisional'),
                    "area": details.get('area'),
                    "landUse": details.get('landUse')
                }
        except Exception as e:
            print(f"API Connection Error: {e}")
        return None

    def get_detected_polygon(self, image):
        """Step 3: CV-based vectorization from the document image."""
        img = np.array(image)
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        h, w = gray.shape
        roi = gray[int(h*0.5):, int(w*0.5):]
        blurred = cv2.GaussianBlur(roi, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours: return None
        parcel_contour = max(contours, key=cv2.contourArea)
        anchor_utm = [510071, 4778635]
        gps_coords = []
        for pt in parcel_contour:
            px_x, px_y = pt[0]
            utm_x = anchor_utm[0] + (px_x * 0.5)
            utm_y = anchor_utm[1] - (px_y * 0.5)
            lon, lat = self.transformer.transform(utm_x, utm_y)
            gps_coords.append((lon, lat))
        return str(Polygon(gps_coords))


