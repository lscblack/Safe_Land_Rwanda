# Geo Parcel Extractor

This module extracts real-world geospatial coordinates of a land parcel from a scanned cadastral plan image ("Certificate of Registration of Emphyteutic Lease").

## Features
- Preprocessing: Grayscale, thresholding, denoising
- Grid and axis detection with OCR
- Pixel-to-map coordinate transformation
- Parcel polygon extraction by Parcel ID
- GeoJSON output with area calculation

## Usage

```bash
conda activate geo_image_env
python extract_parcel.py --image path/to/image.jpg --parcel_id 6464
```

## Requirements
- opencv-python
- pytesseract
- numpy
- scikit-learn
- shapely

Install requirements (if needed):

```bash
pip install opencv-python pytesseract numpy scikit-learn shapely
```

## Output
- Prints GeoJSON to stdout
- Saves to `output.geojson` by default

## Notes
- Handles slight image rotation and scanning artifacts
- Assumes grid lines and axis labels are visible and legible
