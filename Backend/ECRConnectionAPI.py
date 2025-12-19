from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import engine
from PromptDigest import get_ecr_editing_prompt
from OpenRouterClient import OpenRouterClient
import os
import uuid
from dotenv import load_dotenv
from docxtpl import DocxTemplate
import json
from datetime import datetime
from sqlalchemy import text
from pathlib import Path


# Load environment variables
load_dotenv()
BASE_DIR = Path(__file__).resolve().parent          # Backend/
DOC_DIR  = BASE_DIR / "ECR_document_store"          # Backend/ECR_document_store
#TEMP_DIR = BASE_DIR / "ECR_JSON_TEMPLATE"
DOC_DIR.mkdir(parents=True, exist_ok=True)


app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Response model
class ECRCreationResponse(BaseModel):
    success: bool
    document_id: Optional[str] = None
    document_path: Optional[str] = None
    llm_output: Optional[str] = None
    error: Optional[str] = None

# Request model
class ECRCreationRequest(BaseModel):
    discussion_ids: List[int]
    additional_details: str

@app.post("/api/create-ecr", response_model=ECRCreationResponse)
async def create_ecr(request: ECRCreationRequest):
    """
    Create ECR from discussion summaries and generate Word document
    """
    try:
        
        with Session(engine) as session:
            
            
            # Get discussion summaries, latest updates, and component_ids
            discussion_data = []
            component_ids = set()
            
            for discussion_id in request.discussion_ids:
                query = text("""
                    SELECT summary, latest_update, item_id 
                    FROM discussion_summary 
                    WHERE id = :discussion_id
                """)
                result = session.execute(query, {"discussion_id": discussion_id}).fetchone()
                
                if result:
                    discussion_data.append({
                        "discussion_summary": result[0],
                        "latest_update": result[1],
                        "component_id": result[2]
                    })
                    component_ids.add(result[2])
            
            if not discussion_data:
                raise HTTPException(status_code=404, detail="No discussions found for provided IDs")
            
            # Combine all discussion summaries and latest updates
            combined_discussion_summaries = "\\n\\n".join([d["discussion_summary"] for d in discussion_data])
            combined_latest_updates = "\\n\\n".join([d["latest_update"] for d in discussion_data])
            
            # Assuming all discussions are for the same component (take first component_id)
            component_id = list(component_ids)[0]
            
            # Fetch component details from machine_details table
            component_query = text("""
                SELECT product, version, name, internal_part_name, 
                       quantity, material, category, mass, length, 
                       tessellation_quality, finish, notes
                FROM machine_details
                WHERE item = :component_id
            """)
            component_result = session.execute(component_query, {"component_id": component_id}).fetchone()
            
            if not component_result:
                raise HTTPException(status_code=404, detail=f"Component details not found for component_id: {component_id}")
            
            # Extract component details
            product = component_result[0] or ""
            version = component_result[1] or ""
            component_name = component_result[2] or ""
            internal_part_name = component_result[3] or ""
            quantity = component_result[4] or ""
            material = component_result[5] or ""
            category = component_result[6] or ""
            mass = component_result[7] or ""
            length = component_result[8] or ""
            tessellation_quality = component_result[9] or ""
            finish = component_result[10] or ""
            notes = component_result[11] or ""
        
        
        system_prompt, user_prompt = get_ecr_editing_prompt(
            discussion_summaries=combined_discussion_summaries,
            latest_updates=combined_latest_updates,
            component_id=str(component_id),
            additional_details=request.additional_details,
            product=product,
            version=version,
            component_name=component_name,
            internal_part_name=internal_part_name,
            quantity=quantity,
            material=material,
            category=category,
            mass=mass,
            length=length,
            tessellation_quality=tessellation_quality,
            finish=finish,
            notes=notes
        )
        
        print("fetched details - starting ECR creation")
        # Load OpenRouter API key
        or_api_key = os.getenv("OPEN_ROUTER_API_KEY")
        if not or_api_key:
            raise HTTPException(status_code=500, detail="OPEN_ROUTER_API_KEY not found in environment variables")
        
        # Create OpenRouter client and send message
        orclient = OpenRouterClient(or_api_key)
        response = orclient.send_message(message=user_prompt, system_prompt=system_prompt)
        llm_output = orclient.get_response_text(response)
        
        print("fetched response from llm - parsing and storing")

        try:
            # Clean the response in case there's markdown formatting
            llm_output_clean = llm_output.strip()
            if llm_output_clean.startswith("```json"):
                llm_output_clean = llm_output_clean.split("```json")[1]
            if llm_output_clean.endswith("```"):
                llm_output_clean = llm_output_clean.rsplit("```", 1)[0]
            
            ecr_data = json.loads(llm_output_clean.strip())
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse LLM response as JSON: {str(e)}")

        ecr_title = ecr_data.get('proposed_change', {}).get('detailed_description', '')    
        print(ecr_title)
        
        document_id = str(uuid.uuid4())
        document_filename = f"ecr_{document_id}.docx"

        document_path = DOC_DIR / f"ecr_{document_id}.docx"
        document_path = str(document_path)
        
        
        #Mapping and creating document
        template_path = BASE_DIR / "ECR_JSON_TEMPLATE" / "Docxtl_ECR_Template.docx"
        template_path = str(template_path)
        doc = DocxTemplate(template_path)
        doc.render(ecr_data)

        os.makedirs(os.path.dirname(document_path), exist_ok=True)
        doc.save(document_path)

        with Session(engine) as db_session:
            insert_query = text("""
                INSERT INTO ecr_database (component_id, created_at, document_id, ecr_title)
                VALUES (:component_id, :created_at, :document_id, :ecr_title)
            """)
            db_session.execute(insert_query, {
                "component_id": component_id,
                "created_at": datetime.now(),
                "document_id": document_filename,
                "ecr_title": ecr_title
            })
            db_session.commit()
        
        print("done!")

        # Return success response with document info
        return ECRCreationResponse(
            success=True,
            document_id=document_id,
            llm_output=llm_output
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        return ECRCreationResponse(
            success=False,
            error=str(e)
        )

@app.get("/api/ecr/all")
async def get_all_ecrs():
    """
    Get all ECR records from the database
    """
    try:
        with Session(engine) as session:
            query = text("""
                SELECT component_id, created_at, document_id, ecr_title 
                FROM ecr_database 
                ORDER BY created_at DESC
            """)
            results = session.execute(query).fetchall()
            print(results)
            ecr_list = []
            for row in results:
                ecr_list.append({
                    "component_id": row[0],
                    "created_at": row[1].isoformat() if row[1] else None,
                    "document_id": row[2],
                    "ecr_title": row[3]
                })
            
            return {"success": True, "ecrs": ecr_list}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve ECRs: {str(e)}")

@app.get("/api/ecr/{document_id}")
async def get_ecr_document(document_id: str):
    """
    Get ECR document by document ID
    Returns the file for download
    """
    try:
        document_path = DOC_DIR / f"ecr_{document_id}.docx"
        document_path = str(document_path)
        
        if not os.path.exists(document_path):
            raise HTTPException(status_code=404, detail="ECR document not found")
        
        return FileResponse(
            path=document_path,
            filename=f"ecr_{document_id}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve ECR: {str(e)}")
    

@app.get("/")
def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "ECR Creation API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ECRConnectionAPI:app", host="0.0.0.0", port=8002, reload=True)
