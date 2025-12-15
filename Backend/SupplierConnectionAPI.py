from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import text

from database import engine


app = FastAPI(title="Supplier Query API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class APIResponse(BaseModel):
    success: bool
    count: Optional[int] = None
    data: Optional[List[dict]] = None
    error: Optional[str] = None



def _parse_uuid(value: Optional[str], field_name: str) -> Optional[uuid.UUID]:
    if value is None or value == "":
        return None
    try:
        return uuid.UUID(str(value))
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid UUID for '{field_name}': {value}")


def _rows_to_dicts(result) -> List[Dict[str, Any]]:
    """
    Convert SQLAlchemy Result into list[dict] in a version-tolerant way.
    Uses .mappings() so columns names become dict keys.
    """
    return [dict(row) for row in result.mappings().all()]


def _build_where(clauses: List[str]) -> str:
    return (" WHERE " + " AND ".join(clauses)) if clauses else ""


@app.get("/api/suppliers", response_model=APIResponse)
async def list_suppliers(
    supplier_id: Optional[str] = Query(None, description="Filter by supplier_id (UUID)"),
    supplier_name: Optional[str] = Query(None, description="Case-insensitive partial match"),
    supplier_type: Optional[str] = Query(None, description="e.g., Manufacturer / Distributor / Contract Manufacturer"),
    hq_country: Optional[str] = Query(None, description="Filter by HQ country"),
    status: Optional[str] = Query(None, description="e.g., Active / Inactive / Blocked"),
    preferred_supplier_flag: Optional[int] = Query(None, description="0 or 1"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    try:
        sid = _parse_uuid(supplier_id, "supplier_id")

        clauses = []
        params: Dict[str, Any] = {"limit": limit, "offset": offset}

        if sid:
            clauses.append("supplier_id = :supplier_id")
            params["supplier_id"] = sid

        if supplier_name:
            clauses.append("supplier_name ILIKE :supplier_name")
            params["supplier_name"] = f"%{supplier_name}%"

        if supplier_type:
            clauses.append("supplier_type = :supplier_type")
            params["supplier_type"] = supplier_type

        if hq_country:
            clauses.append("hq_country = :hq_country")
            params["hq_country"] = hq_country

        if status:
            clauses.append("status = :status")
            params["status"] = status

        if preferred_supplier_flag is not None:
            clauses.append("preferred_supplier_flag = :preferred_supplier_flag")
            params["preferred_supplier_flag"] = preferred_supplier_flag

        where_sql = _build_where(clauses)

        count_sql = text(f"SELECT COUNT(*) AS c FROM supplier_master{where_sql}")
        data_sql = text(f"""
            SELECT
              supplier_id, supplier_name, supplier_type, hq_country, hq_region,
              primary_contact_name, primary_contact_email, primary_contact_phone,
              payment_terms_default, currency_default, certifications, risk_rating,
              status, preferred_supplier_flag
            FROM supplier_master
            {where_sql}
            ORDER BY supplier_name
            LIMIT :limit OFFSET :offset
        """)

        with Session(engine) as session:
            total = session.execute(count_sql, params).scalar_one()
            rows = session.execute(data_sql, params)
            data = _rows_to_dicts(rows)

        return {"success": True, "count": int(total), "data": data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/suppliers/{supplier_id}", response_model=APIResponse)
async def get_supplier(supplier_id: str):
    try:
        sid = _parse_uuid(supplier_id, "supplier_id")
        q = text("""
            SELECT
              supplier_id, supplier_name, supplier_type, hq_country, hq_region,
              primary_contact_name, primary_contact_email, primary_contact_phone,
              payment_terms_default, currency_default, certifications, risk_rating,
              status, preferred_supplier_flag
            FROM supplier_master
            WHERE supplier_id = :supplier_id
        """)

        with Session(engine) as session:
            row = session.execute(q, {"supplier_id": sid}).mappings().fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Supplier not found")

        return {"success": True, "count": 1, "data": [dict(row)]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# Supplier Contracts endpoints
@app.get("/api/supplier-contracts", response_model=APIResponse)
async def list_supplier_contracts(
    child_identifier: Optional[str] = Query(None, description="Filter by component child_identifier (UUID)"),
    component_name: Optional[str] = Query(None, description="Case-insensitive partial match"),
    component_category: Optional[str] = Query(None, description="Filter by category"),
    supplier_id: Optional[str] = Query(None, description="Filter by supplier_id (UUID)"),
    supplier_name: Optional[str] = Query(None, description="Case-insensitive partial match"),
    contract_status: Optional[str] = Query(None, description="e.g., Active Contract / No Contract"),
    preferred_for_component_flag: Optional[int] = Query(None, description="0 or 1"),
    limit: int = Query(200, ge=1, le=2000),
    offset: int = Query(0, ge=0),
):
    try:
        cid = _parse_uuid(child_identifier, "child_identifier")
        sid = _parse_uuid(supplier_id, "supplier_id")

        clauses = []
        params: Dict[str, Any] = {"limit": limit, "offset": offset}

        if cid:
            clauses.append("child_identifier = :child_identifier")
            params["child_identifier"] = cid

        if component_name:
            clauses.append("component_name ILIKE :component_name")
            params["component_name"] = f"%{component_name}%"

        if component_category:
            clauses.append("component_category = :component_category")
            params["component_category"] = component_category

        if sid:
            clauses.append("supplier_id = :supplier_id")
            params["supplier_id"] = sid

        if supplier_name:
            clauses.append("supplier_name ILIKE :supplier_name")
            params["supplier_name"] = f"%{supplier_name}%"

        if contract_status:
            clauses.append("contract_status = :contract_status")
            params["contract_status"] = contract_status

        if preferred_for_component_flag is not None:
            clauses.append("preferred_for_component_flag = :preferred_for_component_flag")
            params["preferred_for_component_flag"] = preferred_for_component_flag

        where_sql = _build_where(clauses)

        count_sql = text(f"SELECT COUNT(*) AS c FROM supplier_contracts{where_sql}")
        data_sql = text(f"""
            SELECT *
            FROM supplier_contracts
            {where_sql}
            ORDER BY component_name, supplier_name
            LIMIT :limit OFFSET :offset
        """)

        with Session(engine) as session:
            total = session.execute(count_sql, params).scalar_one()
            rows = session.execute(data_sql, params)
            data = _rows_to_dicts(rows)

        return {"success": True, "count": int(total), "data": data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/components/{child_identifier}/suppliers", response_model=APIResponse)
async def get_component_suppliers(
    child_identifier: str,
    only_active_contracts: bool = Query(False, description="If true, return only rows with contract_status = 'Active Contract'")
):
    """
    Join supplier_contracts + supplier_master to return enriched supplier info for a component.
    """
    try:
        cid = _parse_uuid(child_identifier, "child_identifier")
        params: Dict[str, Any] = {"child_identifier": cid}

        extra_where = ""
        if only_active_contracts:
            extra_where = " AND sc.contract_status = 'Active Contract'"

        q = text(f"""
            SELECT
              sc.component_name,
              sc.child_identifier,
              sc.component_category,

              sc.supplier_id,
              COALESCE(sm.supplier_name, sc.supplier_name) AS supplier_name,
              COALESCE(sm.supplier_type, sc.supplier_type) AS supplier_type,

              sm.hq_country,
              sm.hq_region,
              sm.primary_contact_name,
              sm.primary_contact_email,
              sm.primary_contact_phone,

              sc.ship_from_country,
              sc.incoterms,
              sc.currency,
              sc.lead_time_days,
              sc.moq,
              sc.unit_cost_estimate,
              sc.payment_terms,
              sc.contract_status,
              sc.contract_id,
              sc.contract_start_date,
              sc.contract_end_date,
              sc.price_agreement_type,
              sc.otd_percent,
              sc.quality_rating,
              sc.risk_rating,
              sc.preferred_for_component_flag,
              sc.last_audit_date,
              sc.notes
            FROM supplier_contracts sc
            LEFT JOIN supplier_master sm
              ON sm.supplier_id = sc.supplier_id
            WHERE sc.child_identifier = :child_identifier
            {extra_where}
            ORDER BY sc.preferred_for_component_flag DESC, sc.contract_status, sc.unit_cost_estimate NULLS LAST
        """)

        with Session(engine) as session:
            rows = session.execute(q, params)
            data = _rows_to_dicts(rows)

        if not data:
            raise HTTPException(status_code=404, detail="No supplier records found for this component")

        return {"success": True, "count": len(data), "data": data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/suppliers/{supplier_id}/components", response_model=APIResponse)
async def get_supplier_components(
    supplier_id: str,
    contract_status: Optional[str] = Query(None, description="Optional: filter by contract status")
):
    """
    Return all components supplied by a given supplier_id.
    """
    try:
        sid = _parse_uuid(supplier_id, "supplier_id")
        params: Dict[str, Any] = {"supplier_id": sid}

        extra_where = ""
        if contract_status:
            extra_where = " AND contract_status = :contract_status"
            params["contract_status"] = contract_status

        q = text(f"""
            SELECT
              component_name, child_identifier, component_category,
              supplier_id, supplier_name, supplier_type,
              ship_from_country, incoterms, currency,
              lead_time_days, moq, unit_cost_estimate, payment_terms,
              contract_status, contract_id, contract_start_date, contract_end_date,
              price_agreement_type, otd_percent, quality_rating, risk_rating,
              preferred_for_component_flag, last_audit_date, notes
            FROM supplier_contracts
            WHERE supplier_id = :supplier_id
            {extra_where}
            ORDER BY component_name
        """)

        with Session(engine) as session:
            rows = session.execute(q, params)
            data = _rows_to_dicts(rows)

        if not data:
            raise HTTPException(status_code=404, detail="No component records found for this supplier")

        return {"success": True, "count": len(data), "data": data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("SupplierConnectionAPI:app", host="0.0.0.0", port=8003, reload=True)
