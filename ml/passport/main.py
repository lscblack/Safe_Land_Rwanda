from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from paddleocr import PaddleOCR
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import numpy as np
import re
from io import BytesIO

app = FastAPI(title="Passport MRZ Parser", version="1.0.0")

# Initialize OCR once at startup
ocr = PaddleOCR(use_angle_cls=True, lang="en")

MRZ_ALLOWED = re.compile(r"[^A-Z0-9<]")
MRZ_BLOCK_PATTERN = re.compile(r"([A-Z0-9<]{44})\n([A-Z0-9<]{44})")
MRZ_LINE1_PATTERN = re.compile(r"^P<(?P<country>[A-Z]{3})(?P<names>[A-Z<]+)$")
PASSPORT_NUMBER_PATTERN = re.compile(r"\b[A-Z]{1,2}[0-9]{6,8}\b")
DATE_TEXT_PATTERN = re.compile(r"\b\d{2}[A-Z]{3}/[A-Z]{3}\s?\d{4}\b")
DATE_MRZ_PATTERN = re.compile(r"\b\d{6}\b")


def _clean_mrz_line(text: str) -> str:
    text = text.upper().replace(" ", "")
    text = MRZ_ALLOWED.sub("", text)
    return text


def _normalize_mrz_line(text: str, length: int = 44) -> str:
    if len(text) > length:
        return text[:length]
    if len(text) < length:
        return text.ljust(length, "<")
    return text


def _extract_mrz_block(candidates: list[str]) -> tuple[str, str] | None:
    cleaned = [_normalize_mrz_line(_clean_mrz_line(t)) for t in candidates if t and t.strip()]
    # Try all ordered pairs
    for i in range(len(cleaned)):
        for j in range(len(cleaned)):
            if i == j:
                continue
            block = f"{cleaned[i]}\n{cleaned[j]}"
            match = MRZ_BLOCK_PATTERN.search(block)
            if match:
                line1, line2 = match.group(1), match.group(2)
                if MRZ_LINE1_PATTERN.match(line1):
                    return line1, line2
    return None


def _line_bottom_y(box: list) -> float:
    ys = [pt[1] for pt in box]
    return max(ys) if ys else 0.0


def _preprocess_variants(crop: np.ndarray) -> list[np.ndarray]:
    img = Image.fromarray(crop)
    variants: list[Image.Image] = []

    # Base
    variants.append(img.copy())

    # Contrast + sharpen
    v1 = ImageEnhance.Contrast(img.convert("L")).enhance(2.0)
    v1 = v1.filter(ImageFilter.SHARPEN)
    variants.append(v1.convert("RGB"))

    # Strong contrast + autocontrast
    v2 = ImageEnhance.Contrast(img.convert("L")).enhance(2.4)
    v2 = ImageOps.autocontrast(v2)
    variants.append(v2.convert("RGB"))

    # Slight denoise + sharpen
    v3 = img.convert("L").filter(ImageFilter.MedianFilter(size=3))
    v3 = ImageEnhance.Contrast(v3).enhance(1.8)
    v3 = v3.filter(ImageFilter.SHARPEN)
    variants.append(v3.convert("RGB"))

    # Upscale all variants 3x for small text
    output: list[np.ndarray] = []
    for v in variants:
        v = v.resize((v.width * 3, v.height * 3), Image.BICUBIC)
        output.append(np.array(v))

    return output


def _collect_ocr_lines(ocr_result) -> list[tuple[str, float, list]]:
    lines: list[tuple[str, float, list]] = []
    for page in ocr_result or []:
        for item in page:
            box = item[0]
            text = item[1][0]
            score = item[1][1]
            lines.append((text, score, box))
    return lines


def _pick_mrz_lines_from_text(text_lines: list[tuple[str, float, list]]) -> tuple[str, str, str, str]:
    cleaned = [(_clean_mrz_line(t), t, box) for t, score, box in text_lines if t and t.strip()]
    candidates = [(c, raw, box) for c, raw, box in cleaned if len(c) >= 30]

    if len(candidates) < 2:
        raise HTTPException(status_code=422, detail="MRZ lines not detected")

    # Pick two lowest lines by bottom Y
    candidates_sorted = sorted(candidates, key=lambda x: _line_bottom_y(x[2]), reverse=True)
    top_two = candidates_sorted[:2]

    lower, upper = top_two[0], top_two[1]
    if _line_bottom_y(upper[2]) > _line_bottom_y(lower[2]):
        lower, upper = upper, lower

    line1_clean = _normalize_mrz_line(upper[0])
    line2_clean = _normalize_mrz_line(lower[0])
    return line1_clean, line2_clean, upper[1], lower[1]


def _parse_mrz(line1: str, line2: str) -> dict:
    passport_number = line2[0:9].replace("<", "").strip() if len(line2) >= 9 else ""
    birth_date = line2[13:19].strip() if len(line2) >= 19 else ""
    expiry_date = line2[21:27].strip() if len(line2) >= 27 else ""

    return {
        "passport_number": passport_number,
        "birth_date": birth_date,
        "expiry_date": expiry_date,
    }


def _extract_from_texts(texts: list[str]) -> dict:
    joined = "\n".join(texts).upper()

    passport_numbers = PASSPORT_NUMBER_PATTERN.findall(joined)
    passport_number = passport_numbers[0] if passport_numbers else ""

    date_texts = DATE_TEXT_PATTERN.findall(joined)
    date_mrz = DATE_MRZ_PATTERN.findall(joined)

    dates = []
    for d in date_texts + date_mrz:
        if d not in dates:
            dates.append(d)

    return {
        "passport_number": passport_number,
        "dates": dates,
    }


@app.post("/parse")
async def parse_passport(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        image = Image.open(BytesIO(image_bytes))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image") from exc

    image = image.convert("RGB")
    np_image = np.array(image)

    # OCR only on bottom crop (focus MRZ region) using multiple crops + augmentations
    h = np_image.shape[0]
    crop_starts = [0.45, 0.5, 0.55, 0.6, 0.65]
    bottom_lines = []
    ocr_bottom_raw: list[str] = []
    best_crop_ratio = None
    best_mrz_like_count = -1

    for start in crop_starts:
        crop_y = int(h * start)
        bottom_crop = np_image[crop_y:h, :]
        variant_arrays = _preprocess_variants(bottom_crop)

        local_lines: list[tuple[str, float, list]] = []
        local_raw: list[str] = []
        mrz_like_count = 0

        for v in variant_arrays:
            for angle in (-2, -1, 0, 1, 2):
                v_img = Image.fromarray(v)
                if angle != 0:
                    v_img = v_img.rotate(angle, expand=True, fillcolor=(255, 255, 255))
                ocr_bottom = ocr.ocr(np.array(v_img), cls=True)
                lines = _collect_ocr_lines(ocr_bottom)
                local_lines.extend(lines)
                raw = [t for t, _, _ in lines]
                local_raw.extend(raw)
                mrz_like_count = max(mrz_like_count, sum(1 for t in raw if "<" in t))

        if mrz_like_count > best_mrz_like_count:
            best_mrz_like_count = mrz_like_count
            best_crop_ratio = start
            bottom_lines = local_lines
            ocr_bottom_raw = local_raw

    mrz_block = _extract_mrz_block(ocr_bottom_raw)
    if mrz_block:
        line1, line2 = mrz_block
        parsed_mrz = _parse_mrz(line1, line2)
        dates = [d for d in [parsed_mrz.get("birth_date"), parsed_mrz.get("expiry_date")] if d]
        result = {
            "passport_number": parsed_mrz.get("passport_number", ""),
            "dates": dates,
        }
    else:
        result = _extract_from_texts(ocr_bottom_raw)

    return JSONResponse(result)


@app.get("/health")
async def health():
    return {"status": "ok"}
