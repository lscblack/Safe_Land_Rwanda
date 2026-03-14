import argparse
import asyncio
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

# Allow running this script from either:
# - offchain/                 -> python scripts/import_mappings_from_csv.py
# - offchain/scripts/         -> python import_mappings_from_csv.py
OFFCHAIN_ROOT = Path(__file__).resolve().parents[1]
if str(OFFCHAIN_ROOT) not in sys.path:
    sys.path.insert(0, str(OFFCHAIN_ROOT))
PROJECT_ROOT = OFFCHAIN_ROOT.parent
DEFAULT_CSV_PATH = PROJECT_ROOT / "ml" / "market_trends" / "dataset" / "bugesera_sample_market_trends.csv"

# Always load backend .env (independent of where this script is launched from)
from dotenv import load_dotenv
load_dotenv(OFFCHAIN_ROOT / ".env", override=False)
# Also align process cwd with offchain for any relative-path dependencies
os.chdir(OFFCHAIN_ROOT)

from api.routes.external_routes import get_title_data
from data.database.database import AsyncSessionLocal
from data.models.mapping import Mapping, UpiBackup
from data.models.models import Property


def _clean_upi(value: Any) -> str:
    return str(value or "").strip()


def _load_unique_upis(csv_path: Path, upi_column: str) -> list[str]:
    upis: list[str] = []
    seen: set[str] = set()

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if upi_column not in (reader.fieldnames or []):
            raise ValueError(
                f"Column '{upi_column}' not found in CSV. Available columns: {reader.fieldnames}"
            )

        for row in reader:
            upi = _clean_upi(row.get(upi_column))
            if not upi or upi in seen:
                continue
            seen.add(upi)
            upis.append(upi)

    return upis


def _upi_type_prefix(upi: str) -> str:
    upi_value = _clean_upi(upi)
    if not upi_value:
        return "unknown"
    return upi_value.split("/", 1)[0].strip() or "unknown"


def _filter_upis_by_type(
    upis: list[str],
    skip_prefixes: set[str],
    per_type_limit: int,
) -> tuple[list[str], dict[str, int], int]:
    selected: list[str] = []
    type_counts: dict[str, int] = {}
    skipped_by_prefix = 0

    for upi in upis:
        prefix = _upi_type_prefix(upi)

        if prefix in skip_prefixes:
            skipped_by_prefix += 1
            continue

        current = type_counts.get(prefix, 0)
        if current >= per_type_limit:
            continue

        selected.append(upi)
        type_counts[prefix] = current + 1

    return selected, type_counts, skipped_by_prefix


def _parse_response_json(result: Any) -> dict:
    if hasattr(result, "body") and result.body is not None:
        try:
            if isinstance(result.body, (bytes, bytearray)):
                return json.loads(result.body.decode("utf-8"))
            return json.loads(result.body)
        except Exception:
            return {}

    if isinstance(result, dict):
        return result

    return {}


def _is_not_found_payload(payload: dict) -> bool:
    if not payload:
        return True

    if payload.get("found") is False:
        return True

    if payload.get("error") is True and not payload.get("data"):
        return True

    data = payload.get("data")
    if data in (None, {}, []):
        return True

    # Some providers return not-found text message while keeping HTTP 200
    message = str(payload.get("message") or payload.get("detail") or "").lower()
    if "not found" in message or "no data" in message:
        return True

    return False


async def _save_skip_to_upi_backup(db, upi: str, reason: str, payload: dict | None = None) -> None:
    backup_body = {
        "upi": upi,
        "status": "skipped",
        "reason": reason,
        "source": "bulk_csv_mapping_import",
        "timestamp": datetime.utcnow().isoformat(),
    }
    if payload:
        backup_body["provider_response"] = payload

    stmt = pg_insert(UpiBackup).values(
        upi=upi,
        upi_info=backup_body,
    ).on_conflict_do_update(
        index_elements=["upi"],
        set_={"upi_info": backup_body},
    )
    await db.execute(stmt)


async def _upsert_mapping_from_title_data(db, upi: str, title_payload: dict) -> str:
    data = title_payload.get("data") or {}
    details = data.get("parcelDetails") or {}

    canonical_upi = _clean_upi(details.get("upi") or upi)

    prop_result = await db.execute(select(Property).where(Property.upi == canonical_upi))
    prop = prop_result.scalar_one_or_none()

    mapping_fields = dict(
        upi=canonical_upi,
        official_registry_polygon=details.get("parcelPolygon", {}).get("polygon"),
        document_detected_polygon=None,
        latitude=details.get("parcelCoordinates", {}).get("lat"),
        longitude=details.get("parcelCoordinates", {}).get("lon"),
        parcel_area_sqm=details.get("area"),
        province=details.get("provinceName"),
        district=details.get("districtName"),
        sector=details.get("sectorName"),
        cell=details.get("cellName"),
        village=details.get("villageName"),
        full_address=details.get("address", {}).get("string"),
        land_use_type=details.get("landUseTypeNameEnglish"),
        planned_land_use=(
            details.get("plannedLandUses", [{}])[0].get("landUseName")
            if details.get("plannedLandUses") else None
        ),
        is_developed=details.get("isDeveloped"),
        has_infrastructure=details.get("hasInfrastructure"),
        has_building=details.get("hasBuilding"),
        building_floors=details.get("numberOfBuildingFloors"),
        tenure_type=details.get("rightTypeName"),
        lease_term_years=details.get("leaseTerm"),
        remaining_lease_term=details.get("remainingLeaseTerm"),
        under_mortgage=details.get("underMortgage"),
        has_caveat=details.get("hasCaveat"),
        in_transaction=details.get("inTransaction"),
        registration_date=None,
        approval_date=details.get("approvalDate"),
        year_of_record=datetime.now().year,
        property_id=prop.id if prop else None,
        uploaded_by="bulk_csv_import",
        for_sale=False,
        price=0,
    )

    existing_result = await db.execute(select(Mapping).where(Mapping.upi == canonical_upi))
    existing_mapping = existing_result.scalar_one_or_none()

    if existing_mapping:
        for key, value in mapping_fields.items():
            setattr(existing_mapping, key, value)
        return "updated"

    db.add(Mapping(**mapping_fields))
    return "created"


async def run(
    csv_path: Path,
    upi_column: str,
    limit: int | None = None,
    dry_run: bool = False,
    skip_prefixes: set[str] | None = None,
    per_type_limit: int = 200,
) -> None:
    skip_prefixes = skip_prefixes or {"5"}
    upis = _load_unique_upis(csv_path, upi_column)
    upis, selected_type_counts, skipped_by_prefix = _filter_upis_by_type(
        upis=upis,
        skip_prefixes=skip_prefixes,
        per_type_limit=per_type_limit,
    )
    if limit is not None and limit > 0:
        upis = upis[:limit]

    total = len(upis)
    created = 0
    updated = 0
    skipped = 0
    failed = 0

    print(f"Found {total} selected UPIs in {csv_path}")
    print(f"Skipped by prefix {sorted(skip_prefixes)}: {skipped_by_prefix}")
    if selected_type_counts:
        print("Selected per type:", ", ".join(f"{k}:{v}" for k, v in sorted(selected_type_counts.items())))

    async with AsyncSessionLocal() as db:
        for idx, upi in enumerate(upis, start=1):
            try:
                result = await get_title_data(upi=upi, language="english", db=db)
                payload = _parse_response_json(result)

                if _is_not_found_payload(payload):
                    skipped += 1
                    await _save_skip_to_upi_backup(
                        db,
                        upi=upi,
                        reason="external_title_data_not_found",
                        payload=payload,
                    )
                    print(f"[{idx}/{total}] SKIP   {upi} (not found)")
                    if not dry_run:
                        await db.commit()
                    else:
                        await db.rollback()
                    continue

                action = await _upsert_mapping_from_title_data(db, upi=upi, title_payload=payload)
                if action == "created":
                    created += 1
                else:
                    updated += 1

                print(f"[{idx}/{total}] OK     {upi} ({action}, for_sale=false)")
                if not dry_run:
                    await db.commit()
                else:
                    await db.rollback()

            except Exception as exc:
                failed += 1
                await db.rollback()
                await _save_skip_to_upi_backup(
                    db,
                    upi=upi,
                    reason=f"exception: {type(exc).__name__}",
                    payload={"error": str(exc)},
                )
                await db.commit()
                print(f"[{idx}/{total}] FAIL   {upi} -> {exc}")

    print("\nImport summary")
    print(f"  total   : {total}")
    print(f"  created : {created}")
    print(f"  updated : {updated}")
    print(f"  skipped : {skipped}")
    print(f"  failed  : {failed}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bulk import mappings from CSV UPIs, force all mappings to not-for-sale, and skip/store missing UPIs in upi_backup."
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV_PATH,
        help="Path to CSV file.",
    )
    parser.add_argument(
        "--upi-column",
        default="upi",
        help="CSV column name containing UPI values.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional max number of UPIs to process.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and simulate without persisting mappings.",
    )
    parser.add_argument(
        "--skip-prefixes",
        default="5",
        help="Comma-separated UPI prefixes to skip (default: 5).",
    )
    parser.add_argument(
        "--per-type-limit",
        type=int,
        default=200,
        help="Max UPIs to process per non-skipped prefix type (default: 200).",
    )

    args = parser.parse_args()

    if not args.csv.exists():
        raise FileNotFoundError(f"CSV file not found: {args.csv}")

    skip_prefixes = {
        token.strip()
        for token in str(args.skip_prefixes).split(",")
        if token.strip()
    }

    asyncio.run(
        run(
            csv_path=args.csv,
            upi_column=args.upi_column,
            limit=args.limit,
            dry_run=args.dry_run,
            skip_prefixes=skip_prefixes,
            per_type_limit=args.per_type_limit,
        )
    )


if __name__ == "__main__":
    main()
