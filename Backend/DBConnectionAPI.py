from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import pandas as pd
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from datetime import datetime
from database import engine
import uuid
import traceback
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="Item Retrieval API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080", "http://52.202.64.132"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Response models
class APIResponse(BaseModel):
    success: bool
    count: Optional[int] = None
    data: Optional[List[dict]] = None
    error: Optional[str] = None


@app.get("/api/discussions", response_model=APIResponse)
async def get_discussions(
    since: Optional[str] = Query(None, description="Get records after this timestamp (ISO format)")
):
    """Retrieve discussion summaries since a given time"""
    try:
        query = "SELECT * FROM discussion_summary"
        
        if since:
            query += f" WHERE created_at > '{since}'"
        
        query += " ORDER BY created_at DESC"
        
        df = pd.read_sql(query, engine)
        discussions = df.to_dict(orient='records')
        
        return {
            "success": True,
            "count": len(discussions),
            "data": discussions
        }
    except Exception as e:
        error_detail = str(e)
        logger.error(f"Error in get_discussion_summary: {error_detail}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/api/machine-details", response_model=APIResponse)
async def get_machine_details(
    item_id: Optional[str] = Query(None, description="Specific item ID to retrieve"),
    parent_id: Optional[str] = Query(None, description="Get all children of this parent"),
    limit: Optional[int] = Query(None, description="Limit number of results")
):
    """Retrieve items from machine_details table"""
    try:
        query = "SELECT * FROM machine_details"
        conditions = []
        
        if item_id:
            conditions.append(f"item = '{item_id}'")
        
        if parent_id:
            # Get all items that start with parent_id pattern
            conditions.append(f"item LIKE '{parent_id}.%'")
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY item"
        
        if limit:
            query += f" LIMIT {limit}"
        
        df = pd.read_sql(query, engine)
        items = df.to_dict(orient='records')
        
        return {
            "success": True,
            "count": len(items),
            "data": items
        }
    except Exception as e:
        error_detail = str(e)
        logger.error(f"Error in get_discussion_summary: {error_detail}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/api/machine-details/{item_id}/parents", response_model=APIResponse)
async def get_item_parents(item_id: str):
    """Retrieve all parent items for a given item ID"""
    try:
        # Generate parent IDs from the item structure
        parts = item_id.split('.')
        parent_ids = []
        
        for i in range(1, len(parts)):
            parent_ids.append('.'.join(parts[:i]))
        
        if not parent_ids:
            return {
                "success": True,
                "count": 0,
                "data": []
            }
        
        # Create placeholders for the query
        placeholders = ','.join([f"'{pid}'" for pid in parent_ids])
        query = f"SELECT * FROM machine_details WHERE item IN ({placeholders}) ORDER BY item"
        
        df = pd.read_sql(query, engine)
        parents = df.to_dict(orient='records')
        
        return {
            "success": True,
            "count": len(parents),
            "data": parents
        }
    except Exception as e:
        error_detail = str(e)
        logger.error(f"Error in get_discussion_summary: {error_detail}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/api/machine-details/{item_id}/children", response_model=APIResponse)
async def get_item_children(
    item_id: str,
    direct_only: bool = Query(False, description="Only return direct children")
):
    """Retrieve all child items for a given item ID"""
    try:
        if direct_only:
            # Only direct children (one level down)
            query = f"SELECT * FROM machine_details WHERE item LIKE '{item_id}.%' AND item NOT LIKE '{item_id}.%.%'"
        else:
            # All descendants
            query = f"SELECT * FROM machine_details WHERE item LIKE '{item_id}.%'"
        
        query += " ORDER BY item"
        
        df = pd.read_sql(query, engine)
        children = df.to_dict(orient='records')
        
        return {
            "success": True,
            "count": len(children),
            "data": children
        }
    except Exception as e:
        error_detail = str(e)
        logger.error(f"Error in get_discussion_summary: {error_detail}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/api/discussions/{item_id:path}", response_model=APIResponse)
async def get_discussion_summary(
    item_id: str,
    limit: Optional[int] = Query(None, description="Limit number of results")
):
    """Retrieve items from discussion_summary table"""
    try:
        if item_id:
            # Use parameterized query to prevent SQL injection
            if limit:
                # LIMIT must be in the SQL string (safe since limit is validated as int by FastAPI)
                query_str = f"SELECT * FROM discussion_summary WHERE item_id = :item_id ORDER BY created_at DESC LIMIT {limit}"
                query = text(query_str)
                df = pd.read_sql(query, engine, params={"item_id": item_id})
            else:
                query = text("SELECT * FROM discussion_summary WHERE item_id = :item_id ORDER BY created_at DESC")
                df = pd.read_sql(query, engine, params={"item_id": item_id})
        else:
            query = "SELECT * FROM discussion_summary ORDER BY created_at DESC"
            if limit:
                query += f" LIMIT {limit}"
            df = pd.read_sql(query, engine)
            
        summaries = df.to_dict(orient='records')
        
        return {
            "success": True,
            "count": len(summaries),
            "data": summaries
        }
    except Exception as e:
        error_detail = str(e)
        logger.error(f"Error in get_discussion_summary: {error_detail}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)
    

@app.get("/api/machine-details/{item_id}/impact", response_model=APIResponse)
async def get_item_impact(
    item_id: str,
    include_self: bool = Query(True),
    exclude_current_usage: bool = Query(True),
):
    try:
        # 0) Fetch the component row
        df_item = pd.read_sql(
            text("SELECT item, name, child_identifier FROM machine_details WHERE item = :item_id LIMIT 1"),
            engine,
            params={"item_id": item_id},
        )

        if df_item.empty:
            raise HTTPException(status_code=404, detail=f"Item not found: {item_id}")

        item_row = df_item.iloc[0].to_dict()
        child_id = item_row.get("child_identifier")

        # Normalize UUID (only if your column type is uuid)
        child_uuid = None
        if child_id is not None and str(child_id).strip() != "":
            child_uuid = uuid.UUID(str(child_id))

        # 1) Directly affected: parents (and optionally self)
        parts = item_id.split(".")
        parent_ids = [".".join(parts[:i]) for i in range(1, len(parts))]
        affected_ids = ([item_id] if include_self else []) + parent_ids

        directly_affected = []
        if affected_ids:
            df_affected = pd.read_sql(
                text("SELECT * FROM machine_details WHERE item = ANY(:affected_ids) ORDER BY item"),
                engine,
                params={"affected_ids": affected_ids},
            )
            directly_affected = df_affected.to_dict(orient="records")

        # 2) Other usages: same child_identifier
        other_usages = []
        if child_uuid:
            df_usage = pd.read_sql(
                text("SELECT * FROM machine_details WHERE child_identifier = :child_id ORDER BY item"),
                engine,
                params={"child_id": child_uuid},
            )

            if exclude_current_usage and "item" in df_usage.columns:
                df_usage = df_usage[df_usage["item"] != item_id]

            other_usages = df_usage.to_dict(orient="records")

        payload = {
            "item_id": item_id,
            "component": item_row,
            "directly_affected_components": directly_affected,
            "base_child_identifier": None if child_uuid is None else str(child_uuid),
            "other_usages_of_base_component": other_usages,
            "counts": {
                "directly_affected": len(directly_affected),
                "other_usages": len(other_usages),
            },
        }

        return {"success": True, "count": 1, "data": [payload]}

    except HTTPException:
        raise
    except Exception as e:
        error_detail = str(e)
        logger.error(f"Error in get_discussion_summary: {error_detail}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)



@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("DBConnectionAPI:app", host="0.0.0.0", port=8001)