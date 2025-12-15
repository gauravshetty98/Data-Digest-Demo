from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
import pandas as pd
from sqlalchemy import create_engine,text
from fastapi import HTTPException
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError

from database import engine
from SlackChannelReader import SlackChannelReader
from ComponentMatcher import ComponentMatcher
from OpenRouterClient import OpenRouterClient
from PromptDigest import get_manufacturing_digest_prompt, parse_llm_output, get_supplier_digest_prompt

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Slack Manufacturing Digest API",
    description="API for extracting and summarizing Slack manufacturing discussions",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Response model
class DigestResponse(BaseModel):
    success: bool
    message: str
    message_count: Optional[int] = None
    component_count: Optional[int] = None
    discussions: Optional[list] = None
    error: Optional[str] = None

class DiscussionSummaryUpdateRequest(BaseModel):
    discussion_id: str  # Will be converted to int for database query
    item_id: str
    summary: str
    latest_update: str
    created_at: Optional[datetime] = None
    supplier_id: Optional[str] = None
    
    class Config:
        # Allow string numbers to be converted
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


@app.get("/")
def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Slack Digest API is running"}


@app.get("/api/digest", response_model=DigestResponse)
async def get_digest(
    channel_id: Optional[str] = Query(None, description="Slack Channel ID"),
    slack_token: Optional[str] = Query(None, description="Slack Bot Token"),
    lookback_minutes: Optional[int] = Query(500, description="How many minutes to look back", ge=1, le=1440),
    csv_path: Optional[str] = Query(None, description="Path to BOM CSV file"),
    supplier_search: bool = Query(False, description="If true, also search supplier_name and primary_contact_name")
):
    """
    Extract Slack messages, match components, and generate a digest.
    
    Parameters fall back to .env if not provided.
    """
    
    try:
        # Use provided params or fall back to .env
        token = slack_token or os.getenv("SLACK_TOKEN")
        channel = channel_id or os.getenv("CHANNEL_ID")
        bom_path = csv_path or None
        or_api_key = os.getenv("OPEN_ROUTER_API_KEY")
        
        # Validate required credentials
        if not token:
            return DigestResponse(
                success=False,
                message="Slack token not provided",
                error="SLACK_TOKEN not found in request or .env file"
            )
        
        if not channel:
            return DigestResponse(
                success=False,
                message="Channel ID not provided",
                error="CHANNEL_ID not found in request or .env file"
            )
        
        
        if not or_api_key:
            return DigestResponse(
                success=False,
                message="OpenRouter API key not found",
                error="OPEN_ROUTER_API_KEY not found in .env file"
            )
        
        # Extract messages from Slack
        slack_reader = SlackChannelReader(token=token, default_channel_id=channel)
        try:
            messages = slack_reader.extract_messages(lookback_minutes=lookback_minutes, print_output=False)
        except ValueError as e:
            # This is a Slack API error that was converted to ValueError
            return DigestResponse(
                success=False,
                message="Error fetching messages from Slack",
                error=str(e)
            )
        except Exception as e:
            return DigestResponse(
                success=False,
                message="Error fetching messages from Slack",
                error=f"Unexpected error: {str(e)}"
            )
        
        if not messages:
            return DigestResponse(
                success=False,
                message="No messages found",
                error=f"No messages found in channel {channel} from the last {lookback_minutes} minutes. This could mean: 1) There are no messages in this time window, 2) All messages were filtered out (system messages), or 3) The channel exists but is empty in this time range."
            )
        print("step 1")
        message_texts = [msg["text"] for msg in messages if msg["text"]]
        matcher = ComponentMatcher(engine=engine)
        # Find Matching Components
        # find_components always returns a tuple (comp_df, supp_df), even when supplier_details=False
        if supplier_search == True:
            comp_df, supp_df =  matcher.find_components(message_texts, supplier_details=True)
        else:
            comp_df, supp_df =  matcher.find_components(message_texts, supplier_details=False)
        results_df = matcher.build_child_parent_df(comp_df, engine)
        print("step 2")
        if results_df.empty and (supp_df.empty if supplier_search else True):
            return DigestResponse(
                success=True,
                message="No components found in messages",
                message_count=len(messages),
                component_count=0,
                discussions=[]
            )
        
        #results_df.to_csv("matched_components.csv", index=False)
        # if supplier_search and not supp_df.empty:
        #     supp_df.to_csv("matched_suppliers.csv", index=False)
        
        #Generate discussion digest using LLM
        if supplier_search == False:
            prompt = get_manufacturing_digest_prompt(messages, results_df.to_markdown(index=False))
            orclient = OpenRouterClient(or_api_key)
            response = orclient.send_message(message = prompt)
            llm_output = orclient.get_response_text(response)
            parsed_data = parse_llm_output(llm_output)
        else:
            prompt = get_supplier_digest_prompt(messages, component_details = results_df.to_markdown(index=False), supplier_details=supp_df.to_markdown(index=False))
            orclient = OpenRouterClient(or_api_key)
            response = orclient.send_message(message = prompt)
            llm_output = orclient.get_response_text(response)
            parsed_data = parse_llm_output(llm_output)
        discussions_df = pd.DataFrame(parsed_data)
        discussions_df['created_at'] = datetime.now()
        
        print("step 3")
        try:
            discussions_df.to_sql(
                                    name='discussion_summary',
                                    con=engine,
                                    if_exists='append',
                                    index=False)
        except:
            print("DB operation failed")
        
        #discussions_df.to_csv('discussions.csv', index=False)

        print("done processing")
        
        # Convert to list of dicts for JSON response
        #discussions_list = discussions_df.to_dict('records')
        
        discussions_list = []
        return DigestResponse(
            success=True,
            message="Digest generated successfully",
            message_count=len(messages),
            component_count=len(results_df),
            discussions=discussions_list
        )
        
    except FileNotFoundError as e:
        return DigestResponse(
            success=False,
            message="File not found",
            error=f"Could not find required file: {str(e)}"
        )
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return DigestResponse(
            success=False,
            message="An error occurred",
            error=str(e)
        )

@app.put("/api/discussion-summary")
async def update_discussion_summary(payload: DiscussionSummaryUpdateRequest):
    """
    Update a row in discussion_summary based on discussion_id.
    """
    try:
        created_at = payload.created_at or datetime.utcnow()
        
        stmt = text("""
            UPDATE discussion_summary
            SET item_id = :item_id,
                summary = :summary,
                latest_update = :latest_update,
                created_at = :created_at,
                supplier_id = :supplier_id
            WHERE id = :id
        """)

        # Convert discussion_id to int if it's a string representation of a number
        try:
            discussion_id_int = int(payload.discussion_id)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid discussion_id: {payload.discussion_id}. Must be a valid integer."
            )
        
        params = {
            "id": discussion_id_int,
            "item_id": payload.item_id,
            "summary": payload.summary,
            "latest_update": payload.latest_update,
            "created_at": created_at,
            "supplier_id": payload.supplier_id,
        }

        with engine.begin() as conn:
            result = conn.execute(stmt, params)
            if result.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail=f"No discussion_summary row found for discussion_id={payload.discussion_id}",
                )

            # Optional: return updated row for UI convenience
            row = conn.execute(
                text("SELECT * FROM discussion_summary WHERE id = :id"),
                {"id": discussion_id_int},
            ).mappings().first()

        return {"success": True, "updated_rows": result.rowcount, "discussion": dict(row) if row else None}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/discussion-summary/{discussion_id}")
def delete_discussion_summary(discussion_id: str):
    """
    Delete a row from discussion_summary by discussion_id (id).
    """
    stmt = text("""
        DELETE FROM discussion_summary
        WHERE id = :discussion_id
    """)

    try:
        with engine.begin() as conn:
            result = conn.execute(stmt, {"discussion_id": discussion_id})

            if result.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail=f"No discussion_summary row found for discussion_id={discussion_id}"
                )

        return {"success": True, "deleted_rows": result.rowcount}

    except SQLAlchemyError as e:
        # common cause: foreign key constraint prevents delete
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/health")
def health_check():
    """Check if all required environment variables are set"""
    env_status = {
        "SLACK_TOKEN": bool(os.getenv("SLACK_TOKEN")),
        "CHANNEL_ID": bool(os.getenv("CHANNEL_ID")),
        "BOM_V16_CSV_PATH": bool(os.getenv("BOM_V16_CSV_PATH")),
        "OPEN_ROUTER_API_KEY": bool(os.getenv("OPEN_ROUTER_API_KEY"))
    }
    
    all_set = all(env_status.values())
    
    return {
        "status": "healthy" if all_set else "missing_config",
        "environment_variables": env_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("DiscussionDigestAPI:app", host="0.0.0.0", port=8000, reload=True)