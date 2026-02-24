import cv2
import numpy as np

def extract_gis_polygon(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return "Image failed to load."

    overlay = img.copy()
    h, w = img.shape[:2]

    # 1. GIS Setup (Precision Tuned for Rwanda Target)
    # Shifted East (+440m) and South (-380m) to match the target polygon
    real_coords = np.array([
        [841880.0, 9757770.0], # Top Left
        [841880.0, 9757720.0], # Bottom Left
        [841952.0, 9757720.0], # Bottom Right
        [841952.0, 9757770.0]  # Top Right
    ], dtype="float32")

    # Ensure your pixel_corners match the order of real_coords
    pixel_corners = np.array([
        [0, 0],   # Top Left
        [0, h],   # Bottom Left
        [w, h],   # Bottom Right
        [w, 0]    # Top Right
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(pixel_corners, real_coords)

    # 2. Focus on center region (ignore borders)
    # Reduced margin slightly to 8% to prevent cutting off the right tip
    margin = 0.08
    roi_x1, roi_y1 = int(w * margin), int(h * margin)
    roi_x2, roi_y2 = int(w * (1 - margin)), int(h * (1 - margin))

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    roi_gray = gray[roi_y1:roi_y2, roi_x1:roi_x2]

    # Threshold: Lowered to 90 to catch fainter lines on the bottom edge
    _, thresh = cv2.threshold(roi_gray, 90, 255, cv2.THRESH_BINARY_INV)

    # Morphological cleaning: 
    # Use a smaller 3x3 kernel and dilate first so thin lines don't break
    kernel = np.ones((3, 3), np.uint8)
    dilated = cv2.dilate(thresh, kernel, iterations=1)
    cleaned = cv2.morphologyEx(dilated, cv2.MORPH_OPEN, kernel)

    # Find contours
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return "Nothing found in the center."

    # Largest contour
    main_contour = max(contours, key=cv2.contourArea)

    # Simplify polygon
    epsilon = 0.003 * cv2.arcLength(main_contour, True)
    approx_polygon = cv2.approxPolyDP(main_contour, epsilon, True)

    final_gis_points = []
    display_points = []

    for point in approx_polygon:
        px_roi, py_roi = point[0]

        # Convert back to full image coordinates
        px = px_roi + roi_x1
        py = py_roi + roi_y1
        display_points.append([px, py])

        # Convert to GIS coordinates
        pt_arr = np.array([[[px, py]]], dtype="float32")
        transformed = cv2.perspectiveTransform(pt_arr, M)
        gx, gy = transformed[0][0]
        final_gis_points.append((round(gx, 2), round(gy, 2)))

    # ---- DRAW OUTLINE ----
    pts = np.array(display_points, np.int32).reshape((-1, 1, 2))
    cv2.polylines(overlay, [pts], True, (0, 0, 255), 3)

    # Save debug image
    cv2.imwrite('debug_outline.png', overlay)
    # print("Visual check saved as 'debug_outline.png'")

    return final_gis_points


